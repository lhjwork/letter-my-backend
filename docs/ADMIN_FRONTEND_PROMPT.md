# Admin 프론트엔드 구현 프롬프트

## 개요

Letter My 서비스의 관리자(Admin) 프론트엔드를 구현합니다.
Admin은 별도 인증 시스템(이메일/비밀번호)을 사용하며, 역할 기반 권한 관리를 지원합니다.

## 기술 스택

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query + Ky
- **Styling**: SCSS
- **Routing**: React Router DOM

---

## 필요한 추가 패키지

```bash
pnpm add react-router-dom jsencrypt
pnpm add -D @types/react-router-dom
```

---

## API 엔드포인트

Base URL: `http://localhost:5001/api/admin`

### 인증 API

| Method | Endpoint           | 설명            | 권한   |
| ------ | ------------------ | --------------- | ------ |
| GET    | `/auth/public-key` | RSA 공개키 조회 | Public |
| POST   | `/auth/login`      | 로그인          | Public |
| POST   | `/auth/logout`     | 로그아웃        | Admin  |
| GET    | `/auth/me`         | 내 정보 조회    | Admin  |
| PUT    | `/auth/password`   | 비밀번호 변경   | Admin  |

### 관리자 관리 API (Super Admin 전용)

| Method | Endpoint      | 설명        |
| ------ | ------------- | ----------- |
| GET    | `/admins`     | 관리자 목록 |
| POST   | `/admins`     | 관리자 생성 |
| GET    | `/admins/:id` | 관리자 상세 |
| PUT    | `/admins/:id` | 관리자 수정 |
| DELETE | `/admins/:id` | 관리자 삭제 |

### 대시보드 API

| Method | Endpoint     | 설명          | 권한           |
| ------ | ------------ | ------------- | -------------- |
| GET    | `/dashboard` | 대시보드 통계 | dashboard.read |

### 사용자 관리 API

| Method | Endpoint           | 설명        | 권한         |
| ------ | ------------------ | ----------- | ------------ |
| GET    | `/users`           | 사용자 목록 | users.read   |
| GET    | `/users/:id`       | 사용자 상세 | users.read   |
| PUT    | `/users/:id`       | 사용자 수정 | users.write  |
| POST   | `/users/:id/ban`   | 사용자 정지 | users.write  |
| POST   | `/users/:id/unban` | 정지 해제   | users.write  |
| DELETE | `/users/:id`       | 사용자 삭제 | users.delete |

### 편지/사연 관리 API

| Method | Endpoint              | 설명      | 권한           |
| ------ | --------------------- | --------- | -------------- |
| GET    | `/letters`            | 편지 목록 | letters.read   |
| GET    | `/letters/:id`        | 편지 상세 | letters.read   |
| PUT    | `/letters/:id`        | 편지 수정 | letters.write  |
| PUT    | `/letters/:id/status` | 상태 변경 | letters.write  |
| DELETE | `/letters/:id`        | 편지 삭제 | letters.delete |

---

## 데이터 타입

```typescript
// src/types/index.ts

// ===== Admin 관련 =====

// Admin 역할
export type AdminRole = "super_admin" | "admin" | "manager";

// Admin 상태
export type AdminStatus = "active" | "inactive";

// 권한 목록
export const PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_WRITE: "users.write",
  USERS_DELETE: "users.delete",
  LETTERS_READ: "letters.read",
  LETTERS_WRITE: "letters.write",
  LETTERS_DELETE: "letters.delete",
  ADMINS_READ: "admins.read",
  ADMINS_WRITE: "admins.write",
  ADMINS_DELETE: "admins.delete",
  DASHBOARD_READ: "dashboard.read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// 역할별 기본 권한
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),
  admin: [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE, PERMISSIONS.LETTERS_READ, PERMISSIONS.LETTERS_WRITE, PERMISSIONS.LETTERS_DELETE, PERMISSIONS.DASHBOARD_READ],
  manager: [PERMISSIONS.USERS_READ, PERMISSIONS.LETTERS_READ, PERMISSIONS.DASHBOARD_READ],
};

// Admin 인터페이스
export interface Admin {
  _id: string;
  username: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  department?: string;
  status: AdminStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== User 관련 =====

export type UserStatus = "active" | "banned" | "deleted";

export interface OAuthAccount {
  provider: "instagram" | "naver" | "kakao";
  providerId: string;
}

export interface Address {
  _id: string;
  addressName: string;
  recipientName: string;
  zipCode: string;
  address: string;
  addressDetail?: string;
  phone: string;
  isDefault: boolean;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  image?: string;
  status: UserStatus;
  oauthAccounts: OAuthAccount[];
  addresses: Address[];
  bannedAt?: string;
  bannedReason?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Letter 관련 =====

export type LetterType = "story" | "letter";
export type LetterStatus = "created" | "published" | "hidden" | "deleted";
export type LetterCategory = "가족" | "사랑" | "우정" | "성장" | "위로" | "추억" | "감사" | "기타";

export interface Letter {
  _id: string;
  type: LetterType;
  userId?: string;
  title: string;
  content: string;
  authorName: string;
  category: LetterCategory;
  status: LetterStatus;
  viewCount: number;
  likeCount: number;
  hiddenAt?: string;
  hiddenReason?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

// ===== 대시보드 =====

export interface DashboardStats {
users: {
total: number;
today: number;
thisWeek: number;
thisMonth: number;
byStatus: {
active: number;
banned: number;
deleted: number;
};
};
letters: {
total: number;
stories: number;
letters: number;
today: number;
byStatus: {
created: number;
published: number;
hidden: number;
};
};
categories: { name: string; count: number }[];
recentUsers: User[];
recentLetters: Letter[];
}

// ===== 공통 =====

export interface Pagination {
page: number;
limit: number;
total: number;
totalPages: number;
}

export interface ApiResponse<T> {
success: boolean;
data: T;
message?: string;
pagination?: Pagination;
}

// 쿼리 파라미터
export interface AdminQueryParams {
page?: number;
limit?: number;
search?: string;
role?: AdminRole | "";
status?: AdminStatus | "";
department?: string;
}

export interface UserQueryParams {
page?: number;
limit?: number;
search?: string;
status?: UserStatus | "";
sort?: string;
order?: "asc" | "desc";
}

export interface LetterQueryParams {
page?: number;
limit?: number;
search?: string;
type?: LetterType | "";
category?: LetterCategory | "";
status?: LetterStatus | "";
sort?: string;
order?: "asc" | "desc";
}

```

---

## 프로젝트 구조

```

src/
├── api/
│ ├── client.ts # Ky 인스턴스 설정
│ ├── auth.ts # 인증 API
│ ├── admins.ts # 관리자 관리 API
│ ├── users.ts # 사용자 관리 API
│ └── letters.ts # 편지 관리 API
├── components/
│ ├── common/
│ │ ├── Button.tsx
│ │ ├── Input.tsx
│ │ ├── Select.tsx
│ │ ├── Modal.tsx
│ │ ├── Table.tsx
│ │ ├── Pagination.tsx
│ │ ├── Loading.tsx
│ │ └── PermissionGuard.tsx # 권한 체크 컴포넌트
│ ├── layout/
│ │ ├── AdminLayout.tsx
│ │ ├── Sidebar.tsx
│ │ └── Header.tsx
│ ├── dashboard/
│ │ ├── StatsCard.tsx
│ │ ├── RecentUsers.tsx
│ │ └── RecentLetters.tsx
│ ├── admins/ # 관리자 관리 (NEW)
│ │ ├── AdminTable.tsx
│ │ ├── AdminForm.tsx
│ │ └── AdminDetail.tsx
│ ├── users/
│ │ ├── UserTable.tsx
│ │ ├── UserFilter.tsx
│ │ ├── UserDetail.tsx
│ │ └── BanModal.tsx
│ └── letters/
│ ├── LetterTable.tsx
│ ├── LetterFilter.tsx
│ ├── LetterDetail.tsx
│ └── StatusModal.tsx
├── hooks/
│ ├── useAuth.ts
│ ├── usePermission.ts # 권한 체크 hook (NEW)
│ ├── useDashboard.ts
│ ├── useAdmins.ts # 관리자 관리 hook (NEW)
│ ├── useUsers.ts
│ └── useLetters.ts
├── pages/
│ ├── Login.tsx
│ ├── Dashboard.tsx
│ ├── Admins.tsx # 관리자 목록 (NEW)
│ ├── AdminDetail.tsx # 관리자 상세 (NEW)
│ ├── Users.tsx
│ ├── UserDetail.tsx
│ ├── Letters.tsx
│ ├── LetterDetail.tsx
│ └── ChangePassword.tsx # 비밀번호 변경 (NEW)
├── stores/
│ └── authStore.ts
├── styles/
│ ├── \_variables.scss
│ ├── \_mixins.scss
│ ├── global.scss
│ └── components/
├── types/
│ └── index.ts
├── utils/
│ ├── format.ts
│ ├── constants.ts
│ └── permission.ts # 권한 유틸 (NEW)
├── App.tsx
├── main.tsx
└── vite-env.d.ts

```

```

---

## API 클라이언트 (Ky)

```typescript
// src/api/client.ts
import ky from "ky";
import { useAuthStore } from "../stores/authStore";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().token;
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
        return response;
      },
    ],
  },
});
```

```typescript
// src/api/auth.ts
import { apiClient } from "./client";
import type { ApiResponse, Admin } from "../types";
import JSEncrypt from "jsencrypt";

interface LoginResponse {
  admin: Admin;
  token: string;
}

interface PublicKeyResponse {
  publicKey: string;
}

// RSA 공개키 조회
export const getPublicKey = () => apiClient.get("admin/auth/public-key").json<ApiResponse<PublicKeyResponse>>();

// RSA 암호화 함수
export const encryptPassword = async (password: string): Promise<string> => {
  const response = await getPublicKey();
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(response.data.publicKey);
  const encrypted = encrypt.encrypt(password);
  if (!encrypted) {
    throw new Error("비밀번호 암호화에 실패했습니다");
  }
  return encrypted;
};

// 로그인 (RSA 암호화 적용)
export const login = async (username: string, password: string) => {
  const encryptedPassword = await encryptPassword(password);
  return apiClient
    .post("admin/auth/login", {
      json: { username, password: encryptedPassword, encrypted: true },
    })
    .json<ApiResponse<LoginResponse>>();
};

export const logout = () => apiClient.post("admin/auth/logout").json<ApiResponse<null>>();

export const getMe = () => apiClient.get("admin/auth/me").json<ApiResponse<Admin>>();

// 비밀번호 변경 (RSA 암호화 적용)
export const changePassword = async (currentPassword: string, newPassword: string) => {
  const [encryptedCurrent, encryptedNew] = await Promise.all([encryptPassword(currentPassword), encryptPassword(newPassword)]);
  return apiClient
    .put("admin/auth/password", {
      json: {
        currentPassword: encryptedCurrent,
        newPassword: encryptedNew,
        encrypted: true,
      },
    })
    .json<ApiResponse<null>>();
};
```

```typescript
// src/api/admins.ts
import { apiClient } from "./client";
import type { ApiResponse, Admin, AdminQueryParams, AdminRole, Permission, Pagination } from "../types";

export const getAdmins = (params: AdminQueryParams) => apiClient.get("admin/admins", { searchParams: params as Record<string, string> }).json<ApiResponse<Admin[]> & { pagination: Pagination }>();

export const getAdminById = (id: string) => apiClient.get(`admin/admins/${id}`).json<ApiResponse<Admin>>();

export const createAdmin = (data: { username: string; password: string; name: string; role?: AdminRole; permissions?: Permission[]; department?: string }) =>
  apiClient.post("admin/admins", { json: data }).json<ApiResponse<Admin>>();

export const updateAdmin = (
  id: string,
  data: Partial<{
    name: string;
    role: AdminRole;
    permissions: Permission[];
    department: string;
    status: "active" | "inactive";
  }>
) => apiClient.put(`admin/admins/${id}`, { json: data }).json<ApiResponse<Admin>>();

export const deleteAdmin = (id: string) => apiClient.delete(`admin/admins/${id}`).json<ApiResponse<null>>();
```

---

## Zustand 인증 스토어

```typescript
// src/stores/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Admin, Permission, AdminRole, ROLE_PERMISSIONS } from "../types";

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (token: string, admin: Admin) => void;
  logout: () => void;

  // Permission helpers
  hasPermission: (permission: Permission) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      isAuthenticated: false,

      setAuth: (token, admin) =>
        set({
          token,
          admin,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          admin: null,
          isAuthenticated: false,
        }),

      hasPermission: (permission) => {
        const { admin } = get();
        if (!admin) return false;

        // super_admin은 모든 권한
        if (admin.role === "super_admin") return true;

        // 역할 기본 권한 확인
        const rolePermissions = ROLE_PERMISSIONS[admin.role as AdminRole];
        if (rolePermissions.includes(permission)) return true;

        // 추가 권한 확인
        return admin.permissions.includes(permission);
      },

      isSuperAdmin: () => {
        const { admin } = get();
        return admin?.role === "super_admin";
      },
    }),
    {
      name: "admin-auth",
    }
  )
);
```

---

## 권한 체크 Hook & 컴포넌트

```typescript
// src/hooks/usePermission.ts
import { useAuthStore } from "../stores/authStore";
import type { Permission } from "../types";

export const usePermission = () => {
  const { admin, hasPermission, isSuperAdmin } = useAuthStore();

  return {
    admin,
    hasPermission,
    isSuperAdmin,
    canRead: (resource: "users" | "letters" | "admins" | "dashboard") => hasPermission(`${resource}.read` as Permission),
    canWrite: (resource: "users" | "letters" | "admins") => hasPermission(`${resource}.write` as Permission),
    canDelete: (resource: "users" | "letters" | "admins") => hasPermission(`${resource}.delete` as Permission),
  };
};
```

```typescript
// src/components/common/PermissionGuard.tsx
import type { Permission } from "../../types";
import { useAuthStore } from "../../stores/authStore";

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

---

## Zustand 인증 스토어

```typescript
// src/stores/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Admin, Permission, ROLE_PERMISSIONS } from "../types";

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  setAuth: (token: string, admin: Admin) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      isAuthenticated: false,

      setAuth: (token, admin) =>
        set({
          token,
          admin,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          admin: null,
          isAuthenticated: false,
        }),

      // 권한 체크
      hasPermission: (permission: Permission) => {
        const { admin } = get();
        if (!admin) return false;

        // super_admin은 모든 권한
        if (admin.role === "super_admin") return true;

        // 역할 기본 권한 확인
        const rolePermissions = ROLE_PERMISSIONS[admin.role];
        if (rolePermissions.includes(permission)) return true;

        // 추가 권한 확인
        return admin.permissions.includes(permission);
      },
    }),
    {
      name: "admin-auth",
    }
  )
);
```

---

## 권한 체크 Hook & 컴포넌트

```typescript
// src/hooks/usePermission.ts
import { useAuthStore } from "../stores/authStore";
import type { Permission } from "../types";

export const usePermission = () => {
  const { admin, hasPermission } = useAuthStore();

  const isSuperAdmin = admin?.role === "super_admin";
  const isAdmin = admin?.role === "admin" || isSuperAdmin;
  const isManager = admin?.role === "manager" || isAdmin;

  return {
    admin,
    isSuperAdmin,
    isAdmin,
    isManager,
    hasPermission,
    can: (permission: Permission) => hasPermission(permission),
  };
};
```

```typescript
// src/components/common/PermissionGuard.tsx
import type { Permission } from "../../types";
import { usePermission } from "../../hooks/usePermission";

interface Props {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({ permission, children, fallback = null }: Props) {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

---

## 라우터 설정

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./stores/authStore";
import { usePermission } from "./hooks/usePermission";
import AdminLayout from "./components/layout/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admins from "./pages/Admins";
import AdminDetail from "./pages/AdminDetail";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import Letters from "./pages/Letters";
import LetterDetail from "./pages/LetterDetail";
import ChangePassword from "./pages/ChangePassword";

const queryClient = new QueryClient();

// 인증 가드
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Super Admin 전용 가드
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSuperAdmin } = usePermission();

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Super Admin 전용 */}
            <Route path="admins" element={<SuperAdminRoute><Admins /></SuperAdminRoute>} />
            <Route path="admins/:id" element={<SuperAdminRoute><AdminDetail /></SuperAdminRoute>} />

            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="letters" element={<Letters />} />
            <Route path="letters/:id" element={<LetterDetail />} />
            <Route path="change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

---

## 로그인 페이지

```typescript
// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import "./Login.scss";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (response) => {
      if (response.success) {
        setAuth(response.data.token, response.data.admin);
        navigate("/dashboard");
      }
    },
    onError: (err: any) => {
      setError(err.message || "로그인에 실패했습니다");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate();
  };

  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__title">Letter Admin</h1>
        <form onSubmit={handleSubmit} className="login__form">
          {error && <div className="login__error">{error}</div>}
          <div className="login__field">
            <label>아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="login__field">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="login__button"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Sidebar (권한별 메뉴)

```typescript
// src/components/layout/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { usePermission } from "../../hooks/usePermission";
import { PERMISSIONS } from "../../types";
import "./Sidebar.scss";

export default function Sidebar() {
  const { isSuperAdmin, hasPermission } = usePermission();

  const menuItems = [
    {
      path: "/dashboard",
      label: "대시보드",
      icon: "📊",
      show: hasPermission(PERMISSIONS.DASHBOARD_READ),
    },
    {
      path: "/admins",
      label: "관리자 관리",
      icon: "👑",
      show: isSuperAdmin,
    },
    {
      path: "/users",
      label: "사용자 관리",
      icon: "👥",
      show: hasPermission(PERMISSIONS.USERS_READ),
    },
    {
      path: "/letters",
      label: "편지/사연 관리",
      icon: "✉️",
      show: hasPermission(PERMISSIONS.LETTERS_READ),
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <h1>Letter Admin</h1>
      </div>
      <nav className="sidebar__nav">
        {menuItems
          .filter((item) => item.show)
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}
```

---

## Header

```typescript
// src/components/layout/Header.tsx
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import "./Header.scss";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "최고 관리자",
  admin: "관리자",
  manager: "매니저",
};

export default function Header() {
  const { admin, logout } = useAuthStore();

  return (
    <header className="header">
      <div className="header__title">관리자 페이지</div>
      <div className="header__user">
        <span className="header__name">{admin?.name}</span>
        <span className="header__role">{ROLE_LABELS[admin?.role || ""]}</span>
        <Link to="/change-password" className="header__link">
          비밀번호 변경
        </Link>
        <button onClick={logout} className="header__logout">
          로그아웃
        </button>
      </div>
    </header>
  );
}
```

---

## React Query Hooks

```typescript
// src/hooks/useAdmins.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdmins, getAdminById, createAdmin, updateAdmin, deleteAdmin } from "../api/admins";
import type { AdminQueryParams, AdminRole, Permission } from "../types";

export const useAdmins = (params: AdminQueryParams) => {
  return useQuery({
    queryKey: ["admins", params],
    queryFn: () => getAdmins(params),
  });
};

export const useAdmin = (id: string) => {
  return useQuery({
    queryKey: ["admins", id],
    queryFn: () => getAdminById(id),
    enabled: !!id,
  });
};

export const useCreateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password: string; name: string; role?: AdminRole; permissions?: Permission[]; department?: string }) => createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });
};

export const useUpdateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateAdmin>[1] }) => updateAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });
};

export const useDeleteAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });
};
```

```typescript
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "../api/users";
import type { UserQueryParams } from "../types";

export const useUsers = (params: UserQueryParams) => {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => usersApi.getUsers(params),
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => usersApi.getUserById(id),
    enabled: !!id,
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => usersApi.banUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

export const useUnbanUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.unbanUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};
```

---

## 환경 변수

```env
# .env
VITE_API_URL=http://localhost:5001/api
```

---

## 구현 순서

1. 프로젝트 구조 설정 및 패키지 설치
2. 타입 정의 (`src/types/index.ts`)
3. API 클라이언트 설정 (`src/api/`)
4. Zustand 스토어 설정 (`src/stores/authStore.ts`)
5. 권한 Hook 및 컴포넌트 (`usePermission`, `PermissionGuard`)
6. 레이아웃 컴포넌트 (Sidebar, Header, AdminLayout)
7. 라우터 설정 (`src/App.tsx`)
8. 로그인 페이지
9. 대시보드 페이지
10. 관리자 관리 페이지 (Super Admin 전용)
11. 사용자 관리 페이지
12. 편지/사연 관리 페이지
13. 비밀번호 변경 페이지

---

## 권한 체계 요약

| Role          | 설명        | 접근 가능 메뉴                  |
| ------------- | ----------- | ------------------------------- |
| `super_admin` | 최고 관리자 | 모든 메뉴 + 관리자 관리         |
| `admin`       | 일반 관리자 | 대시보드, 사용자, 편지 (CRUD)   |
| `manager`     | 매니저      | 대시보드, 사용자, 편지 (조회만) |

---

## 참고

- 백엔드 Admin API 문서: `docs/ADMIN_BACKEND_PROMPT.md`
- Swagger 문서: `http://localhost:5001/api-docs`
