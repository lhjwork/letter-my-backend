# MVC 패턴 실전 예시: 카카오 OAuth 로그인

이 문서는 사용자가 카카오로 로그인할 때 백엔드에서 일어나는 모든 과정을 순차적으로 설명합니다.

---

## 🎯 전체 흐름 개요

```
1. 사용자가 프론트엔드에서 "카카오로 로그인" 버튼 클릭
2. NextAuth.js가 카카오 OAuth 인증 처리
3. 카카오에서 사용자 정보를 받아옴
4. 프론트엔드가 백엔드 API에 POST 요청
   ↓
5. [ROUTE] 요청을 받아서 적절한 Controller로 연결
6. [MIDDLEWARE] 요청 데이터 검증
7. [CONTROLLER] 요청 처리 및 Service 호출
8. [SERVICE] 비즈니스 로직 실행 및 Model 조작
9. [MODEL] 데이터베이스 작업
10. [SERVICE] 결과를 Controller로 반환
11. [CONTROLLER] JWT 토큰 생성 후 응답
    ↓
12. 프론트엔드가 토큰을 받아서 저장
13. 이후 요청마다 토큰을 헤더에 포함
```

---

## 📍 STEP 1: 프론트엔드에서 요청 보내기

**위치**: Next.js Frontend (참고용)

```typescript
// app/api/auth/[...nextauth]/route.ts
async signIn({ user, account, profile }) {
  // 카카오에서 받은 정보로 백엔드 API 호출
  const response = await fetch('http://localhost:5000/api/users/oauth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'kakao',
      providerId: '123456789',
      email: 'user@kakao.com',
      name: '홍길동',
      image: 'https://kakao.com/profile.jpg',
      accessToken: 'kakao_access_token_here',
      refreshToken: 'kakao_refresh_token_here',
      profile: {
        // 카카오에서 받은 전체 프로필 정보
      }
    }),
  });

  const data = await response.json();
  user.backendToken = data.data.token; // JWT 토큰 저장
  return true;
}
```

**실제 HTTP 요청**:

```http
POST http://localhost:5000/api/users/oauth/login
Content-Type: application/json

{
  "provider": "kakao",
  "providerId": "123456789",
  "email": "user@kakao.com",
  "name": "홍길동",
  "image": "https://kakao.com/profile.jpg",
  "accessToken": "kakao_access_token_here",
  "refreshToken": "kakao_refresh_token_here"
}
```

---

## 📍 STEP 2: Express 서버가 요청 받기

**위치**: `src/app.ts`

```typescript
import express, { Application } from "express";
import routes from "./routes";

const app: Application = express();

// JSON 파싱 미들웨어
app.use(express.json());

// 모든 /api 요청을 routes로 전달
app.use("/api", routes);
//          ↓
//    /api/users/oauth/login 요청이 들어옴
```

---

## 📍 STEP 3: 메인 라우터가 요청 분배

**위치**: `src/routes/index.ts`

```typescript
import { Router } from "express";
import userRoutes from "./users";

const router: Router = Router();

// /api/users/* 경로를 userRoutes로 전달
router.use("/users", userRoutes);
//           ↓
//    /oauth/login 부분이 userRoutes로 넘어감
```

**현재 경로**: `/api/users/oauth/login`
**남은 경로**: `/oauth/login`

---

## 📍 STEP 4: USER 라우터가 요청 매칭 (ROUTE Layer)

**위치**: `src/routes/users.ts`

```typescript
import { Router } from "express";
import userController from "../controllers/userController";
import { oauthLoginValidation } from "../middleware/validation";

const router = Router();

// POST /oauth/login 요청과 매칭!
router.post(
  "/oauth/login",
  oauthLoginValidation, // ← STEP 5: 먼저 검증 미들웨어 실행
  userController.oauthLogin // ← STEP 7: 그 다음 컨트롤러 실행
);
```

**역할**:

- URL 경로와 HTTP 메서드를 매칭
- 실행 순서 정의 (미들웨어 → 컨트롤러)

---

## 📍 STEP 5: 요청 데이터 검증 (MIDDLEWARE Layer)

**위치**: `src/middleware/validation.ts`

```typescript
import { body, validationResult } from "express-validator";

// 검증 규칙 정의
export const oauthLoginValidation = [
  body("provider").isIn(["instagram", "naver", "kakao"]).withMessage("Provider must be instagram, naver, or kakao"),
  body("providerId").notEmpty().withMessage("Provider ID is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("image").optional().isURL(),
  body("accessToken").optional().isString(),
  validate, // ← 검증 실행
];

// 검증 결과 확인
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // ❌ 검증 실패 시 여기서 응답 보내고 종료
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
    return;
  }

  // ✅ 검증 통과 시 다음 단계로
  next(); // → STEP 7로 이동
};
```

**실제 검증 과정**:

```javascript
// 들어온 데이터:
{
  "provider": "kakao",        // ✅ "kakao"는 허용된 값
  "providerId": "123456789",  // ✅ 비어있지 않음
  "email": "user@kakao.com",  // ✅ 이메일 형식 맞음
  "name": "홍길동",           // ✅ 비어있지 않음
  "image": "https://...",     // ✅ URL 형식 맞음
}
// → 모두 통과! next() 호출
```

---

## 📍 STEP 6: 미들웨어 체인에서 다음으로 이동

검증이 통과되면 `next()`가 호출되어 다음 핸들러인 `userController.oauthLogin`이 실행됩니다.

---

## 📍 STEP 7: 컨트롤러가 요청 처리 (CONTROLLER Layer)

**위치**: `src/controllers/userController.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import userService from "../services/userService";
import { OAuthProvider } from "../models/User";

export class UserController {
  async oauthLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log("1️⃣ 컨트롤러: 요청 데이터 받음");

      // req.body에서 데이터 추출
      const {
        provider, // "kakao"
        providerId, // "123456789"
        email, // "user@kakao.com"
        name, // "홍길동"
        image, // "https://..."
        accessToken,
        refreshToken,
        profile,
      } = req.body;

      console.log("2️⃣ 컨트롤러: Provider 유효성 재확인");

      // Provider 값이 enum에 있는지 확인
      if (!Object.values(OAuthProvider).includes(provider)) {
        res.status(400).json({
          message: "Invalid OAuth provider",
        });
        return;
      }

      console.log("3️⃣ 컨트롤러: Service 레이어 호출");

      // 📞 SERVICE 레이어의 findOrCreateOAuthUser 메서드 호출
      const user = await userService.findOrCreateOAuthUser({
        provider,
        providerId,
        email,
        name,
        image,
        accessToken,
        refreshToken,
        profile,
      });
      // ← STEP 8~10에서 돌아옴

      console.log("4️⃣ 컨트롤러: 사용자 정보 받음, JWT 생성 요청");

      // 📞 SERVICE 레이어의 generateToken 메서드 호출
      const token = userService.generateToken(user);

      console.log("5️⃣ 컨트롤러: 클라이언트에 응답 전송");

      // ✅ 성공 응답
      res.status(200).json({
        success: true,
        data: {
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            image: user.image,
            oauthAccounts: user.oauthAccounts,
          },
          token: token, // JWT 토큰
        },
        message: "OAuth login successful",
      });
    } catch (error) {
      console.log("❌ 컨트롤러: 에러 발생");
      next(error); // 에러 핸들링 미들웨어로 전달
    }
  }
}

export default new UserController();
```

**역할**:

- 요청 데이터를 받아서 추출
- 간단한 검증 수행
- Service 레이어 호출 (비즈니스 로직은 Service에 위임)
- 결과를 받아서 적절한 HTTP 응답 생성

---

## 📍 STEP 8: 서비스가 비즈니스 로직 실행 (SERVICE Layer)

**위치**: `src/services/userService.ts`

```typescript
import User, { IUser, OAuthProvider, IOAuthAccount } from "../models/User";

export class UserService {
  async findOrCreateOAuthUser(data: {
    provider: OAuthProvider;
    providerId: string;
    email: string;
    name: string;
    image?: string;
    accessToken?: string;
    refreshToken?: string;
    profile?: any;
  }): Promise<IUser> {
    console.log("🔍 서비스: 기존 사용자 검색 시작");

    // 📞 STEP 9-1: MODEL의 static 메서드 호출
    // 이 OAuth Provider로 이미 가입한 사용자가 있는지 확인
    let user = await User.findByOAuthProvider(data.provider, data.providerId);
    //                    ↓ MongoDB에서 조회

    if (user) {
      console.log("✅ 서비스: 기존 사용자 발견! OAuth 정보 업데이트");

      // 기존 사용자의 OAuth 토큰 정보 업데이트
      const oauthAccount: IOAuthAccount = {
        provider: data.provider,
        providerId: data.providerId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        profile: data.profile,
      };

      // 📞 STEP 9-2: MODEL의 인스턴스 메서드 호출
      await user.addOAuthAccount(oauthAccount);
      user.lastLoginAt = new Date();

      // 📞 STEP 9-3: MongoDB에 저장
      return user.save();
    }

    console.log("🔍 서비스: OAuth로는 못 찾음, 이메일로 검색");

    // 📞 STEP 9-4: 같은 이메일로 가입한 사용자 찾기
    user = await User.findByEmail(data.email);

    if (user) {
      console.log("✅ 서비스: 같은 이메일의 사용자 발견! OAuth 계정 연결");

      // 이 사용자는 다른 방법으로 가입했지만 같은 이메일
      // → 카카오 계정을 추가로 연결
      const oauthAccount: IOAuthAccount = {
        provider: data.provider,
        providerId: data.providerId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        profile: data.profile,
      };

      await user.addOAuthAccount(oauthAccount);
      user.lastLoginAt = new Date();
      return user.save();
    }

    console.log("➕ 서비스: 신규 사용자 생성");

    // 📞 STEP 9-5: 완전히 새로운 사용자 생성
    const newUser = new User({
      email: data.email,
      name: data.name,
      image: data.image,
      emailVerified: new Date(), // OAuth는 이메일 인증됨
      oauthAccounts: [
        {
          provider: data.provider,
          providerId: data.providerId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          profile: data.profile,
        },
      ],
      lastLoginAt: new Date(),
    });

    // 📞 STEP 9-6: MongoDB에 저장
    return newUser.save();
  }

  // JWT 토큰 생성
  generateToken(user: IUser): string {
    console.log("🔐 서비스: JWT 토큰 생성");

    const payload = {
      userId: user._id.toString(),
      email: user.email,
    };

    const secret = process.env.JWT_SECRET || "your-secret-key";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }
}

export default new UserService();
```

**역할**:

- 복잡한 비즈니스 로직 처리
- 여러 시나리오 처리 (기존 사용자 / 신규 사용자)
- Model 레이어를 호출하여 데이터베이스 작업
- 컨트롤러에게 순수한 결과만 반환

---

## 📍 STEP 9: 모델이 데이터베이스 작업 (MODEL Layer)

**위치**: `src/models/User.ts`

```typescript
import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

// 📝 1. 타입 정의
export enum OAuthProvider {
  INSTAGRAM = "instagram",
  NAVER = "naver",
  KAKAO = "kakao",
}

export interface IOAuthAccount {
  provider: OAuthProvider;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  profile?: any;
}

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  image?: string;
  emailVerified?: Date;
  oauthAccounts: IOAuthAccount[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;

  // 인스턴스 메서드
  addOAuthAccount(account: IOAuthAccount): Promise<IUser>;
  removeOAuthAccount(provider: OAuthProvider): Promise<IUser>;
}

interface IUserModel extends Model<IUser> {
  // Static 메서드
  findByEmail(email: string): Promise<IUser | null>;
  findByOAuthProvider(provider: OAuthProvider, providerId: string): Promise<IUser | null>;
}

// 📝 2. 스키마 정의
const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // ← 빠른 검색을 위한 인덱스
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    oauthAccounts: {
      type: [
        {
          provider: {
            type: String,
            enum: Object.values(OAuthProvider),
            required: true,
          },
          providerId: {
            type: String,
            required: true,
          },
          accessToken: String,
          refreshToken: String,
          profile: Schema.Types.Mixed,
        },
      ],
      default: [],
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 📝 3. 인덱스 설정 (빠른 검색을 위해)
UserSchema.index({ "oauthAccounts.provider": 1, "oauthAccounts.providerId": 1 });

// 📝 4. Static 메서드: OAuth Provider로 사용자 찾기
UserSchema.statics.findByOAuthProvider = function (provider: OAuthProvider, providerId: string): Promise<IUser | null> {
  console.log("🔍 모델(Static): OAuth Provider로 검색");
  console.log(`   Provider: ${provider}, ID: ${providerId}`);

  // MongoDB 쿼리 실행
  return this.findOne({
    "oauthAccounts.provider": provider,
    "oauthAccounts.providerId": providerId,
  });

  // 실제 MongoDB 쿼리:
  // db.users.findOne({
  //   "oauthAccounts.provider": "kakao",
  //   "oauthAccounts.providerId": "123456789"
  // })
};

// 📝 5. Static 메서드: 이메일로 사용자 찾기
UserSchema.statics.findByEmail = function (email: string): Promise<IUser | null> {
  console.log("🔍 모델(Static): 이메일로 검색");
  console.log(`   Email: ${email}`);

  return this.findOne({ email });

  // 실제 MongoDB 쿼리:
  // db.users.findOne({ email: "user@kakao.com" })
};

// 📝 6. 인스턴스 메서드: OAuth 계정 추가/업데이트
UserSchema.methods.addOAuthAccount = async function (account: IOAuthAccount): Promise<IUser> {
  console.log("➕ 모델(Instance): OAuth 계정 추가/업데이트");

  const user = this as IUser;

  // 이미 존재하는 provider는 업데이트
  const existingIndex = user.oauthAccounts.findIndex((acc) => acc.provider === account.provider);

  if (existingIndex !== -1) {
    console.log("   → 기존 계정 업데이트 (토큰 갱신)");
    user.oauthAccounts[existingIndex] = account;
  } else {
    console.log("   → 새로운 계정 추가");
    user.oauthAccounts.push(account);
  }

  return user.save();

  // 실제 MongoDB 쿼리:
  // db.users.updateOne(
  //   { _id: ObjectId("...") },
  //   { $set: { oauthAccounts: [...], updatedAt: new Date() } }
  // )
};

// 📝 7. 모델 생성 및 내보내기
const User = mongoose.model<IUser, IUserModel>("User", UserSchema);

export default User;
```

**실제 데이터베이스 상태**:

**시나리오 1: 신규 사용자**

```javascript
// MongoDB에 저장되는 Document
{
  "_id": ObjectId("675fa8b3c2d1e4f5a6b7c8d9"),
  "email": "user@kakao.com",
  "name": "홍길동",
  "image": "https://kakao.com/profile.jpg",
  "emailVerified": ISODate("2025-12-04T10:30:00Z"),
  "oauthAccounts": [
    {
      "provider": "kakao",
      "providerId": "123456789",
      "accessToken": "kakao_access_token_here",
      "refreshToken": "kakao_refresh_token_here",
      "profile": { /* 카카오 프로필 정보 */ }
    }
  ],
  "lastLoginAt": ISODate("2025-12-04T10:30:00Z"),
  "createdAt": ISODate("2025-12-04T10:30:00Z"),
  "updatedAt": ISODate("2025-12-04T10:30:00Z")
}
```

**시나리오 2: 기존 사용자가 네이버로 먼저 가입했다가 카카오도 연결**

```javascript
{
  "_id": ObjectId("675fa8b3c2d1e4f5a6b7c8d9"),
  "email": "user@kakao.com",
  "name": "홍길동",
  "oauthAccounts": [
    {
      "provider": "naver",           // 먼저 네이버로 가입
      "providerId": "naver_id_111",
      // ...
    },
    {
      "provider": "kakao",           // 나중에 카카오 연결
      "providerId": "123456789",
      // ...
    }
  ],
  "lastLoginAt": ISODate("2025-12-04T10:30:00Z"),
  "createdAt": ISODate("2025-12-03T08:20:00Z"),  // 어제 생성
  "updatedAt": ISODate("2025-12-04T10:30:00Z")   // 오늘 업데이트
}
```

**역할**:

- 데이터베이스 스키마 정의
- MongoDB와의 실제 통신
- 데이터 유효성 검증
- 비즈니스 로직 메서드 제공

---

## 📍 STEP 10: 서비스로 결과 반환

Model에서 작업이 완료되면 결과가 Service로 반환됩니다.

```typescript
// userService.ts에서
const newUser = await User.save();
return newUser; // ← 이 값이 컨트롤러로 반환됨
```

---

## 📍 STEP 11: 컨트롤러가 응답 생성

Service에서 받은 user 객체로 JWT 토큰을 생성하고 클라이언트에 응답합니다.

```typescript
// userController.ts에서
const user = await userService.findOrCreateOAuthUser({...}); // ← user 받음
const token = userService.generateToken(user); // ← JWT 생성

res.status(200).json({
  success: true,
  data: {
    user: user,
    token: token,
  },
  message: "OAuth login successful",
});
```

**실제 HTTP 응답**:

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "675fa8b3c2d1e4f5a6b7c8d9",
      "email": "user@kakao.com",
      "name": "홍길동",
      "image": "https://kakao.com/profile.jpg",
      "oauthAccounts": [
        {
          "provider": "kakao",
          "providerId": "123456789"
        }
      ],
      "createdAt": "2025-12-04T10:30:00.000Z",
      "updatedAt": "2025-12-04T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzVmYThiM2MyZDFlNGY1YTZiN2M4ZDkiLCJlbWFpbCI6InVzZXJAa2FrYW8uY29tIiwiaWF0IjoxNzMzMzE0MjAwLCJleHAiOjE3MzM5MTkwMDB9.xyz..."
  },
  "message": "OAuth login successful"
}
```

---

## 📍 STEP 12: 프론트엔드가 토큰 저장

```typescript
// NextAuth.js에서
const data = await response.json();
user.backendToken = data.data.token; // JWT 토큰 저장

// 이후 session에 포함되어 클라이언트에서 사용 가능
const session = await getSession();
console.log(session.backendToken); // "eyJhbGciOi..."
```

---

## 📍 BONUS: 저장된 토큰으로 인증된 요청하기

이제 사용자가 자신의 프로필을 조회하려고 합니다.

```http
GET http://localhost:5000/api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 흐름:

**1. Route에서 인증 미들웨어 실행**

```typescript
// src/routes/users.ts
router.get("/me", authenticate, userController.getMe);
//                ^^^^^^^^^^^^  ← 먼저 이게 실행됨
```

**2. 인증 미들웨어가 토큰 검증**

```typescript
// src/middleware/auth.ts
export const authenticate = async (req, res, next) => {
  // Authorization 헤더에서 토큰 추출
  const authHeader = req.headers.authorization;
  const token = authHeader.substring(7); // "Bearer " 제거

  // 토큰 검증
  const decoded = userService.verifyToken(token);
  // → { userId: "675fa8b3...", email: "user@kakao.com" }

  // DB에서 사용자 확인
  const user = await userService.findById(decoded.userId);

  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }

  // req.user에 정보 저장
  req.user = {
    userId: decoded.userId,
    email: decoded.email,
  };

  next(); // ← 컨트롤러로 이동
};
```

**3. 컨트롤러가 사용자 정보 조회**

```typescript
// src/controllers/userController.ts
async getMe(req, res, next) {
  // req.user는 이미 인증 미들웨어에서 설정됨
  const user = await userService.findById(req.user.userId);

  res.status(200).json({
    success: true,
    data: user,
  });
}
```

---

## 🎯 MVC 패턴의 장점 정리

### 1️⃣ **관심사의 분리 (Separation of Concerns)**

```
Model      → 데이터와 데이터 로직만 담당
Service    → 비즈니스 로직만 담당
Controller → 요청/응답 처리만 담당
```

### 2️⃣ **재사용성**

```typescript
// userService.generateToken()은 여러 곳에서 재사용
- oauthLogin()에서 사용
- register()에서 사용
- login()에서 사용
```

### 3️⃣ **테스트 용이성**

```typescript
// 각 레이어를 독립적으로 테스트 가능
test("userService.findByEmail", async () => {
  const user = await userService.findByEmail("test@test.com");
  expect(user).toBeDefined();
});
```

### 4️⃣ **유지보수성**

```
비즈니스 로직 변경 → Service만 수정
데이터베이스 변경 → Model만 수정
API 응답 형식 변경 → Controller만 수정
```

### 5️⃣ **확장성**

```typescript
// 새로운 OAuth Provider 추가가 쉬움
export enum OAuthProvider {
  INSTAGRAM = "instagram",
  NAVER = "naver",
  KAKAO = "kakao",
  GOOGLE = "google", // ← 추가만 하면 됨
}
```

---

## 📊 전체 데이터 흐름 다이어그램

```
Client (Next.js)
    ↓ POST /api/users/oauth/login
    ↓ { provider: "kakao", providerId: "123", ... }
    ↓
┌───────────────────────────────────────────────┐
│  Express Server (app.ts)                      │
│  → JSON 파싱                                   │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│  Main Router (routes/index.ts)                │
│  → /api 제거, /users로 라우팅                  │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│  User Router (routes/users.ts)                │
│  → /oauth/login 매칭                          │
│  → 미들웨어 체인 실행                           │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│  Validation Middleware (middleware/validation)│
│  → 데이터 검증                                  │
│  → ✅ 통과 시 next()                          │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│  Controller (controllers/userController)      │
│  → 데이터 추출                                  │
│  → Service 호출 ──────────────┐               │
└───────────────────────────────│───────────────┘
                                ↓
              ┌─────────────────────────────────┐
              │  Service (services/userService) │
              │  → 비즈니스 로직 실행              │
              │  → Model 호출 ─────────┐        │
              └─────────────────────────│────────┘
                                        ↓
                      ┌──────────────────────────┐
                      │  Model (models/User)     │
                      │  → DB 조회/저장           │
                      │  → MongoDB ←→ Mongoose   │
                      └──────────────────────────┘
                                        ↑
              ┌─────────────────────────┘
              │  결과 반환 (User 객체)
              ↓
┌───────────────────────────────────────────────┐
│  Service                                      │
│  → JWT 토큰 생성                               │
│  → Controller로 반환 ──────────┐              │
└───────────────────────────────│───────────────┘
                                ↓
┌───────────────────────────────────────────────┐
│  Controller                                   │
│  → HTTP 응답 생성                              │
│  → { user, token } 반환                       │
└───────────────────────────────────────────────┘
    ↓
Client (Next.js)
← 200 OK
← { success: true, data: { user, token } }
```

---

## 💡 핵심 개념 요약

### Route (경로 정의)

- "어떤 URL + HTTP 메서드"가 "어떤 함수"를 실행할지 매핑
- 미들웨어 체인 순서 정의

### Middleware (중간 처리)

- 요청이 컨트롤러에 도달하기 전/후에 실행
- 검증, 인증, 로깅 등

### Controller (교통정리)

- HTTP 요청을 받아서 처리
- Service를 호출하고 결과를 HTTP 응답으로 변환
- "무엇을" 할지만 정의

### Service (비즈니스 로직)

- "어떻게" 할지 정의
- 복잡한 로직, 여러 Model 조합
- 재사용 가능한 메서드 제공

### Model (데이터)

- 데이터베이스 스키마 정의
- CRUD 작업
- 데이터 관련 메서드만 제공

---

이제 MVC 패턴의 전체 흐름을 이해하셨나요? 🎉
