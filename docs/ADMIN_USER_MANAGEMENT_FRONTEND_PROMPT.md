# 어드민 사용자 관리 프론트엔드 구현 프롬프트

## 개요

Letter My 서비스의 어드민을 위한 사용자 관리 프론트엔드를 구현합니다.
사용자 목록 조회, 검색, 상세 정보 확인, 작성한 사연/답장 관리 기능을 제공합니다.

---

## 1. API 엔드포인트 (백엔드 연동)

### 기본 URL: `http://localhost:5001/api/admin/users`

| Method | Endpoint                           | 설명                            |
| ------ | ---------------------------------- | ------------------------------- |
| GET    | `/api/admin/users`                 | 사용자 목록 조회 (페이지네이션) |
| GET    | `/api/admin/users/search`          | 사용자 검색                     |
| GET    | `/api/admin/users/:userId`         | 사용자 상세 정보 조회           |
| GET    | `/api/admin/users/:userId/letters` | 사용자 작성 편지 목록           |
| GET    | `/api/admin/users/:userId/stats`   | 사용자 통계 정보                |
| PUT    | `/api/admin/users/:userId/status`  | 사용자 상태 변경                |
| DELETE | `/api/admin/users/:userId`         | 사용자 삭제                     |

---

## 2. 타입 정의

### `types/adminUser.ts`

```typescript
// 사용자 기본 정보
export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  status: "active" | "inactive" | "deleted";
  createdAt: string;
  updatedAt: string;
  letterCount: number;
  addresses?: Address[];
  oauthProviders?: {
    provider: string;
    providerId: string;
  }[];
}

// 사용자 통계
export interface UserStats {
  totalLetters: number;
  totalStories: number;
  totalViews: number;
  totalLikes: number;
  joinedAt: string;
  lastActiveAt?: string;
}

// 사용자 상세 정보 (통계 포함)
export interface UserDetail extends AdminUser {
  stats: UserStats;
}

// 사용자 목록 응답
export interface UserListResponse {
  success: boolean;
  data: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// 사용자 편지 목록 응답
export interface UserLettersResponse {
  success: boolean;
  data: Letter[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// 검색 결과
export interface UserSearchResult {
  _id: string;
  name: string;
  email: string;
  image?: string;
  status: string;
  createdAt: string;
}

// 대시보드 통계
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  recentUsers: {
    _id: string;
    name: string;
    email: string;
    createdAt: string;
  }[];
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
```

---

## 3. API 서비스

### `services/adminUserService.ts`

```typescript
import { apiClient } from "./apiClient";
import { AdminUser, UserDetail, UserStats, UserListResponse, UserLettersResponse, UserSearchResult, DashboardStats, ApiResponse } from "../types/adminUser";

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "createdAt" | "name" | "letterCount";
  sortOrder?: "asc" | "desc";
  status?: "active" | "inactive" | "all";
}

class AdminUserService {
  // 사용자 목록 조회
  async getUserList(params: UserListParams = {}): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/admin/users?${queryParams.toString()}`);
    return response.data;
  }

  // 사용자 검색
  async searchUsers(searchTerm: string, limit: number = 10): Promise<ApiResponse<UserSearchResult[]>> {
    const response = await apiClient.get(`/admin/users/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}`);
    return response.data;
  }

  // 사용자 상세 정보 조회
  async getUserDetail(userId: string): Promise<ApiResponse<UserDetail>> {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  }

  // 사용자 통계 정보
  async getUserStats(userId: string): Promise<ApiResponse<UserStats>> {
    const response = await apiClient.get(`/admin/users/${userId}/stats`);
    return response.data;
  }

  // 사용자 편지 목록
  async getUserLetters(userId: string, page: number = 1, limit: number = 20): Promise<UserLettersResponse> {
    const response = await apiClient.get(`/admin/users/${userId}/letters?page=${page}&limit=${limit}`);
    return response.data;
  }

  // 사용자 상태 변경
  async updateUserStatus(userId: string, status: "active" | "inactive"): Promise<ApiResponse<AdminUser>> {
    const response = await apiClient.put(`/admin/users/${userId}/status`, { status });
    return response.data;
  }

  // 사용자 삭제
  async deleteUser(userId: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  }

  // 대시보드 통계
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await apiClient.get("/admin/users/dashboard-stats");
    return response.data;
  }
}

export const adminUserService = new AdminUserService();
```

---

## 4. React Query Hooks

### `hooks/useAdminUser.ts`

```typescript
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { adminUserService, UserListParams } from "../services/adminUserService";
import { toast } from "react-hot-toast";

// 사용자 목록 조회
export const useUserList = (params: UserListParams) => {
  return useQuery({
    queryKey: ["adminUsers", params],
    queryFn: () => adminUserService.getUserList(params),
    keepPreviousData: true,
  });
};

// 사용자 목록 무한 스크롤
export const useUserListInfinite = (params: Omit<UserListParams, "page">) => {
  return useInfiniteQuery({
    queryKey: ["adminUsersInfinite", params],
    queryFn: ({ pageParam = 1 }) => adminUserService.getUserList({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
};

// 사용자 검색
export const useUserSearch = (searchTerm: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["adminUserSearch", searchTerm],
    queryFn: () => adminUserService.searchUsers(searchTerm),
    enabled: enabled && searchTerm.length > 0,
    staleTime: 30000, // 30초
  });
};

// 사용자 상세 정보
export const useUserDetail = (userId: string) => {
  return useQuery({
    queryKey: ["adminUserDetail", userId],
    queryFn: () => adminUserService.getUserDetail(userId),
    enabled: !!userId,
  });
};

// 사용자 통계
export const useUserStats = (userId: string) => {
  return useQuery({
    queryKey: ["adminUserStats", userId],
    queryFn: () => adminUserService.getUserStats(userId),
    enabled: !!userId,
  });
};

// 사용자 편지 목록
export const useUserLetters = (userId: string, page: number = 1) => {
  return useQuery({
    queryKey: ["adminUserLetters", userId, page],
    queryFn: () => adminUserService.getUserLetters(userId, page),
    enabled: !!userId,
    keepPreviousData: true,
  });
};

// 사용자 편지 목록 무한 스크롤
export const useUserLettersInfinite = (userId: string) => {
  return useInfiniteQuery({
    queryKey: ["adminUserLettersInfinite", userId],
    queryFn: ({ pageParam = 1 }) => adminUserService.getUserLetters(userId, pageParam),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!userId,
  });
};

// 사용자 상태 변경
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "active" | "inactive" }) => adminUserService.updateUserStatus(userId, status),
    onSuccess: (data, variables) => {
      toast.success(data.message || "사용자 상태가 변경되었습니다");
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminUserDetail", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboardStats"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "상태 변경에 실패했습니다");
    },
  });
};

// 사용자 삭제
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.deleteUser(userId),
    onSuccess: (data) => {
      toast.success(data.message || "사용자가 삭제되었습니다");
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboardStats"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "사용자 삭제에 실패했습니다");
    },
  });
};

// 대시보드 통계
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["adminDashboardStats"],
    queryFn: () => adminUserService.getDashboardStats(),
    refetchInterval: 5 * 60 * 1000, // 5분마다 갱신
  });
};
```

---

## 5. 컴포넌트 구현

### 5.1 사용자 목록 컴포넌트

#### `components/admin/UserList.tsx`

```tsx
import React, { useState } from "react";
import { useUserList } from "../../hooks/useAdminUser";
import { UserListParams } from "../../services/adminUserService";
import { UserCard } from "./UserCard";
import { UserListFilters } from "./UserListFilters";
import { Pagination } from "../ui/Pagination";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { EmptyState } from "../ui/EmptyState";
import { Users, Search } from "lucide-react";

export const UserList: React.FC = () => {
  const [params, setParams] = useState<UserListParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    status: "all",
  });

  const { data, isLoading, error } = useUserList(params);

  const handleParamsChange = (newParams: Partial<UserListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">사용자 목록을 불러오는데 실패했습니다.</div>;
  }

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        </div>
        <div className="text-sm text-gray-500">총 {pagination?.total || 0}명</div>
      </div>

      {/* 필터 */}
      <UserListFilters params={params} onParamsChange={handleParamsChange} />

      {/* 사용자 목록 */}
      {users.length === 0 ? (
        <EmptyState icon={Search} title="사용자가 없습니다" description="검색 조건을 변경해보세요." />
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <UserCard key={user._id} user={user} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {pagination && pagination.totalPages > 1 && <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} />}
    </div>
  );
};
```

### 5.2 사용자 카드 컴포넌트

#### `components/admin/UserCard.tsx`

```tsx
import React from "react";
import { Link } from "react-router-dom";
import { AdminUser } from "../../types/adminUser";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useUpdateUserStatus, useDeleteUser } from "../../hooks/useAdminUser";
import { Mail, Calendar, FileText, Eye, MoreVertical, UserCheck, UserX, Trash2 } from "lucide-react";
import { DropdownMenu } from "../ui/DropdownMenu";

interface UserCardProps {
  user: AdminUser;
}

export const UserCard: React.FC<UserCardProps> = ({ user }) => {
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();

  const handleStatusChange = (status: "active" | "inactive") => {
    updateStatusMutation.mutate({ userId: user._id, status });
  };

  const handleDelete = () => {
    if (window.confirm("정말로 이 사용자를 삭제하시겠습니까?")) {
      deleteUserMutation.mutate(user._id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "green";
      case "inactive":
        return "yellow";
      case "deleted":
        return "red";
      default:
        return "gray";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "활성";
      case "inactive":
        return "비활성";
      case "deleted":
        return "삭제됨";
      default:
        return status;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        {/* 사용자 기본 정보 */}
        <div className="flex items-start space-x-4">
          <Avatar src={user.image} alt={user.name} fallback={user.name.charAt(0)} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Link to={`/admin/users/${user._id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {user.name}
              </Link>
              <Badge color={getStatusColor(user.status)}>{getStatusText(user.status)}</Badge>
            </div>

            <div className="flex items-center space-x-1 text-sm text-gray-500 mb-2">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>가입: {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>편지: {user.letterCount}개</span>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 메뉴 */}
        <DropdownMenu
          trigger={
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
        >
          <div className="py-1">
            <Link to={`/admin/users/${user._id}`} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <Eye className="h-4 w-4 mr-2" />
              상세 보기
            </Link>

            {user.status === "active" ? (
              <button onClick={() => handleStatusChange("inactive")} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" disabled={updateStatusMutation.isPending}>
                <UserX className="h-4 w-4 mr-2" />
                비활성화
              </button>
            ) : (
              <button onClick={() => handleStatusChange("active")} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" disabled={updateStatusMutation.isPending}>
                <UserCheck className="h-4 w-4 mr-2" />
                활성화
              </button>
            )}

            <button onClick={handleDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50" disabled={deleteUserMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </button>
          </div>
        </DropdownMenu>
      </div>
    </div>
  );
};
```

### 5.3 사용자 상세 페이지

#### `pages/admin/UserDetailPage.tsx`

```tsx
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useUserDetail, useUserLettersInfinite } from "../../hooks/useAdminUser";
import { useInView } from "react-intersection-observer";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { LetterCard } from "../../components/LetterCard";
import { ArrowLeft, Mail, Calendar, FileText, Eye, Heart, MapPin, ExternalLink } from "lucide-react";

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<"info" | "letters">("info");

  const { data: userDetail, isLoading: userLoading } = useUserDetail(userId!);
  const { data: lettersData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: lettersLoading } = useUserLettersInfinite(userId!);

  const { ref, inView } = useInView();

  React.useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (userLoading) {
    return <LoadingSpinner />;
  }

  if (!userDetail?.data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">사용자를 찾을 수 없습니다.</p>
        <Link to="/admin/users" className="text-blue-500 hover:underline mt-2 inline-block">
          사용자 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const user = userDetail.data;
  const allLetters = lettersData?.pages.flatMap((page) => page.data) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "green";
      case "inactive":
        return "yellow";
      case "deleted":
        return "red";
      default:
        return "gray";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "활성";
      case "inactive":
        return "비활성";
      case "deleted":
        return "삭제됨";
      default:
        return status;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center space-x-4">
        <Link to="/admin/users" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">사용자 상세</h1>
      </div>

      {/* 사용자 기본 정보 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start space-x-6">
          <Avatar src={user.image} alt={user.name} fallback={user.name.charAt(0)} size="xl" />

          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <Badge color={getStatusColor(user.status)}>{getStatusText(user.status)}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>가입: {new Date(user.stats.joinedAt).toLocaleDateString()}</span>
              </div>
              {user.stats.lastActiveAt && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>최근 활동: {new Date(user.stats.lastActiveAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{user.stats.totalLetters}</div>
          <div className="text-sm text-gray-500">총 편지</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <FileText className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{user.stats.totalStories}</div>
          <div className="text-sm text-gray-500">사연</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <Eye className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{user.stats.totalViews}</div>
          <div className="text-sm text-gray-500">총 조회수</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{user.stats.totalLikes}</div>
          <div className="text-sm text-gray-500">총 좋아요</div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "info" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            상세 정보
          </button>
          <button
            onClick={() => setActiveTab("letters")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "letters" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            작성한 편지 ({user.stats.totalLetters})
          </button>
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "info" && (
        <div className="space-y-6">
          {/* 배송지 정보 */}
          {user.addresses && user.addresses.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                배송지 정보
              </h3>
              <div className="space-y-3">
                {user.addresses.map((address, index) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{address.name}</span>
                      {address.isDefault && (
                        <Badge color="blue" size="sm">
                          기본 배송지
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {address.address} {address.detailAddress}
                    </p>
                    <p className="text-sm text-gray-500">
                      {address.recipientName} | {address.recipientPhone}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OAuth 연동 정보 */}
          {user.oauthProviders && user.oauthProviders.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ExternalLink className="h-5 w-5 mr-2" />
                연동된 계정
              </h3>
              <div className="space-y-2">
                {user.oauthProviders.map((provider, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Badge color="gray">{provider.provider}</Badge>
                    <span className="text-sm text-gray-600">{provider.providerId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "letters" && (
        <div className="space-y-4">
          {lettersLoading ? (
            <LoadingSpinner />
          ) : allLetters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">작성한 편지가 없습니다.</div>
          ) : (
            <>
              {allLetters.map((letter) => (
                <LetterCard key={letter._id} letter={letter} showAuthor={false} />
              ))}

              {/* 무한 스크롤 트리거 */}
              {hasNextPage && (
                <div ref={ref} className="flex justify-center py-4">
                  {isFetchingNextPage && <LoadingSpinner />}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
```

### 5.4 사용자 검색 컴포넌트

#### `components/admin/UserSearch.tsx`

```tsx
import React, { useState, useRef, useEffect } from "react";
import { useUserSearch } from "../../hooks/useAdminUser";
import { useDebounce } from "../../hooks/useDebounce";
import { Link } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Search, X } from "lucide-react";

export const UserSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading } = useUserSearch(debouncedSearchTerm, debouncedSearchTerm.length > 0);

  // 외부 클릭 시 검색 결과 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleClear = () => {
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setSearchTerm("");
  };

  const results = searchResults?.data || [];

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="사용자 검색 (이름, 이메일)"
          value={searchTerm}
          onChange={handleInputChange}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchTerm && (
          <button onClick={handleClear} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {isOpen && debouncedSearchTerm && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">검색 중...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">검색 결과가 없습니다.</div>
          ) : (
            <div className="py-2">
              {results.map((user) => (
                <Link key={user._id} to={`/admin/users/${user._id}`} onClick={handleResultClick} className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <Avatar src={user.image} alt={user.name} fallback={user.name.charAt(0)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{user.name}</span>
                      <Badge color={user.status === "active" ? "green" : "yellow"} size="sm">
                        {user.status === "active" ? "활성" : "비활성"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 6. 라우팅 설정

### `App.tsx` 또는 라우터 설정

```tsx
import { Routes, Route } from "react-router-dom";
import { UserList } from "./components/admin/UserList";
import { UserDetailPage } from "./pages/admin/UserDetailPage";

// 어드민 라우트 추가
<Routes>
  {/* 기존 라우트들... */}

  {/* 어드민 사용자 관리 라우트 */}
  <Route path="/admin/users" element={<UserList />} />
  <Route path="/admin/users/:userId" element={<UserDetailPage />} />
</Routes>;
```

---

## 7. 사용 예시

### 어드민 네비게이션에 추가

```tsx
// AdminNavigation.tsx
import { Users, Search } from "lucide-react";
import { UserSearch } from "./UserSearch";

export const AdminNavigation = () => {
  return (
    <nav className="space-y-4">
      {/* 검색 */}
      <UserSearch />

      {/* 메뉴 */}
      <Link to="/admin/users" className="nav-link">
        <Users className="h-5 w-5" />
        사용자 관리
      </Link>
    </nav>
  );
};
```

---

## 8. 스타일링 (Tailwind CSS)

### 주요 스타일 클래스

```css
/* 사용자 카드 */
.user-card {
  @apply bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow;
}

/* 상태 배지 */
.status-badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.status-active {
  @apply bg-green-100 text-green-800;
}

.status-inactive {
  @apply bg-yellow-100 text-yellow-800;
}

/* 통계 카드 */
.stats-card {
  @apply bg-white border border-gray-200 rounded-lg p-4 text-center;
}

/* 검색 드롭다운 */
.search-dropdown {
  @apply absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50;
}
```

---

## 구현 순서

1. **타입 정의** (`types/adminUser.ts`)
2. **API 서비스** (`services/adminUserService.ts`)
3. **React Query Hooks** (`hooks/useAdminUser.ts`)
4. **기본 컴포넌트들** (UserCard, UserSearch)
5. **사용자 목록 페이지** (UserList)
6. **사용자 상세 페이지** (UserDetailPage)
7. **라우팅 설정**
8. **어드민 네비게이션에 통합**
9. **테스트 및 최적화**

이 구현을 통해 어드민이 효율적으로 사용자를 관리하고 모니터링할 수 있습니다!
