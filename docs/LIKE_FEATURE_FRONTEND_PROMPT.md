# 좋아요 기능 프론트엔드 구현 프롬프트

## 개요

사연/편지에 좋아요 기능을 구현합니다. 로그인한 사용자만 좋아요를 누를 수 있습니다.

---

## API 엔드포인트

Base URL: `http://localhost:5001/api`

| Method | Endpoint            | 설명               | 인증 |
| ------ | ------------------- | ------------------ | ---- |
| POST   | `/letters/:id/like` | 좋아요 추가        | 필수 |
| DELETE | `/letters/:id/like` | 좋아요 취소        | 필수 |
| GET    | `/letters/:id/like` | 좋아요 상태 확인   | 필수 |
| GET    | `/users/me/likes`   | 내가 좋아요한 목록 | 필수 |

---

## 데이터 타입

```typescript
// 좋아요 상태
interface LikeStatus {
  isLiked: boolean;
  likeCount: number;
}

// 좋아요 API 응답
interface LikeResponse {
  success: boolean;
  message?: string;
  data: LikeStatus;
}

// 내가 좋아요한 목록 응답
interface MyLikesResponse {
  success: boolean;
  data: Story[];
  pagination: Pagination;
}
```

---

## 구현해야 할 기능

### 1. 좋아요 버튼 컴포넌트

**기능:**

- 좋아요 상태에 따라 아이콘 변경 (빈 하트 ↔ 채워진 하트)
- 클릭 시 좋아요 추가/취소 토글
- 좋아요 수 표시
- 비로그인 시 로그인 유도 (모달 또는 리다이렉트)
- 낙관적 업데이트 (Optimistic Update)
- 로딩 상태 표시

**UI 구성:**

```
┌─────────────────────────────────────┐
│  ♡ 42                               │  ← 좋아요 안 한 상태
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ❤️ 43                               │  ← 좋아요 한 상태
└─────────────────────────────────────┘
```

### 2. 사연 카드에 좋아요 버튼 추가

**위치:** StoryCard 컴포넌트 하단

```
┌─────────────────────────────────────────────────────────────┐
│ 엄마에게 보내는 편지                                         │
│ 가족 · 익명 · 2024.01.15                                    │
│ 엄마, 항상 감사해요. 말로는 잘 표현 못했지만...               │
├─────────────────────────────────────────────────────────────┤
│ 👁 123                                            ❤️ 42     │
└─────────────────────────────────────────────────────────────┘
```

### 3. 사연 상세 페이지에 좋아요 버튼 추가

**위치:** 본문 하단 또는 플로팅 버튼

```
┌─────────────────────────────────────────────────────────────┐
│ 엄마에게 보내는 편지                                         │
│ 가족 · 익명 · 2024.01.15                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ (본문 내용...)                                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    [❤️ 좋아요 42]                            │
└─────────────────────────────────────────────────────────────┘
```

### 4. 내가 좋아요한 목록 페이지

**경로:** `/mypage/likes`

**기능:**

- 좋아요한 사연/편지 목록 표시
- 페이지네이션 또는 인피니티 스크롤
- 좋아요 취소 가능

---

## 컴포넌트 구조

```
src/
├── components/
│   └── like/
│       ├── LikeButton.tsx          # 좋아요 버튼
│       └── LikeCount.tsx           # 좋아요 수 표시 (선택)
├── hooks/
│   ├── useLike.ts                  # 좋아요 상태 관리 hook
│   └── useMyLikes.ts               # 내가 좋아요한 목록 hook
└── api/
    └── like.ts                     # 좋아요 API 클라이언트
```

---

## API 클라이언트

```typescript
// api/like.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 좋아요 추가
export const addLike = (letterId: string) => api.post(`/letters/${letterId}/like`);

// 좋아요 취소
export const removeLike = (letterId: string) => api.delete(`/letters/${letterId}/like`);

// 좋아요 상태 확인
export const checkLikeStatus = (letterId: string) => api.get(`/letters/${letterId}/like`);

// 내가 좋아요한 목록
export const getMyLikes = (params?: { page?: number; limit?: number }) => api.get("/users/me/likes", { params });
```

---

## React Query Hooks

```typescript
// hooks/useLike.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addLike, removeLike, checkLikeStatus } from "@/api/like";

interface UseLikeOptions {
  letterId: string;
  initialLikeCount?: number;
  initialIsLiked?: boolean;
}

export const useLike = ({ letterId, initialLikeCount = 0, initialIsLiked = false }: UseLikeOptions) => {
  const queryClient = useQueryClient();

  // 좋아요 상태 조회
  const { data, isLoading } = useQuery({
    queryKey: ["like", letterId],
    queryFn: () => checkLikeStatus(letterId).then((res) => res.data.data),
    initialData: { isLiked: initialIsLiked, likeCount: initialLikeCount },
    enabled: !!letterId,
  });

  // 좋아요 추가
  const likeMutation = useMutation({
    mutationFn: () => addLike(letterId),
    onMutate: async () => {
      // 낙관적 업데이트
      await queryClient.cancelQueries({ queryKey: ["like", letterId] });
      const previous = queryClient.getQueryData(["like", letterId]);

      queryClient.setQueryData(["like", letterId], (old: any) => ({
        isLiked: true,
        likeCount: (old?.likeCount || 0) + 1,
      }));

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // 에러 시 롤백
      queryClient.setQueryData(["like", letterId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["like", letterId] });
    },
  });

  // 좋아요 취소
  const unlikeMutation = useMutation({
    mutationFn: () => removeLike(letterId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["like", letterId] });
      const previous = queryClient.getQueryData(["like", letterId]);

      queryClient.setQueryData(["like", letterId], (old: any) => ({
        isLiked: false,
        likeCount: Math.max((old?.likeCount || 1) - 1, 0),
      }));

      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["like", letterId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["like", letterId] });
    },
  });

  const toggleLike = () => {
    if (data?.isLiked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  return {
    isLiked: data?.isLiked || false,
    likeCount: data?.likeCount || 0,
    isLoading,
    isToggling: likeMutation.isPending || unlikeMutation.isPending,
    toggleLike,
  };
};
```

```typescript
// hooks/useMyLikes.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { getMyLikes } from "@/api/like";

export const useMyLikes = (limit = 20) => {
  return useInfiniteQuery({
    queryKey: ["myLikes"],
    queryFn: ({ pageParam = 1 }) => getMyLikes({ page: pageParam, limit }).then((res) => res.data),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};
```

---

## 좋아요 버튼 컴포넌트

```tsx
// components/like/LikeButton.tsx
"use client";

import { useLike } from "@/hooks/useLike";
import { useAuth } from "@/hooks/useAuth";
import { Heart } from "lucide-react"; // 또는 다른 아이콘 라이브러리

interface LikeButtonProps {
  letterId: string;
  initialLikeCount?: number;
  initialIsLiked?: boolean;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}

export default function LikeButton({ letterId, initialLikeCount = 0, initialIsLiked = false, size = "md", showCount = true }: LikeButtonProps) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const { isLiked, likeCount, isToggling, toggleLike } = useLike({
    letterId,
    initialLikeCount,
    initialIsLiked,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      openLoginModal();
      return;
    }

    toggleLike();
  };

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      className={`
        flex items-center gap-1 transition-colors
        ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-400"}
        ${isToggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      aria-label={isLiked ? "좋아요 취소" : "좋아요"}
    >
      <Heart className={`${sizeClasses[size]} ${isLiked ? "fill-current" : ""}`} />
      {showCount && <span className="text-sm">{likeCount}</span>}
    </button>
  );
}
```

---

## 사연 카드에 적용

```tsx
// components/stories/StoryCard.tsx
import LikeButton from "@/components/like/LikeButton";

interface StoryCardProps {
  story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
  return (
    <Link href={`/stories/${story._id}`}>
      <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
        <h3 className="font-bold text-lg">{story.title}</h3>
        <p className="text-sm text-gray-500">
          {story.category} · {story.authorName} · {formatDate(story.createdAt)}
        </p>
        <p className="mt-2 text-gray-700 line-clamp-2">{story.content}</p>

        {/* 하단 통계 */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{story.viewCount}</span>
          </div>
          <LikeButton letterId={story._id} initialLikeCount={story.likeCount} size="sm" />
        </div>
      </div>
    </Link>
  );
}
```

---

## 사연 상세 페이지에 적용

```tsx
// app/stories/[id]/page.tsx
import LikeButton from "@/components/like/LikeButton";

export default function StoryDetailPage({ params }: { params: { id: string } }) {
  const { data: story, isLoading } = useStory(params.id);

  if (isLoading) return <Loading />;
  if (!story) return <NotFound />;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold">{story.title}</h1>
      <p className="text-gray-500">
        {story.category} · {story.authorName} · {formatDate(story.createdAt)}
      </p>

      <div className="mt-6 whitespace-pre-wrap">{story.content}</div>

      {/* 좋아요 버튼 */}
      <div className="mt-8 flex justify-center">
        <LikeButton letterId={story._id} initialLikeCount={story.likeCount} size="lg" showCount={true} />
      </div>
    </div>
  );
}
```

---

## 내가 좋아요한 목록 페이지

```tsx
// app/mypage/likes/page.tsx
"use client";

import { useMyLikes } from "@/hooks/useMyLikes";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import StoryCard from "@/components/stories/StoryCard";

export default function MyLikesPage() {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useMyLikes();

  const { ref: loadMoreRef } = useIntersectionObserver({
    onIntersect: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  const stories = data?.pages.flatMap((page) => page.data) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">좋아요한 사연</h1>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : stories.length === 0 ? (
        <div className="text-center py-10 text-gray-500">좋아요한 사연이 없습니다.</div>
      ) : (
        <>
          <div className="grid gap-4">
            {stories.map((story) => (
              <StoryCard key={story._id} story={story} />
            ))}
          </div>

          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {isFetchingNextPage ? <span>로딩 중...</span> : hasNextPage ? <span className="text-gray-400">스크롤하여 더 보기</span> : <span className="text-gray-400">모두 불러왔습니다</span>}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 비로그인 사용자 처리

```tsx
// hooks/useAuth.ts (예시)
export const useAuth = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { data: user } = useCurrentUser();

  return {
    user,
    isLoggedIn: !!user,
    openLoginModal: () => setIsLoginModalOpen(true),
    closeLoginModal: () => setIsLoginModalOpen(false),
    isLoginModalOpen,
  };
};
```

---

## 참고

- 백엔드 API 문서: `docs/LIKE_FEATURE_BACKEND_PROMPT.md`
- Swagger 문서: `http://localhost:5001/api-docs`
