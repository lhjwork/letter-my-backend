# 팔로우/팔로잉 기능 프론트엔드 구현 프롬프트

## 개요

Letter My 서비스에 사용자 간 팔로우/팔로잉 기능을 구현합니다.
사용자들이 서로를 팔로우하여 관심있는 작성자의 새 글을 쉽게 확인할 수 있습니다.

---

## 1. API 엔드포인트 (백엔드 연동)

### 기본 URL: `http://localhost:5001/api/follow`

| Method | Endpoint                        | 설명                                   |
| ------ | ------------------------------- | -------------------------------------- |
| POST   | `/api/follow/:followingId`      | 사용자 팔로우                          |
| DELETE | `/api/follow/:followingId`      | 사용자 언팔로우                        |
| GET    | `/api/follow/status/:userId`    | 팔로우 상태 확인                       |
| GET    | `/api/follow/followers/:userId` | 특정 사용자 팔로워 목록                |
| GET    | `/api/follow/following/:userId` | 특정 사용자 팔로잉 목록                |
| GET    | `/api/follow/my/followers`      | 내 팔로워 목록                         |
| GET    | `/api/follow/my/following`      | 내 팔로잉 목록                         |
| GET    | `/api/follow/stats/:userId`     | 사용자 팔로우 통계                     |
| GET    | `/api/follow/feed`              | 팔로잉 피드 (팔로우하는 사용자들의 글) |

---

## 2. 타입 정의

### `types/follow.ts`

```typescript
// 팔로우 관계
export interface Follow {
  _id: string;
  followerId: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  followingId: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  createdAt: string;
}

// 팔로우 통계
export interface FollowStats {
  followerCount: number;
  followingCount: number;
}

// 팔로우 상태
export interface FollowStatus {
  isFollowing: boolean;
}

// 페이지네이션 응답
export interface FollowListResponse {
  success: boolean;
  data: Follow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 팔로잉 피드 (편지 목록)
export interface FollowingFeedResponse {
  success: boolean;
  data: Letter[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

### `services/followService.ts`

```typescript
import { apiClient } from "./apiClient";
import { Follow, FollowStats, FollowStatus, FollowListResponse, FollowingFeedResponse, ApiResponse } from "../types/follow";

class FollowService {
  // 사용자 팔로우
  async followUser(followingId: string): Promise<ApiResponse<Follow>> {
    const response = await apiClient.post(`/follow/${followingId}`);
    return response.data;
  }

  // 사용자 언팔로우
  async unfollowUser(followingId: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/follow/${followingId}`);
    return response.data;
  }

  // 팔로우 상태 확인
  async checkFollowStatus(userId: string): Promise<ApiResponse<FollowStatus>> {
    const response = await apiClient.get(`/follow/status/${userId}`);
    return response.data;
  }

  // 특정 사용자의 팔로워 목록
  async getFollowers(userId: string, page = 1, limit = 20): Promise<FollowListResponse> {
    const response = await apiClient.get(`/follow/followers/${userId}?page=${page}&limit=${limit}`);
    return response.data;
  }

  // 특정 사용자의 팔로잉 목록
  async getFollowing(userId: string, page = 1, limit = 20): Promise<FollowListResponse> {
    const response = await apiClient.get(`/follow/following/${userId}?page=${page}&limit=${limit}`);
    return response.data;
  }

  // 내 팔로워 목록
  async getMyFollowers(page = 1, limit = 20): Promise<FollowListResponse> {
    const response = await apiClient.get(`/follow/my/followers?page=${page}&limit=${limit}`);
    return response.data;
  }

  // 내 팔로잉 목록
  async getMyFollowing(page = 1, limit = 20): Promise<FollowListResponse> {
    const response = await apiClient.get(`/follow/my/following?page=${page}&limit=${limit}`);
    return response.data;
  }

  // 사용자 팔로우 통계
  async getUserStats(userId: string): Promise<ApiResponse<FollowStats>> {
    const response = await apiClient.get(`/follow/stats/${userId}`);
    return response.data;
  }

  // 팔로잉 피드 (팔로우하는 사용자들의 글)
  async getFollowingFeed(page = 1, limit = 20): Promise<FollowingFeedResponse> {
    const response = await apiClient.get(`/follow/feed?page=${page}&limit=${limit}`);
    return response.data;
  }
}

export const followService = new FollowService();
```

---

## 4. React Query Hooks

### `hooks/useFollow.ts`

```typescript
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { followService } from "../services/followService";
import { toast } from "react-hot-toast";

// 팔로우/언팔로우 뮤테이션
export const useFollowMutation = () => {
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: (followingId: string) => followService.followUser(followingId),
    onSuccess: (data) => {
      toast.success(data.message || "팔로우했습니다");
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["followStatus"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
      queryClient.invalidateQueries({ queryKey: ["myFollowing"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "팔로우에 실패했습니다");
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (followingId: string) => followService.unfollowUser(followingId),
    onSuccess: (data) => {
      toast.success(data.message || "언팔로우했습니다");
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["followStatus"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
      queryClient.invalidateQueries({ queryKey: ["myFollowing"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "언팔로우에 실패했습니다");
    },
  });

  return {
    followUser: followMutation.mutate,
    unfollowUser: unfollowMutation.mutate,
    isFollowLoading: followMutation.isPending,
    isUnfollowLoading: unfollowMutation.isPending,
  };
};

// 팔로우 상태 조회
export const useFollowStatus = (userId: string) => {
  return useQuery({
    queryKey: ["followStatus", userId],
    queryFn: () => followService.checkFollowStatus(userId),
    enabled: !!userId,
  });
};

// 사용자 팔로우 통계
export const useUserStats = (userId: string) => {
  return useQuery({
    queryKey: ["userStats", userId],
    queryFn: () => followService.getUserStats(userId),
    enabled: !!userId,
  });
};

// 팔로워 목록 (무한 스크롤)
export const useFollowers = (userId: string) => {
  return useInfiniteQuery({
    queryKey: ["followers", userId],
    queryFn: ({ pageParam = 1 }) => followService.getFollowers(userId, pageParam, 20),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!userId,
  });
};

// 팔로잉 목록 (무한 스크롤)
export const useFollowing = (userId: string) => {
  return useInfiniteQuery({
    queryKey: ["following", userId],
    queryFn: ({ pageParam = 1 }) => followService.getFollowing(userId, pageParam, 20),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!userId,
  });
};

// 내 팔로워 목록
export const useMyFollowers = () => {
  return useInfiniteQuery({
    queryKey: ["myFollowers"],
    queryFn: ({ pageParam = 1 }) => followService.getMyFollowers(pageParam, 20),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
};

// 내 팔로잉 목록
export const useMyFollowing = () => {
  return useInfiniteQuery({
    queryKey: ["myFollowing"],
    queryFn: ({ pageParam = 1 }) => followService.getMyFollowing(pageParam, 20),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
};

// 팔로잉 피드 (무한 스크롤)
export const useFollowingFeed = () => {
  return useInfiniteQuery({
    queryKey: ["followingFeed"],
    queryFn: ({ pageParam = 1 }) => followService.getFollowingFeed(pageParam, 20),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
};
```

---

## 5. 컴포넌트 구현

### 5.1 팔로우 버튼 컴포넌트

#### `components/FollowButton.tsx`

```tsx
import React from "react";
import { useFollowMutation, useFollowStatus } from "../hooks/useFollow";
import { Button } from "./ui/Button";
import { Loader2, UserPlus, UserMinus } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ userId, className }) => {
  const { data: followStatus, isLoading: statusLoading } = useFollowStatus(userId);
  const { followUser, unfollowUser, isFollowLoading, isUnfollowLoading } = useFollowMutation();

  const isFollowing = followStatus?.data?.isFollowing || false;
  const isLoading = statusLoading || isFollowLoading || isUnfollowLoading;

  const handleClick = () => {
    if (isFollowing) {
      unfollowUser(userId);
    } else {
      followUser(userId);
    }
  };

  return (
    <Button onClick={handleClick} disabled={isLoading} variant={isFollowing ? "outline" : "default"} size="sm" className={className}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          언팔로우
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          팔로우
        </>
      )}
    </Button>
  );
};
```

### 5.2 사용자 통계 컴포넌트

#### `components/UserStats.tsx`

```tsx
import React from "react";
import { useUserStats } from "../hooks/useFollow";
import { Users, UserCheck } from "lucide-react";

interface UserStatsProps {
  userId: string;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export const UserStats: React.FC<UserStatsProps> = ({ userId, onFollowersClick, onFollowingClick }) => {
  const { data: stats, isLoading } = useUserStats(userId);

  if (isLoading) {
    return (
      <div className="flex space-x-4">
        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex space-x-6">
      <button onClick={onFollowersClick} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
        <Users className="h-4 w-4" />
        <span className="text-sm">
          팔로워 <span className="font-semibold">{stats?.data?.followerCount || 0}</span>
        </span>
      </button>

      <button onClick={onFollowingClick} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
        <UserCheck className="h-4 w-4" />
        <span className="text-sm">
          팔로잉 <span className="font-semibold">{stats?.data?.followingCount || 0}</span>
        </span>
      </button>
    </div>
  );
};
```

### 5.3 팔로워/팔로잉 목록 컴포넌트

#### `components/FollowList.tsx`

```tsx
import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { followService } from "../services/followService";
import { FollowButton } from "./FollowButton";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { Loader2 } from "lucide-react";

interface FollowListProps {
  userId: string;
  type: "followers" | "following";
}

export const FollowList: React.FC<FollowListProps> = ({ userId, type }) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: [type, userId],
    queryFn: ({ pageParam = 1 }) => (type === "followers" ? followService.getFollowers(userId, pageParam, 20) : followService.getFollowing(userId, pageParam, 20)),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!userId,
  });

  const { ref, inView } = useInView();

  React.useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">목록을 불러오는데 실패했습니다.</div>;
  }

  const allUsers = data?.pages.flatMap((page) => page.data) || [];

  if (allUsers.length === 0) {
    return <div className="text-center py-8 text-gray-500">{type === "followers" ? "팔로워가" : "팔로잉이"} 없습니다.</div>;
  }

  return (
    <div className="space-y-4">
      {allUsers.map((follow) => {
        const user = type === "followers" ? follow.followerId : follow.followingId;

        return (
          <div key={follow._id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Avatar src={user.image} alt={user.name} fallback={user.name.charAt(0)} size="md" />
              <div>
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <FollowButton userId={user._id} />
          </div>
        );
      })}

      {/* 무한 스크롤 트리거 */}
      {hasNextPage && (
        <div ref={ref} className="flex justify-center py-4">
          {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin" />}
        </div>
      )}
    </div>
  );
};
```

### 5.4 팔로잉 피드 컴포넌트

#### `components/FollowingFeed.tsx`

```tsx
import React from "react";
import { useFollowingFeed } from "../hooks/useFollow";
import { useInView } from "react-intersection-observer";
import { LetterCard } from "./LetterCard";
import { Loader2, Heart } from "lucide-react";

export const FollowingFeed: React.FC = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useFollowingFeed();

  const { ref, inView } = useInView();

  React.useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">피드를 불러오는데 실패했습니다.</div>;
  }

  const allLetters = data?.pages.flatMap((page) => page.data) || [];

  if (allLetters.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">팔로잉 피드가 비어있습니다</h3>
        <p className="text-gray-500">관심있는 작성자를 팔로우하여 새로운 글을 받아보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Heart className="h-5 w-5 text-pink-500" />
        <h2 className="text-xl font-semibold">팔로잉 피드</h2>
      </div>

      {allLetters.map((letter) => (
        <LetterCard key={letter._id} letter={letter} showAuthor />
      ))}

      {/* 무한 스크롤 트리거 */}
      {hasNextPage && (
        <div ref={ref} className="flex justify-center py-4">
          {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin" />}
        </div>
      )}
    </div>
  );
};
```

---

## 6. 페이지 구현

### 6.1 팔로워/팔로잉 목록 페이지

#### `pages/FollowPage.tsx`

```tsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { FollowList } from "../components/FollowList";
import { UserStats } from "../components/UserStats";
import { Button } from "../components/ui/Button";

export const FollowPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<"followers" | "following">("followers");

  if (!userId) {
    return <div>사용자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* 사용자 통계 */}
      <div className="mb-6">
        <UserStats userId={userId} />
      </div>

      {/* 탭 버튼 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <Button variant={activeTab === "followers" ? "default" : "ghost"} onClick={() => setActiveTab("followers")} className="flex-1">
          팔로워
        </Button>
        <Button variant={activeTab === "following" ? "default" : "ghost"} onClick={() => setActiveTab("following")} className="flex-1">
          팔로잉
        </Button>
      </div>

      {/* 목록 */}
      <FollowList userId={userId} type={activeTab} />
    </div>
  );
};
```

### 6.2 내 팔로우 관리 페이지

#### `pages/MyFollowPage.tsx`

```tsx
import React, { useState } from "react";
import { useMyFollowers, useMyFollowing } from "../hooks/useFollow";
import { useInView } from "react-intersection-observer";
import { FollowButton } from "../components/FollowButton";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Loader2, Users, UserCheck } from "lucide-react";

export const MyFollowPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"followers" | "following">("followers");

  const followersQuery = useMyFollowers();
  const followingQuery = useMyFollowing();

  const activeQuery = activeTab === "followers" ? followersQuery : followingQuery;
  const { ref, inView } = useInView();

  React.useEffect(() => {
    if (inView && activeQuery.hasNextPage) {
      activeQuery.fetchNextPage();
    }
  }, [inView, activeQuery.hasNextPage, activeQuery.fetchNextPage]);

  const allUsers = activeQuery.data?.pages.flatMap((page) => page.data) || [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">팔로우 관리</h1>

      {/* 탭 버튼 */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <Button variant={activeTab === "followers" ? "default" : "ghost"} onClick={() => setActiveTab("followers")} className="flex-1">
          <Users className="h-4 w-4 mr-2" />내 팔로워
        </Button>
        <Button variant={activeTab === "following" ? "default" : "ghost"} onClick={() => setActiveTab("following")} className="flex-1">
          <UserCheck className="h-4 w-4 mr-2" />내 팔로잉
        </Button>
      </div>

      {/* 로딩 상태 */}
      {activeQuery.isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {/* 에러 상태 */}
      {activeQuery.error && <div className="text-center py-8 text-red-500">목록을 불러오는데 실패했습니다.</div>}

      {/* 빈 상태 */}
      {!activeQuery.isLoading && allUsers.length === 0 && <div className="text-center py-8 text-gray-500">{activeTab === "followers" ? "팔로워가" : "팔로잉이"} 없습니다.</div>}

      {/* 사용자 목록 */}
      <div className="space-y-4">
        {allUsers.map((follow) => {
          const user = activeTab === "followers" ? follow.followerId : follow.followingId;

          return (
            <div key={follow._id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Avatar src={user.image} alt={user.name} fallback={user.name.charAt(0)} size="md" />
                <div>
                  <h3 className="font-medium">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400">{new Date(follow.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {activeTab === "following" && <FollowButton userId={user._id} />}
            </div>
          );
        })}

        {/* 무한 스크롤 트리거 */}
        {activeQuery.hasNextPage && (
          <div ref={ref} className="flex justify-center py-4">
            {activeQuery.isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin" />}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 7. 라우팅 설정

### `App.tsx` 또는 라우터 설정

```tsx
import { Routes, Route } from "react-router-dom";
import { FollowPage } from "./pages/FollowPage";
import { MyFollowPage } from "./pages/MyFollowPage";
import { FollowingFeed } from "./components/FollowingFeed";

// 라우트 추가
<Routes>
  {/* 기존 라우트들... */}

  {/* 팔로우 관련 라우트 */}
  <Route path="/users/:userId/follow" element={<FollowPage />} />
  <Route path="/my/follow" element={<MyFollowPage />} />
  <Route path="/feed" element={<FollowingFeed />} />
</Routes>;
```

---

## 8. 사용 예시

### 8.1 사용자 프로필에 팔로우 버튼 추가

```tsx
// UserProfile.tsx
import { FollowButton } from "../components/FollowButton";
import { UserStats } from "../components/UserStats";

export const UserProfile = ({ user }) => {
  return (
    <div className="user-profile">
      <div className="flex items-center justify-between">
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
        <FollowButton userId={user._id} />
      </div>

      <UserStats userId={user._id} onFollowersClick={() => navigate(`/users/${user._id}/follow`)} onFollowingClick={() => navigate(`/users/${user._id}/follow`)} />
    </div>
  );
};
```

### 8.2 네비게이션에 피드 링크 추가

```tsx
// Navigation.tsx
import { Heart } from "lucide-react";

export const Navigation = () => {
  return (
    <nav>
      <Link to="/feed" className="nav-link">
        <Heart className="h-5 w-5" />
        팔로잉 피드
      </Link>
      <Link to="/my/follow" className="nav-link">
        팔로우 관리
      </Link>
    </nav>
  );
};
```

---

## 9. 스타일링 (Tailwind CSS)

### 주요 스타일 클래스

```css
/* 팔로우 버튼 */
.follow-btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
}

.follow-btn.following {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.follow-btn.not-following {
  @apply bg-blue-500 text-white hover:bg-blue-600;
}

/* 사용자 카드 */
.user-card {
  @apply flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow;
}

/* 통계 버튼 */
.stats-btn {
  @apply flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors;
}
```

---

## 10. 추가 기능 제안

### 10.1 알림 기능 연동

- 새로운 팔로워 알림
- 팔로우하는 사용자의 새 글 알림

### 10.2 추천 사용자

- 팔로우할 만한 사용자 추천
- 인기 작성자 목록

### 10.3 프라이버시 설정

- 팔로워/팔로잉 목록 공개 여부
- 팔로우 요청 승인 기능

### 10.4 검색 기능

- 팔로워/팔로잉 목록에서 사용자 검색
- 사용자 이름으로 검색하여 팔로우

---

## 구현 순서

1. **타입 정의** (`types/follow.ts`)
2. **API 서비스** (`services/followService.ts`)
3. **React Query Hooks** (`hooks/useFollow.ts`)
4. **기본 컴포넌트들** (FollowButton, UserStats)
5. **목록 컴포넌트** (FollowList)
6. **피드 컴포넌트** (FollowingFeed)
7. **페이지 컴포넌트들** (FollowPage, MyFollowPage)
8. **라우팅 설정**
9. **기존 컴포넌트에 통합** (UserProfile 등)
10. **테스트 및 최적화**

이 프롬프트를 따라 구현하면 완전한 팔로우/팔로잉 기능을 가진 프론트엔드를 만들 수 있습니다!
