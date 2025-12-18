# Admin 백엔드 구현 프롬프트

## 개요

Letter My 서비스의 관리자(Admin) 백엔드 API를 구현합니다.

---

## 1. 데이터 모델 수정

### User 모델 수정

```typescript
// src/models/User.ts에 추가

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export enum UserStatus {
  ACTIVE = "active",
  BANNED = "banned",
  DELETED = "deleted",
}

// IUser 인터페이스에 추가
interface IUser {
  // 기존 필드...
  role: UserRole;
  status: UserStatus;
  bannedAt?: Date;
  bannedReason?: string;
  deletedAt?: Date;
}

// UserSchema에 추가
role: {
  type: String,
  enum: Object.values(UserRole),
  default: UserRole.USER,
},
status: {
  type: String,
  enum: Object.values(UserStatus),
  default: UserStatus.ACTIVE,
},
bannedAt: Date,
bannedReason: String,
deletedAt: Date,
```

### Letter 모델 수정

```typescript
// src/models/Letter.ts 수정

export enum LetterStatus {
  CREATED = "created",
  PUBLISHED = "published",
  HIDDEN = "hidden", // 관리자에 의해 숨김
  DELETED = "deleted", // 삭제됨
}

// ILetter 인터페이스에 추가
interface ILetter {
  // 기존 필드...
  hiddenAt?: Date;
  hiddenReason?: string;
  deletedAt?: Date;
}
```

---

## 2. Admin 미들웨어

### 파일: `src/middleware/adminAuth.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import User, { UserRole } from "../models/User";

export const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user.userId);

    if (!user || user.role !== UserRole.ADMIN) {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
```

---

## 3. Admin API 엔드포인트

### 대시보드

| Method | Endpoint               | 설명          |
| ------ | ---------------------- | ------------- |
| GET    | `/api/admin/dashboard` | 대시보드 통계 |

**응답:**

```typescript
interface DashboardStats {
  users: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byStatus: { active: number; banned: number; deleted: number };
  };
  letters: {
    total: number;
    stories: number;
    letters: number;
    today: number;
    byStatus: { created: number; published: number; hidden: number };
  };
  categories: { name: string; count: number }[];
  recentUsers: IUser[];
  recentLetters: ILetter[];
}
```

### 사용자 관리

| Method | Endpoint                     | 설명        |
| ------ | ---------------------------- | ----------- |
| GET    | `/api/admin/users`           | 사용자 목록 |
| GET    | `/api/admin/users/:id`       | 사용자 상세 |
| PUT    | `/api/admin/users/:id`       | 사용자 수정 |
| PUT    | `/api/admin/users/:id/role`  | 역할 변경   |
| POST   | `/api/admin/users/:id/ban`   | 사용자 정지 |
| POST   | `/api/admin/users/:id/unban` | 정지 해제   |
| DELETE | `/api/admin/users/:id`       | 사용자 삭제 |

**사용자 목록 쿼리:**

```
GET /api/admin/users?page=1&limit=20&search=검색어&role=user&status=active&sort=createdAt&order=desc
```

### 편지/사연 관리

| Method | Endpoint                        | 설명           |
| ------ | ------------------------------- | -------------- |
| GET    | `/api/admin/letters`            | 편지/사연 목록 |
| GET    | `/api/admin/letters/:id`        | 편지/사연 상세 |
| PUT    | `/api/admin/letters/:id`        | 편지/사연 수정 |
| PUT    | `/api/admin/letters/:id/status` | 상태 변경      |
| DELETE | `/api/admin/letters/:id`        | 편지/사연 삭제 |

**편지 목록 쿼리:**

```
GET /api/admin/letters?page=1&limit=20&type=story&category=가족&status=published&search=검색어&sort=createdAt&order=desc
```

---

## 4. 구현 파일 구조

```
src/
├── middleware/
│   └── adminAuth.ts            # Admin 권한 미들웨어
├── controllers/
│   └── adminController.ts      # Admin 컨트롤러
├── services/
│   └── adminService.ts         # Admin 서비스
├── routes/
│   └── adminRoutes.ts          # Admin 라우트
└── models/
    ├── User.ts                 # role, status 추가
    └── Letter.ts               # status 확장
```

---

## 5. Admin 서비스 구현

### 파일: `src/services/adminService.ts`

```typescript
class AdminService {
  // 대시보드 통계
  async getDashboardStats(): Promise<DashboardStats>;

  // 사용자 관리
  async getUsers(query: UserQueryParams): Promise<PaginatedResult<IUser>>;
  async getUserById(id: string): Promise<IUser | null>;
  async updateUser(id: string, data: Partial<IUser>): Promise<IUser | null>;
  async updateUserRole(id: string, role: UserRole): Promise<IUser | null>;
  async banUser(id: string, reason: string): Promise<IUser | null>;
  async unbanUser(id: string): Promise<IUser | null>;
  async deleteUser(id: string): Promise<boolean>;

  // 편지 관리
  async getLetters(query: LetterQueryParams): Promise<PaginatedResult<ILetter>>;
  async getLetterById(id: string): Promise<ILetter | null>;
  async updateLetter(id: string, data: Partial<ILetter>): Promise<ILetter | null>;
  async updateLetterStatus(id: string, status: LetterStatus, reason?: string): Promise<ILetter | null>;
  async deleteLetter(id: string): Promise<boolean>;
}
```

---

## 6. Admin 라우트 등록

### 파일: `src/routes/adminRoutes.ts`

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { adminAuth } from "../middleware/adminAuth";
import adminController from "../controllers/adminController";

const router = Router();

// 모든 Admin 라우트에 인증 + Admin 권한 체크
router.use(authenticate, adminAuth);

// 대시보드
router.get("/dashboard", adminController.getDashboard);

// 사용자 관리
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id", adminController.updateUser);
router.put("/users/:id/role", adminController.updateUserRole);
router.post("/users/:id/ban", adminController.banUser);
router.post("/users/:id/unban", adminController.unbanUser);
router.delete("/users/:id", adminController.deleteUser);

// 편지 관리
router.get("/letters", adminController.getLetters);
router.get("/letters/:id", adminController.getLetterById);
router.put("/letters/:id", adminController.updateLetter);
router.put("/letters/:id/status", adminController.updateLetterStatus);
router.delete("/letters/:id", adminController.deleteLetter);

export default router;
```

### `src/routes/index.ts`에 등록

```typescript
import adminRoutes from "./adminRoutes";

// Admin routes
router.use("/admin", adminRoutes);
```

---

## 7. 초기 Admin 계정 생성 스크립트

### 파일: `scripts/createAdmin.ts`

```typescript
import mongoose from "mongoose";
import dotenv from "dotenv";
import User, { UserRole } from "../src/models/User";

dotenv.config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const email = process.argv[2];
  if (!email) {
    console.error("Usage: ts-node scripts/createAdmin.ts <email>");
    process.exit(1);
  }

  const user = await User.findOneAndUpdate({ email }, { $set: { role: UserRole.ADMIN } }, { new: true });

  if (user) {
    console.log(`✅ Admin 권한 부여 완료: ${user.email}`);
  } else {
    console.error(`❌ 사용자를 찾을 수 없습니다: ${email}`);
  }

  await mongoose.disconnect();
}

createAdmin();
```

**실행:**

```bash
pnpm ts-node scripts/createAdmin.ts admin@example.com
```

---

## 8. package.json 스크립트 추가

```json
{
  "scripts": {
    "admin:create": "ts-node scripts/createAdmin.ts"
  }
}
```

---

## 9. Swagger 문서 태그 추가

```typescript
/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: 관리자 전용 API
 */
```

---

## 구현 순서

1. User 모델에 `role`, `status` 필드 추가
2. Letter 모델에 `status` 확장 (HIDDEN, DELETED)
3. `adminAuth` 미들웨어 생성
4. `adminService` 구현
5. `adminController` 구현
6. `adminRoutes` 생성 및 등록
7. Admin 계정 생성 스크립트 작성
8. Swagger 문서 추가
