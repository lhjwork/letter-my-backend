# Stories 검색/카테고리 프론트엔드 구현 프롬프트

## 개요

`/stories` 페이지에 카테고리 필터와 검색 기능을 구현합니다.

---

## API 엔드포인트

Base URL: `http://localhost:5001/api`

### 사연 목록 조회

```
GET /api/letters/stories?page=1&limit=20&category=가족&search=검색어&sort=latest
```

**쿼리 파라미터:**

| 파라미터 | 타입   | 기본값   | 설명                                |
| -------- | ------ | -------- | ----------------------------------- |
| page     | number | 1        | 페이지 번호                         |
| limit    | number | 20       | 페이지당 항목 수                    |
| search   | string | -        | 검색어                              |
| sort     | string | "latest" | 정렬: "latest", "oldest", "popular" |
| category | string | -        | 카테고리 필터                       |

### 카테고리 통계 조회

```
GET /api/letters/categories/stats
```

---

## 데이터 타입

```typescript
// 카테고리 목록
const CATEGORIES = ["전체보기", "가족", "사랑", "우정", "성장", "위로", "추억", "감사", "기타"] as const;

type Category = (typeof CATEGORIES)[number];

// 정렬 옵션
type SortOption = "latest" | "oldest" | "popular";

// 사연
interface Story {
  _id: string;
  type: "story";
  title: string;
  content: string;
  authorName: string;
  category: string;
  status: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

// 페이지네이션
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// API 응답
interface StoriesResponse {
  success: boolean;
  data: Story[];
  pagination: Pagination;
}

// 카테고리 통계
interface CategoryStats {
  total: number;
  categories: {
    category: string;
    count: number;
    percentage: string;
  }[];
}
```

---

## 구현해야 할 기능

### 1. 카테고리 필터

**기능:**

- 카테고리 버튼/탭 클릭 시 해당 카테고리 사연만 표시
- "전체보기" 선택 시 모든 사연 표시
- 선택된 카테고리 하이라이트
- URL 쿼리 파라미터와 동기화 (`?category=가족`)

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│ [전체보기] [가족] [사랑] [우정] [성장] [위로] [추억] [감사] [기타] │
└─────────────────────────────────────────────────────────────┘
```

또는 드롭다운:

```
┌─────────────────────────────────────────────────────────────┐
│ 카테고리: [전체보기 ▼]                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2. 검색 기능

**기능:**

- 검색어 입력 후 Enter 또는 검색 버튼 클릭 시 검색
- 제목, 내용, 작성자명에서 검색
- 검색어 초기화 버튼
- URL 쿼리 파라미터와 동기화 (`?search=엄마`)
- 디바운스 적용 (선택사항)

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 [검색어를 입력하세요...________________] [검색]            │
└─────────────────────────────────────────────────────────────┘
```

### 3. 정렬 기능

**기능:**

- 최신순 / 오래된순 / 인기순 정렬
- URL 쿼리 파라미터와 동기화 (`?sort=popular`)

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│ 정렬: [최신순 ▼]                                             │
│       ├─ 최신순                                              │
│       ├─ 오래된순                                            │
│       └─ 인기순                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. 인피니티 스크롤

**기능:**

- 스크롤이 하단에 도달하면 자동으로 다음 페이지 로드
- 로딩 인디케이터 표시
- 더 이상 데이터가 없으면 "모든 사연을 불러왔습니다" 메시지 표시
- Intersection Observer API 사용

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│ [사연 카드 1]                                               │
│ [사연 카드 2]                                               │
│ [사연 카드 3]                                               │
│ ...                                                         │
│ [사연 카드 N]                                               │
├─────────────────────────────────────────────────────────────┤
│                    ⏳ 로딩 중...                             │  ← 스크롤 시 표시
└─────────────────────────────────────────────────────────────┘

또는

┌─────────────────────────────────────────────────────────────┐
│                 모든 사연을 불러왔습니다 ✓                    │  ← 마지막 페이지
└─────────────────────────────────────────────────────────────┘
```

### 5. 결과 없음 상태

**기능:**

- 검색 결과가 없을 때 안내 메시지 표시
- 필터 초기화 버튼

**UI 구성:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    검색 결과가 없습니다.                      │
│                                                             │
│                    [필터 초기화]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 전체 페이지 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│ 사연 모아보기                                                │
├─────────────────────────────────────────────────────────────┤
│ 🔍 [검색어를 입력하세요...________________] [검색]            │
├─────────────────────────────────────────────────────────────┤
│ [전체보기] [가족] [사랑] [우정] [성장] [위로] [추억] [감사] [기타] │
├─────────────────────────────────────────────────────────────┤
│ 총 150개의 사연                              정렬: [최신순 ▼] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 엄마에게 보내는 편지                                     │ │
│ │ 가족 · 익명 · 조회 123 · 2024.01.15                     │ │
│ │ 엄마, 항상 감사해요. 말로는 잘 표현 못했지만...           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 친구야 고마워                                           │ │
│ │ 우정 · 홍길동 · 조회 45 · 2024.01.14                    │ │
│ │ 10년 지기 친구에게 전하고 싶은 말이 있어...              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                         ...                                 │
├─────────────────────────────────────────────────────────────┤
│                    ⏳ 로딩 중...                             │  ← 인피니티 스크롤
└─────────────────────────────────────────────────────────────┘
```

---

## 컴포넌트 구조

```
src/
├── app/
│   └── stories/
│       └── page.tsx                # 사연 목록 페이지
├── components/
│   └── stories/
│       ├── StoryCard.tsx           # 사연 카드
│       ├── CategoryFilter.tsx      # 카테고리 필터
│       ├── SearchBar.tsx           # 검색바
│       ├── SortSelect.tsx          # 정렬 선택
│       ├── LoadingSpinner.tsx      # 로딩 스피너
│       └── EmptyState.tsx          # 결과 없음 상태
├── hooks/
│   ├── useStories.ts               # 사연 목록 조회 hook (인피니티 스크롤)
│   ├── useStoriesFilter.ts         # 필터 상태 관리 hook
│   └── useIntersectionObserver.ts  # Intersection Observer hook
└── api/
    └── stories.ts                  # 사연 API 클라이언트
```

---

## API 클라이언트

```typescript
// api/stories.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api",
});

interface GetStoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "latest" | "oldest" | "popular";
  category?: string;
}

export const getStories = (params: GetStoriesParams) => api.get("/letters/stories", { params });

export const getCategoryStats = () => api.get("/letters/categories/stats");
```

---

## React Query Hooks (인피니티 스크롤)

```typescript
// hooks/useStories.ts
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getStories, getCategoryStats } from "@/api/stories";

interface UseStoriesParams {
  limit?: number;
  search?: string;
  sort?: "latest" | "oldest" | "popular";
  category?: string;
}

export const useInfiniteStories = (params: UseStoriesParams) => {
  return useInfiniteQuery({
    queryKey: ["stories", "infinite", params],
    queryFn: ({ pageParam = 1 }) => getStories({ ...params, page: pageParam }).then((res) => res.data),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.hasNextPage ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};

export const useCategoryStats = () => {
  return useQuery({
    queryKey: ["stories", "categoryStats"],
    queryFn: () => getCategoryStats().then((res) => res.data.data),
    staleTime: 1000 * 60 * 5, // 5분간 캐시
  });
};
```

---

## URL 쿼리 파라미터 동기화

```typescript
// hooks/useStoriesFilter.ts
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const useStoriesFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") || "";
  const sort = (searchParams.get("sort") as SortOption) || "latest";
  const category = searchParams.get("category") || "";

  const updateFilter = useCallback(
    (updates: Partial<{ search: string; sort: string; category: string }>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });

      router.push(`/stories?${params.toString()}`);
    },
    [router, searchParams]
  );

  const resetFilter = useCallback(() => {
    router.push("/stories");
  }, [router]);

  return {
    search,
    sort,
    category,
    updateFilter,
    resetFilter,
  };
};
```

---

## Intersection Observer Hook

```typescript
// hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from "react";

interface UseIntersectionObserverProps {
  threshold?: number;
  rootMargin?: string;
  onIntersect?: () => void;
}

export const useIntersectionObserver = ({ threshold = 0.1, rootMargin = "100px", onIntersect }: UseIntersectionObserverProps = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && onIntersect) {
          onIntersect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, onIntersect]);

  return { ref, isIntersecting };
};
```

---

## 페이지 구현 예시 (인피니티 스크롤)

```tsx
// app/stories/page.tsx
"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteStories } from "@/hooks/useStories";
import { useStoriesFilter } from "@/hooks/useStoriesFilter";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import CategoryFilter from "@/components/stories/CategoryFilter";
import SearchBar from "@/components/stories/SearchBar";
import SortSelect from "@/components/stories/SortSelect";
import StoryCard from "@/components/stories/StoryCard";
import EmptyState from "@/components/stories/EmptyState";

export default function StoriesPage() {
  const { search, sort, category, updateFilter, resetFilter } = useStoriesFilter();

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteStories({ search, sort, category, limit: 20 });

  // 모든 페이지의 사연을 하나의 배열로 합침
  const stories = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  // 전체 개수
  const total = data?.pages[0]?.pagination.total || 0;

  // 다음 페이지 로드 함수
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Intersection Observer로 스크롤 감지
  const { ref: loadMoreRef } = useIntersectionObserver({
    onIntersect: loadMore,
    rootMargin: "200px",
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">사연 모아보기</h1>

      {/* 검색바 */}
      <SearchBar value={search} onChange={(value) => updateFilter({ search: value })} />

      {/* 카테고리 필터 */}
      <CategoryFilter selected={category} onChange={(value) => updateFilter({ category: value })} />

      {/* 결과 수 & 정렬 */}
      <div className="flex justify-between items-center my-4">
        <span>총 {total}개의 사연</span>
        <SortSelect value={sort} onChange={(value) => updateFilter({ sort: value })} />
      </div>

      {/* 사연 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : stories.length === 0 ? (
        <EmptyState onReset={resetFilter} />
      ) : (
        <>
          <div className="grid gap-4">
            {stories.map((story) => (
              <StoryCard key={story._id} story={story} />
            ))}
          </div>

          {/* 인피니티 스크롤 트리거 */}
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {isFetchingNextPage ? (
              <span className="loading loading-spinner loading-md" />
            ) : hasNextPage ? (
              <span className="text-gray-400">스크롤하여 더 보기</span>
            ) : (
              <span className="text-gray-400">모든 사연을 불러왔습니다 ✓</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 카테고리 필터 컴포넌트 예시

```tsx
// components/stories/CategoryFilter.tsx
const CATEGORIES = ["전체보기", "가족", "사랑", "우정", "성장", "위로", "추억", "감사", "기타"];

interface CategoryFilterProps {
  selected: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 my-4">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category === "전체보기" ? "" : category)}
          className={`px-4 py-2 rounded-full text-sm ${(category === "전체보기" && !selected) || selected === category ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
```

---

## 검색바 컴포넌트 예시

```tsx
// components/stories/SearchBar.tsx
import { useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(inputValue);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="검색어를 입력하세요..." className="w-full px-4 py-2 pl-10 border rounded-lg" />
        <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
        {inputValue && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
            ✕
          </button>
        )}
      </div>
      <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">
        검색
      </button>
    </form>
  );
}
```

---

## 참고

- 백엔드 API 문서: `docs/STORIES_SEARCH_BACKEND_PROMPT.md`
- Swagger 문서: `http://localhost:5001/api-docs`
