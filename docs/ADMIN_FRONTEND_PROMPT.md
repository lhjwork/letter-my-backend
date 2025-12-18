# Admin 프론트엔드 구현 프롬프트

## 개요

Letter My 서비스의 관리자(Admin) 프론트엔드를 구현합니다.

---

## API 엔드포인트

Base URL: `http://localhost:5001/api/admin`

### 인증

모든 Admin API는 Bearer Token 인증이 필요하며, Admin 권한이 있는 사용자만 접근 가능합니다.

```
Authorization: Bearer <token>
```

### 대시보드

| Method | Endpoint     | 설명          |
| ------ | ------------ | ------------- |
| GET    | `/dashboard` | 대시보드 통계 |

### 사용자 관리

| Method | Endpoint           | 설명        |
| ------ | ------------------ | ----------- |
| GET    | `/users`           | 사용자 목록 |
| GET    | `/users/:id`       | 사용자 상세 |
| PUT    | `/users/:id`       | 사용자 수정 |
| PUT    | `/users/:id/role`  | 역할 변경   |
| POST   | `/users/:id/ban`   | 사용자 정지 |
| POST   | `/users/:id/unban` | 정지 해제   |
| DELETE | `/users/:id`       | 사용자 삭제 |

### 편지/사연 관리

| Method | Endpoint              | 설명           |
| ------ | --------------------- | -------------- |
| GET    | `/letters`            | 편지/사연 목록 |
| GET    | `/letters/:id`        | 편지/사연 상세 |
| PUT    | `/letters/:id`        | 편지/사연 수정 |
| PUT    | `/letters/:id/status` | 상태 변경      |
| DELETE | `/letters/:id`        | 편지/사연 삭제 |

---

## 데이터 타입

```typescript
// 사용자 역할
type UserRole = "user" | "admin";

// 사용자 상태
type UserStatus = "active" | "banned" | "deleted";

// 편지 상태
type LetterStatus = "created" | "published" | "hidden" | "deleted";

// 편지 타입
type LetterType = "story" | "letter";

// 카테고리
type LetterCategory = "가족" | "사랑" | "우정" | "성장" | "위로" | "추억" | "감사" | "기타";

// 사용자
interface User {
  _id: string;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  status: UserStatus;
  oauthAccounts: OAuthAccount[];
  addresses: Address[];
  bannedAt?: string;
  bannedReason?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 편지/사연
interface Letter {
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

// 대시보드 통계
interface DashboardStats {
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

// 페이지네이션
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

---

## 페이지 구조

```
/admin
├── /dashboard              # 대시보드
├── /users                  # 사용자 목록
│   └── /[id]               # 사용자 상세
├── /letters                # 편지/사연 목록
│   └── /[id]               # 편지/사연 상세
└── /settings               # 설정 (선택)
```

---

## 구현해야 할 페이지

### 1. 대시보드 (`/admin/dashboard`)

**기능:**

- 전체 통계 카드 (사용자 수, 편지 수, 사연 수)
- 오늘/이번 주/이번 달 가입자 수
- 카테고리별 사연 분포 차트
- 최근 가입 사용자 목록
- 최근 작성된 편지/사연 목록

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│ 대시보드                                                     │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 전체 사용자 │ │ 전체 편지  │ │ 전체 사연  │ │ 오늘 가입  │        │
│ │   1,234   │ │    567   │ │    890   │ │    12    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ 카테고리별 사연 분포              │ 최근 가입 사용자            │
│ ┌─────────────────────────┐    │ ┌─────────────────────┐   │
│ │      [차트 영역]         │    │ │ 이한진 - 2분 전      │   │
│ │                         │    │ │ 홍길동 - 5분 전      │   │
│ └─────────────────────────┘    │ └─────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ 최근 편지/사연                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 제목          │ 작성자  │ 타입   │ 상태     │ 작성일      │ │
│ │ 엄마에게...    │ 이한진  │ 사연   │ 게시됨   │ 2분 전      │ │
│ │ 친구야 고마워  │ 홍길동  │ 편지   │ 작성됨   │ 5분 전      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. 사용자 관리 (`/admin/users`)

**기능:**

- 사용자 목록 테이블 (페이지네이션)
- 검색 (이름, 이메일)
- 필터 (역할, 상태)
- 정렬 (가입일, 이름)
- 사용자 정지/해제
- 역할 변경
- 사용자 삭제

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│ 사용자 관리                                                  │
├─────────────────────────────────────────────────────────────┤
│ 검색: [______________] 역할: [전체 ▼] 상태: [전체 ▼] [검색]   │
├─────────────────────────────────────────────────────────────┤
│ │ 이름    │ 이메일           │ 역할  │ 상태   │ 가입일    │ 액션 │
│ ├─────────┼─────────────────┼──────┼───────┼──────────┼─────┤
│ │ 이한진  │ han@example.com │ user │ active │ 2024-01-01│ ... │
│ │ 홍길동  │ hong@example.com│ admin│ active │ 2024-01-02│ ... │
│ │ 김철수  │ kim@example.com │ user │ banned │ 2024-01-03│ ... │
├─────────────────────────────────────────────────────────────┤
│                    < 1 2 3 4 5 >                            │
└─────────────────────────────────────────────────────────────┘
```

**액션 드롭다운:**

- 상세 보기
- 역할 변경 (user ↔ admin)
- 정지 / 정지 해제
- 삭제

### 3. 사용자 상세 (`/admin/users/[id]`)

**기능:**

- 사용자 기본 정보
- OAuth 연동 정보
- 배송지 목록
- 작성한 편지/사연 목록
- 활동 로그 (선택)

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│ ← 사용자 상세                              [역할 변경] [정지] │
├─────────────────────────────────────────────────────────────┤
│ 기본 정보                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 이름: 이한진                                             │ │
│ │ 이메일: han@example.com                                  │ │
│ │ 역할: user                                               │ │
│ │ 상태: active                                             │ │
│ │ 가입일: 2024-01-01                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ OAuth 연동                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ 카카오 연동됨                                         │ │
│ │ ✅ 네이버 연동됨                                         │ │
│ │ ❌ 인스타그램 미연동                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 작성한 편지/사연 (5개)                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 제목          │ 타입   │ 상태     │ 작성일               │ │
│ │ 엄마에게...    │ 사연   │ 게시됨   │ 2024-01-15          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4. 편지/사연 관리 (`/admin/letters`)

**기능:**

- 편지/사연 목록 테이블 (페이지네이션)
- 검색 (제목, 내용, 작성자)
- 필터 (타입, 카테고리, 상태)
- 정렬 (작성일, 조회수, 좋아요)
- 상태 변경 (게시/숨김)
- 삭제

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│ 편지/사연 관리                                               │
├─────────────────────────────────────────────────────────────┤
│ 검색: [______________] 타입: [전체 ▼] 카테고리: [전체 ▼]      │
│ 상태: [전체 ▼]                                    [검색]     │
├─────────────────────────────────────────────────────────────┤
│ │ 제목      │ 작성자 │ 타입 │ 카테고리│ 상태  │ 조회 │ 작성일 │ 액션│
│ ├──────────┼───────┼─────┼───────┼──────┼─────┼──────┼────┤
│ │ 엄마에게..│ 이한진 │ 사연 │ 가족   │ 게시됨│ 123 │ 01-15│ ... │
│ │ 친구야... │ 홍길동 │ 편지 │ 우정   │ 숨김  │ 45  │ 01-14│ ... │
├─────────────────────────────────────────────────────────────┤
│                    < 1 2 3 4 5 >                            │
└─────────────────────────────────────────────────────────────┘
```

### 5. 편지/사연 상세 (`/admin/letters/[id]`)

**기능:**

- 편지/사연 전체 내용
- 작성자 정보
- OG 이미지 미리보기
- 상태 변경
- 수정/삭제

---

## 컴포넌트 구조

```
src/
├── app/
│   └── admin/
│       ├── layout.tsx              # Admin 레이아웃 (사이드바)
│       ├── page.tsx                # 리다이렉트 → dashboard
│       ├── dashboard/
│       │   └── page.tsx
│       ├── users/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       └── letters/
│           ├── page.tsx
│           └── [id]/
│               └── page.tsx
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx        # 사이드바 네비게이션
│       ├── AdminHeader.tsx         # 헤더
│       ├── StatsCard.tsx           # 통계 카드
│       ├── DataTable.tsx           # 데이터 테이블
│       ├── UserActions.tsx         # 사용자 액션 드롭다운
│       ├── LetterActions.tsx       # 편지 액션 드롭다운
│       ├── BanUserModal.tsx        # 사용자 정지 모달
│       ├── ChangeRoleModal.tsx     # 역할 변경 모달
│       └── ChangeStatusModal.tsx   # 상태 변경 모달
├── hooks/
│   └── admin/
│       ├── useDashboard.ts
│       ├── useAdminUsers.ts
│       └── useAdminLetters.ts
└── api/
    └── admin.ts                    # Admin API 클라이언트
```

---

## API 클라이언트

```typescript
// api/admin.ts
import axios from "axios";

const adminApi = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/admin`,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 대시보드
export const getDashboard = () => adminApi.get("/dashboard");

// 사용자 관리
export const getUsers = (params: UserQueryParams) => adminApi.get("/users", { params });
export const getUserById = (id: string) => adminApi.get(`/users/${id}`);
export const updateUser = (id: string, data: Partial<User>) => adminApi.put(`/users/${id}`, data);
export const updateUserRole = (id: string, role: UserRole) => adminApi.put(`/users/${id}/role`, { role });
export const banUser = (id: string, reason: string) => adminApi.post(`/users/${id}/ban`, { reason });
export const unbanUser = (id: string) => adminApi.post(`/users/${id}/unban`);
export const deleteUser = (id: string) => adminApi.delete(`/users/${id}`);

// 편지 관리
export const getLetters = (params: LetterQueryParams) => adminApi.get("/letters", { params });
export const getLetterById = (id: string) => adminApi.get(`/letters/${id}`);
export const updateLetter = (id: string, data: Partial<Letter>) => adminApi.put(`/letters/${id}`, data);
export const updateLetterStatus = (id: string, status: LetterStatus, reason?: string) => adminApi.put(`/letters/${id}/status`, { status, reason });
export const deleteLetter = (id: string) => adminApi.delete(`/letters/${id}`);
```

---

## React Query Hooks

```typescript
// hooks/admin/useDashboard.ts
export const useDashboard = () => {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => getDashboard().then((res) => res.data.data),
  });
};

// hooks/admin/useAdminUsers.ts
export const useAdminUsers = (params: UserQueryParams) => {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => getUsers(params).then((res) => res.data),
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => banUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

// hooks/admin/useAdminLetters.ts
export const useAdminLetters = (params: LetterQueryParams) => {
  return useQuery({
    queryKey: ["admin", "letters", params],
    queryFn: () => getLetters(params).then((res) => res.data),
  });
};
```

---

## Admin 레이아웃

```tsx
// app/admin/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## 권한 체크

Admin 페이지 접근 시 권한 체크:

```tsx
// hooks/useAdminAuth.ts
export const useAdminAuth = () => {
  const { data: user, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  return { user, isLoading, isAdmin: user?.role === "admin" };
};
```

---

## 참고

- 백엔드 Admin API 문서: `docs/ADMIN_BACKEND_PROMPT.md`
- Swagger 문서: `http://localhost:5001/api-docs`
