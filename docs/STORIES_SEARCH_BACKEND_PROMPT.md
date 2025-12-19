# Stories 검색/카테고리 백엔드 API 문서

## 개요

`/stories` 페이지에서 사용하는 사연 목록 조회 API입니다. 카테고리 필터링과 검색 기능이 이미 구현되어 있습니다.

---

## API 엔드포인트

### 사연 목록 조회

```
GET /api/letters/stories
```

**쿼리 파라미터:**

| 파라미터 | 타입   | 기본값   | 설명                                     |
| -------- | ------ | -------- | ---------------------------------------- |
| page     | number | 1        | 페이지 번호                              |
| limit    | number | 20       | 페이지당 항목 수 (최대 100)              |
| search   | string | -        | 검색어 (제목, 내용, 작성자명 검색)       |
| sort     | string | "latest" | 정렬 방식: "latest", "oldest", "popular" |
| category | string | -        | 카테고리 필터                            |

**카테고리 목록:**

- 가족
- 사랑
- 우정
- 성장
- 위로
- 추억
- 감사
- 기타

**요청 예시:**

```
GET /api/letters/stories?page=1&limit=20&category=가족&search=엄마&sort=latest
```

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "type": "story",
      "title": "엄마에게 보내는 편지",
      "content": "...",
      "authorName": "익명",
      "category": "가족",
      "status": "created",
      "viewCount": 123,
      "likeCount": 45,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 카테고리별 통계 조회

```
GET /api/letters/categories/stats
```

**응답:**

```json
{
  "success": true,
  "data": {
    "total": 500,
    "categories": [
      { "category": "가족", "count": 120, "percentage": "24.0" },
      { "category": "사랑", "count": 100, "percentage": "20.0" },
      { "category": "우정", "count": 80, "percentage": "16.0" },
      { "category": "성장", "count": 70, "percentage": "14.0" },
      { "category": "위로", "count": 50, "percentage": "10.0" },
      { "category": "추억", "count": 40, "percentage": "8.0" },
      { "category": "감사", "count": 25, "percentage": "5.0" },
      { "category": "기타", "count": 15, "percentage": "3.0" }
    ]
  }
}
```

---

## 검색 로직

검색어가 입력되면 다음 필드에서 대소문자 구분 없이 검색합니다:

- `title` (제목)
- `content` (내용)
- `authorName` (작성자명)

```typescript
// 검색 쿼리 예시
{
  $or: [{ title: { $regex: search, $options: "i" } }, { content: { $regex: search, $options: "i" } }, { authorName: { $regex: search, $options: "i" } }];
}
```

---

## 정렬 옵션

| 값      | 설명                                   |
| ------- | -------------------------------------- |
| latest  | 최신순 (createdAt 내림차순)            |
| oldest  | 오래된순 (createdAt 오름차순)          |
| popular | 인기순 (viewCount, likeCount 내림차순) |

---

## 참고

- 인증 불필요 (공개 API)
- 카테고리가 "전체보기"이거나 빈 값이면 모든 카테고리 조회
- 검색어가 없으면 전체 목록 조회
