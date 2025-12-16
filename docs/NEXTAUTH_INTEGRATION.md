# NextAuth.js Integration Guide for Frontend

이 가이드는 Next.js 프론트엔드에서 NextAuth.js를 사용하여 백엔드 API와 연동하는 방법을 설명합니다.

## 📦 설치

```bash
npm install next-auth
# or
pnpm add next-auth
```

## 🔧 NextAuth 설정

### 1. 환경 변수 설정 (.env.local)

```env
# OAuth Provider Credentials
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 2. NextAuth Route Handler (app/api/auth/[...nextauth]/route.ts)

```typescript
import NextAuth, { AuthOptions } from "next-auth";
import InstagramProvider from "next-auth/providers/instagram";
import NaverProvider from "next-auth/providers/naver";
import KakaoProvider from "next-auth/providers/kakao";

export const authOptions: AuthOptions = {
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
      try {
        // 백엔드 API에 OAuth 로그인 요청
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/oauth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: account?.provider, // instagram, naver, kakao
            providerId: account?.providerAccountId,
            email: user.email,
            name: user.name,
            image: user.image,
            accessToken: account?.access_token,
            refreshToken: account?.refresh_token,
            profile: profile,
          }),
        });

        if (!response.ok) {
          console.error("Backend login failed:", await response.text());
          return false;
        }

        const data = await response.json();

        // JWT 토큰을 user 객체에 추가 (session callback에서 사용)
        user.backendToken = data.data.token;
        user.id = data.data.user._id;

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      // 로그인 시 user 정보를 token에 추가
      if (user) {
        token.backendToken = user.backendToken;
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // token의 정보를 session에 추가
      if (token) {
        session.backendToken = token.backendToken as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 3. TypeScript 타입 확장 (types/next-auth.d.ts)

```typescript
import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    backendToken?: string;
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    id?: string;
  }
}
```

### 4. Session Provider (app/providers.tsx)

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

### 5. Layout에서 Provider 사용 (app/layout.tsx)

```typescript
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## 🎨 로그인 페이지 예시 (app/auth/signin/page.tsx)

```typescript
"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-8">로그인</h1>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => signIn("instagram", { callbackUrl: "/" })}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg"
        >
          Instagram으로 로그인
        </button>

        <button
          onClick={() => signIn("naver", { callbackUrl: "/" })}
          className="px-6 py-3 bg-green-500 text-white rounded-lg"
        >
          Naver로 로그인
        </button>

        <button
          onClick={() => signIn("kakao", { callbackUrl: "/" })}
          className="px-6 py-3 bg-yellow-400 text-black rounded-lg"
        >
          Kakao로 로그인
        </button>
      </div>
    </div>
  );
}
```

## 🔐 API 호출 시 토큰 사용

### Client Component에서 사용

```typescript
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (session?.backendToken) {
      fetchUserData();
    }
  }, [session]);

  const fetchUserData = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
      {
        headers: {
          Authorization: `Bearer ${session?.backendToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setUserData(data.data);
    }
  };

  if (!session) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <h1>내 프로필</h1>
      {userData && (
        <div>
          <p>이름: {userData.name}</p>
          <p>이메일: {userData.email}</p>
        </div>
      )}
    </div>
  );
}
```

### Server Component에서 사용

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function ServerProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.backendToken) {
    return <div>로그인이 필요합니다.</div>;
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
    {
      headers: {
        Authorization: `Bearer ${session.backendToken}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  return (
    <div>
      <h1>내 프로필</h1>
      <p>이름: {data.data.name}</p>
      <p>이메일: {data.data.email}</p>
    </div>
  );
}
```

## 🛠️ 유틸리티 함수

### API 호출 헬퍼 (lib/api.ts)

```typescript
import { getSession } from "next-auth/react";

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const session = await getSession();

  if (!session?.backendToken) {
    throw new Error("No authentication token available");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.backendToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "API request failed");
  }

  return response.json();
}

// 사용 예시
export async function updateProfile(data: { name: string; image?: string }) {
  return fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function linkOAuthAccount(provider: string, data: any) {
  return fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/oauth/link`, {
    method: "POST",
    body: JSON.stringify({ provider, ...data }),
  });
}
```

## 🔄 로그아웃

```typescript
"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      className="px-4 py-2 bg-red-500 text-white rounded"
    >
      로그아웃
    </button>
  );
}
```

## 🔒 Route 보호 (Middleware)

### middleware.ts

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
```

## 📝 체크리스트

- [ ] NextAuth.js 설치
- [ ] 환경 변수 설정
- [ ] OAuth Provider 설정
- [ ] NextAuth Route Handler 구현
- [ ] TypeScript 타입 확장
- [ ] Session Provider 설정
- [ ] 로그인 페이지 구현
- [ ] API 호출 함수 구현
- [ ] 백엔드 API 연동 테스트

## 🐛 문제 해결

### CORS 에러가 발생하는 경우

백엔드의 `.env` 파일에서 `FRONTEND_URL`이 올바르게 설정되어 있는지 확인하세요.

### 토큰이 전달되지 않는 경우

NextAuth callbacks에서 `user.backendToken`이 제대로 설정되었는지 확인하세요.

### OAuth 리다이렉트 URL 설정

각 Provider의 개발자 콘솔에서 Redirect URL을 다음과 같이 설정하세요:

- `http://localhost:3000/api/auth/callback/instagram`
- `http://localhost:3000/api/auth/callback/naver`
- `http://localhost:3000/api/auth/callback/kakao`
