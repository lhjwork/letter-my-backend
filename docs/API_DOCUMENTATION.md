# Letter-My Backend API Documentation

## 📁 프로젝트 구조 (MVC Pattern)

```
src/
├── models/          # Model Layer (데이터 스키마 및 비즈니스 로직)
│   └── User.ts      # User 모델 (MongoDB Schema)
├── services/        # Service Layer (비즈니스 로직)
│   └── userService.ts
├── controllers/     # Controller Layer (요청/응답 처리)
│   └── userController.ts
├── middleware/      # 미들웨어
│   ├── auth.ts      # JWT 인증
│   ├── validation.ts # 요청 검증
│   └── errorHandler.ts
├── routes/          # API 라우트
│   ├── index.ts
│   └── users.ts
├── config/          # 설정
│   └── database.ts
├── app.ts           # Express 앱 설정
└── server.ts        # 서버 시작
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env` 파일 생성 (`.env.example` 참고)

### 3. 서버 실행

```bash
# 개발 모드
pnpm dev

# 프로덕션 빌드
pnpm build
pnpm start
```

## 🔐 인증 방식

### JWT Bearer Token

모든 보호된 엔드포인트는 Authorization 헤더에 JWT 토큰이 필요합니다:

```
Authorization: Bearer <your_jwt_token>
```

## 📡 API 엔드포인트

### 공개 엔드포인트 (인증 불필요)

#### 1. OAuth 로그인/회원가입

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

#### 3. OAuth 로그인/회원가입

```http
POST /api/users/oauth/login
Content-Type: application/json

{
  "provider": "kakao",
  "providerId": "123456789",
  "email": "user@example.com",
  "name": "홍길동",
  "image": "https://example.com/avatar.jpg",
  "accessToken": "oauth_access_token",
  "refreshToken": "oauth_refresh_token",
  "profile": {
    "email": "user@example.com",
    "name": "홍길동"
  }
}
```

**지원하는 Provider:**

- `instagram` - 인스타그램
- `naver` - 네이버
- `kakao` - 카카오

### 보호된 엔드포인트 (인증 필요)

#### 2. 내 정보 조회

```http
GET /api/users/me
Authorization: Bearer <token>
```

#### 3. 사용자 정보 업데이트

```http
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "새이름",
  "image": "https://example.com/new-avatar.jpg",
  "email": "newemail@example.com"
}
```

#### 4. 계정 삭제 (탈퇴)

```http
DELETE /api/users/me
Authorization: Bearer <token>
```

#### 5. OAuth 계정 연결

```http
POST /api/users/me/oauth/link
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "naver",
  "providerId": "987654321",
  "accessToken": "oauth_access_token",
  "refreshToken": "oauth_refresh_token",
  "profile": {
    "email": "user@naver.com",
    "name": "홍길동"
  }
}
```

#### 6. OAuth 계정 연결 해제

```http
DELETE /api/users/me/oauth/:provider
Authorization: Bearer <token>
```

예시: `DELETE /api/users/me/oauth/kakao`

#### 7. 모든 사용자 조회 (페이지네이션)

```http
GET /api/users?page=1&limit=10
Authorization: Bearer <token>
```

#### 8. ID로 사용자 조회

```http
GET /api/users/:id
Authorization: Bearer <token>
```

## 🔗 NextAuth.js 연동 방법

### Frontend (Next.js) 설정 예시

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import InstagramProvider from "next-auth/providers/instagram";
import NaverProvider from "next-auth/providers/naver";
import KakaoProvider from "next-auth/providers/kakao";

export const authOptions = {
  providers: [
    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID!,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Backend API에 OAuth 로그인 요청
      const response = await fetch("http://localhost:5000/api/users/oauth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: account.provider,
          providerId: account.providerAccountId,
          email: user.email,
          name: user.name,
          image: user.image,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          profile: profile,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // JWT 토큰을 user 객체에 추가
        user.backendToken = data.data.token;
        user.id = data.data.user._id;
        return true;
      }

      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.backendToken = user.backendToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.backendToken = token.backendToken;
      session.user.id = token.id;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### API 요청 시 토큰 사용 예시

```typescript
// lib/api.ts
import { getSession } from "next-auth/react";

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const session = await getSession();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session?.backendToken}`,
      "Content-Type": "application/json",
    },
  });
}

// 사용 예시
const response = await fetchWithAuth("http://localhost:5000/api/users/me");
const userData = await response.json();
```

## 🔧 환경 변수

필수 환경 변수는 `.env.example` 파일을 참고하세요.

## 📝 주요 기능

### User Model

- ✅ 이메일/비밀번호 회원가입 및 로그인
- ✅ OAuth 소셜 로그인 (Instagram, Naver, Kakao)
- ✅ 한 계정에 여러 OAuth Provider 연결 가능
- ✅ 비밀번호 자동 해싱 (bcrypt)
- ✅ JWT 토큰 기반 인증
- ✅ 사용자 정보 CRUD

### 보안 기능

- ✅ JWT 토큰 인증
- ✅ 비밀번호 암호화
- ✅ Request Validation
- ✅ CORS 설정
- ✅ Helmet 보안 헤더

## 🧪 테스트

```bash
# Postman이나 Thunder Client로 테스트
# 또는 curl 사용:

# OAuth 로그인
curl -X POST http://localhost:5000/api/users/oauth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"kakao","providerId":"123456","email":"test@example.com","name":"테스트","image":"https://example.com/avatar.jpg"}'

# 내 정보 조회 (토큰 필요)
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📚 참고 문서

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Instagram OAuth](https://developers.facebook.com/docs/instagram-basic-display-api/getting-started)
- [Naver OAuth](https://developers.naver.com/docs/login/overview/overview.md)
- [Kakao OAuth](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
