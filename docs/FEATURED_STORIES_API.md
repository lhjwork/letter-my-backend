# 📌 메인 랜딩 페이지 Featured Stories API

## 📋 개요

메인 랜딩 페이지에 표시할 최신 사연 4개를 반환하는 공개 API입니다. 로그인 여부와 관계없이 모든 사용자가 접근 가능합니다.

### 🔗 엔드포인트
```
GET /api/letters/stories/featured
```

### 🔐 인증
- **인증 불필요** (Public API)
- 로그인하지 않은 사용자도 접근 가능

---

## 📊 API 명세

### Request

#### HTTP Method
```
GET
```

#### Query Parameters
없음 (고정된 4개의 사연만 반환)

#### Headers
```
Content-Type: application/json
```

---

### Response

#### 성공 응답 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "_id": "677a1b2c3d4e5f6g7h8i9j0k",
      "title": "할머니께 전하는 마지막 편지",
      "content": "<p>할머니, 보고 싶어요...</p>",
      "authorName": "손녀딸",
      "category": "가족",
      "createdAt": "2026-01-15T10:30:00.000Z",
      "viewCount": 150,
      "likeCount": 25
    },
    {
      "_id": "677a1b2c3d4e5f6g7h8i9j0l",
      "title": "첫사랑에게",
      "content": "<p>그때 용기를 냈더라면...</p>",
      "authorName": "익명",
      "category": "사랑",
      "createdAt": "2026-01-14T15:20:00.000Z",
      "viewCount": 200,
      "likeCount": 30
    },
    {
      "_id": "677a1b2c3d4e5f6g7h8i9j0m",
      "title": "친구야, 미안해",
      "content": "<p>그날 내가 너무 심했어...</p>",
      "authorName": "친구",
      "category": "우정",
      "createdAt": "2026-01-13T09:15:00.000Z",
      "viewCount": 180,
      "likeCount": 22
    },
    {
      "_id": "677a1b2c3d4e5f6g7h8i9j0n",
      "title": "엄마, 사랑해요",
      "content": "<p>항상 감사합니다...</p>",
      "authorName": "딸",
      "category": "감사",
      "createdAt": "2026-01-12T14:45:00.000Z",
      "viewCount": 220,
      "likeCount": 35
    }
  ],
  "meta": {
    "timestamp": "2026-01-15T12:00:00.000Z"
  }
}
```

#### 응답 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | 요청 성공 여부 |
| `data` | array | 사연 목록 (최대 4개) |
| `data[].id` | string | 사연 고유 ID |
| `data[].title` | string | 사연 제목 |
| `data[].content` | string | 사연 내용 (HTML 형식) |
| `data[].authorName` | string | 작성자 닉네임 |
| `data[].category` | string | 카테고리 (가족, 사랑, 우정, 성장, 위로, 추억, 감사, 기타) |
| `data[].createdAt` | string | 작성일시 (ISO 8601 형식) |
| `data[].viewCount` | number | 조회수 |
| `data[].likeCount` | number | 좋아요 수 |
| `meta.timestamp` | string | 응답 생성 시간 |

#### 에러 응답 (500 Internal Server Error)

```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다",
  "meta": {
    "timestamp": "2026-01-15T12:00:00.000Z"
  }
}
```

---

## 🎯 비즈니스 로직

### 사연 선택 기준

1. **타입 필터**: `type: "story"` (사연 타입만)
2. **상태 필터**: `status: { $nin: ["hidden", "deleted"] }` (숨김/삭제 제외한 모든 사연)
3. **공개 여부**: `isPublic: true` (공개 설정된 사연만)
4. **정렬**: `createdAt` 기준 내림차순 (최신순)
5. **개수 제한**: 최대 4개

### 반환 데이터

- 민감한 정보 제외 (userId, 주소 정보 등)
- HTML 콘텐츠 그대로 반환 (프론트엔드에서 렌더링)
- 조회수/좋아요 수 포함 (인기도 표시용)

### 특수 케이스 처리

#### 사연이 4개 미만인 경우
```json
{
  "success": true,
  "data": [
    {/* story 1 */},
    {/* story 2 */}
  ],
  "meta": {
    "timestamp": "2026-01-15T12:00:00.000Z"
  }
}
```

#### 사연이 없는 경우
```json
{
  "success": true,
  "data": [],
  "meta": {
    "timestamp": "2026-01-15T12:00:00.000Z"
  }
}
```

---

## 🧪 테스트 예시

### cURL

```bash
# 기본 요청
curl -X GET "http://localhost:5001/api/letters/stories/featured" \
  -H "Content-Type: application/json"

# 프로덕션 환경
curl -X GET "https://api.letter-community.com/api/letters/stories/featured" \
  -H "Content-Type: application/json"
```

### JavaScript/TypeScript

```typescript
// Fetch API
const getFeaturedStories = async () => {
  try {
    const response = await fetch('/api/letters/stories/featured');
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Failed to fetch featured stories:', error);
    return [];
  }
};

// Axios
import axios from 'axios';

const getFeaturedStories = async () => {
  try {
    const { data } = await axios.get('/api/letters/stories/featured');
    return data.data;
  } catch (error) {
    console.error('Failed to fetch featured stories:', error);
    return [];
  }
};
```

### Next.js Server Component

```typescript
// app/(beforeLogin)/page.tsx
async function getFeaturedStories() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/letters/stories/featured`,
    {
      cache: 'no-store', // 또는 { next: { revalidate: 300 } } (5분 캐시)
    }
  );
  
  if (!response.ok) {
    return [];
  }
  
  const result = await response.json();
  return result.data;
}

export default async function HomePage() {
  const stories = await getFeaturedStories();
  
  return (
    <div>
      <h1>최신 사연</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stories.map((story) => (
          <StoryCard key={story._id} story={story} />
        ))}
      </div>
    </div>
  );
}
```

---

## ⚡ 성능 최적화

### 캐싱 전략

#### 서버 사이드 캐싱 (권장)
```typescript
// Redis 캐싱 예시
const CACHE_KEY = 'featured_stories';
const CACHE_TTL = 300; // 5분

// 캐시에서 조회
const cachedStories = await redis.get(CACHE_KEY);
if (cachedStories) {
  return JSON.parse(cachedStories);
}

// DB에서 조회 후 캐시 저장
const stories = await Letter.find(/* ... */).limit(4);
await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(stories));
```

#### 클라이언트 사이드 캐싱
```typescript
// Next.js ISR (Incremental Static Regeneration)
export const revalidate = 300; // 5분마다 재생성

// React Query
const { data: stories } = useQuery({
  queryKey: ['featured-stories'],
  queryFn: getFeaturedStories,
  staleTime: 5 * 60 * 1000, // 5분
  cacheTime: 10 * 60 * 1000, // 10분
});
```

### 데이터베이스 최적화

#### 인덱스 활용
```javascript
// 기존 복합 인덱스 활용
// { type: 1, isPublic: 1, createdAt: -1 }
```

#### 필드 선택
```javascript
// 필요한 필드만 조회
.select('_id title content authorName category createdAt viewCount likeCount')
```

### 성능 목표

- **응답 시간**: < 100ms
- **캐시 히트율**: > 90%
- **DB 쿼리 시간**: < 50ms

---

## 🔄 기존 API와의 비교

| 항목 | `/api/letters/stories` | `/api/letters/stories/featured` |
|------|------------------------|----------------------------------|
| **인증** | 불필요 | 불필요 |
| **페이지네이션** | 있음 (page, limit) | 없음 (고정 4개) |
| **필터링** | 있음 (search, category, sort) | 없음 (최신순 고정) |
| **정렬** | 선택 가능 (latest, oldest, popular) | 최신순 고정 |
| **용도** | 사연 목록 페이지 | 메인 랜딩 페이지 |
| **캐싱** | 선택사항 | 권장 (5분) |
| **응답 크기** | 가변 (page * limit) | 고정 (4개) |

---

## 📱 프론트엔드 통합 가이드

### 사용 위치

1. **로그인 전 메인 페이지**: `app/(beforeLogin)/page.tsx`
2. **로그인 후 메인 페이지**: `app/home/page.tsx`

### 컴포넌트 예시

```typescript
// components/FeaturedStories.tsx
interface Story {
  _id: string;
  title: string;
  content: string;
  authorName: string;
  category: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
}

interface FeaturedStoriesProps {
  stories: Story[];
}

export function FeaturedStories({ stories }: FeaturedStoriesProps) {
  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">아직 등록된 사연이 없습니다.</p>
      </div>
    );
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6">최신 사연</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stories.map((story) => (
          <StoryCard key={story._id} story={story} />
        ))}
      </div>
    </section>
  );
}

// components/StoryCard.tsx
export function StoryCard({ story }: { story: Story }) {
  return (
    <article className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-blue-600 font-medium">
          {story.category}
        </span>
        <time className="text-sm text-gray-500">
          {new Date(story.createdAt).toLocaleDateString('ko-KR')}
        </time>
      </div>
      
      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
        {story.title}
      </h3>
      
      <div 
        className="text-gray-600 text-sm mb-4 line-clamp-3"
        dangerouslySetInnerHTML={{ __html: story.content }}
      />
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>by {story.authorName}</span>
        <div className="flex items-center space-x-4">
          <span>👁️ {story.viewCount}</span>
          <span>❤️ {story.likeCount}</span>
        </div>
      </div>
      
      <Link
        href={`/letters/${story._id}`}
        className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium"
      >
        자세히 보기 →
      </Link>
    </article>
  );
}
```

---

## 🐛 에러 처리

### 일반적인 에러 시나리오

1. **서버 오류 (500)**
   - DB 연결 실패
   - 쿼리 실행 오류
   - 예상치 못한 서버 에러

2. **네트워크 오류**
   - 타임아웃
   - 연결 실패

### 에러 처리 예시

```typescript
const getFeaturedStories = async () => {
  try {
    const response = await fetch('/api/letters/stories/featured', {
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch stories');
    }
    
    return result.data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timeout');
    } else {
      console.error('Failed to fetch featured stories:', error);
    }
    
    // 빈 배열 반환 (UI가 깨지지 않도록)
    return [];
  }
};
```

---

## 📊 모니터링 및 분석

### 추적할 지표

1. **성능 지표**
   - 평균 응답 시간
   - 95th percentile 응답 시간
   - 캐시 히트율

2. **사용 지표**
   - 일일 요청 수
   - 시간대별 요청 패턴
   - 에러율

3. **비즈니스 지표**
   - Featured 사연 클릭률
   - Featured 사연 조회수 증가율
   - 사용자 참여도

### 로깅 예시

```typescript
// 성공 로그
console.log('[Featured Stories] Fetched successfully', {
  count: stories.length,
  responseTime: Date.now() - startTime,
  cached: isCached,
});

// 에러 로그
console.error('[Featured Stories] Fetch failed', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
});
```

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-15 | 1.0.0 | Featured Stories API 최초 작성 |

---

## 💡 추가 개선 사항 (향후)

1. **개인화**: 사용자 관심사 기반 추천
2. **A/B 테스트**: 다양한 선택 알고리즘 테스트
3. **실시간 업데이트**: WebSocket을 통한 실시간 사연 업데이트
4. **다국어 지원**: 언어별 Featured Stories
5. **카테고리별 Featured**: 카테고리별로 인기 사연 선택

---

이 API를 통해 메인 랜딩 페이지에서 최신 사연을 효과적으로 표시할 수 있습니다!