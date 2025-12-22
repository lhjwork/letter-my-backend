# 내 편지 목록 API 페이지네이션 업데이트

## 개요

`GET /api/letters/my` API에 페이지네이션 기능을 추가하여 프론트엔드의 무한 스크롤을 지원합니다.

---

## API 엔드포인트

### GET `/api/letters/my` - 내 편지 목록 조회

**인증**: Bearer Token 필요

#### 요청 파라미터 (Query Parameters)

| 파라미터 | 타입   | 필수 | 기본값 | 설명                     |
| -------- | ------ | ---- | ------ | ------------------------ |
| page     | number | 선택 | 1      | 페이지 번호 (1 이상)     |
| limit    | number | 선택 | 20     | 페이지당 항목 수 (1-100) |

#### 응답 형식

##### 페이지네이션 요청 시 (page 또는 limit 파라미터 포함)

```json
{
  "success": true,
  "data": [
    {
      "_id": "편지ID",
      "type": "story" | "letter",
      "title": "편지 제목",
      "content": "편지 내용",
      "authorName": "작성자명",
      "category": "카테고리",
      "viewCount": 0,
      "likeCount": 0,
      "ogPreviewMessage": "OG 미리보기 메시지",
      "ogBgColor": "#FFF5F5",
      "ogIllustration": "💌",
      "ogFontSize": 48,
      "ogImageType": "auto",
      "ogImageUrl": "이미지URL",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
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

##### 기존 호출 방식 (하위 호환성)

```json
{
  "success": true,
  "data": [
    {
      "_id": "편지ID",
      "type": "story" | "letter",
      "title": "편지 제목",
      "content": "편지 내용",
      "authorName": "작성자명",
      "category": "카테고리",
      "viewCount": 0,
      "likeCount": 0,
      "ogPreviewMessage": "OG 미리보기 메시지",
      "ogBgColor": "#FFF5F5",
      "ogIllustration": "💌",
      "ogFontSize": 48,
      "ogImageType": "auto",
      "ogImageUrl": "이미지URL",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 사용 예시

### 1. 기본 호출 (첫 페이지, 20개)

```bash
GET /api/letters/my
Authorization: Bearer {token}

# 또는 명시적으로
GET /api/letters/my?page=1&limit=20
Authorization: Bearer {token}
```

### 2. 특정 페이지 호출

```bash
GET /api/letters/my?page=2&limit=10
Authorization: Bearer {token}
```

### 3. 기존 방식 (전체 조회)

```bash
GET /api/letters/my
Authorization: Bearer {token}
# page나 limit 파라미터 없으면 전체 조회 (하위 호환성)
```

---

## 에러 응답

### 400 Bad Request - 잘못된 파라미터

```json
{
  "success": false,
  "message": "page와 limit은 1 이상의 값이어야 합니다."
}
```

### 401 Unauthorized - 인증 실패

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 500 Internal Server Error - 서버 오류

```json
{
  "success": false,
  "message": "편지 목록을 불러오는데 실패했습니다."
}
```

---

## 데이터 정렬 및 필터링

- **정렬**: `createdAt` 기준 내림차순 (최신순)
- **타입**: `story`와 `letter` 타입 모두 포함
- **소유자**: 요청한 사용자의 편지만 조회

---

## 성능 최적화

### MongoDB 인덱스

```javascript
// 복합 인덱스 생성됨
db.letters.createIndex({ userId: 1, createdAt: -1 });
```

### 쿼리 최적화

- `lean()` 사용으로 성능 향상
- 필요한 필드만 선택 (`-__v` 제외)
- 병렬 쿼리로 데이터와 총 개수 동시 조회

---

## 프론트엔드 연동 예시

### React Query 무한 스크롤

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";

const useMyLetters = () => {
  return useInfiniteQuery({
    queryKey: ["myLetters"],
    queryFn: ({ pageParam = 1 }) =>
      fetch(`/api/letters/my?page=${pageParam}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
};
```

### 일반 페이지네이션

```typescript
const useMyLettersPage = (page: number, limit: number = 20) => {
  return useQuery({
    queryKey: ["myLetters", page, limit],
    queryFn: () =>
      fetch(`/api/letters/my?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
  });
};
```

---

## 변경사항 요약

### 백엔드 변경사항

1. **letterService.ts**
   - `findByUserIdWithPagination` 메서드 추가
   - 페이지네이션, 정렬, 필터링 지원

2. **letterController.ts**
   - `getMyLetters` 메서드 수정
   - 파라미터 검증 추가
   - 하위 호환성 유지

3. **Letter.ts (모델)**
   - `{ userId: 1, createdAt: -1 }` 복합 인덱스 추가

### 하위 호환성

- 기존 `GET /api/letters/my` 호출은 여전히 작동
- `page`나 `limit` 파라미터가 없으면 전체 조회
- 응답 구조는 `pagination` 객체 유무로만 차이

### 제한사항

- `limit` 최대값: 100 (성능 보호)
- `page`, `limit` 최소값: 1
- 인증된 사용자만 접근 가능

---

## 테스트 체크리스트

- [ ] 기본 호출 (파라미터 없음) - 하위 호환성
- [ ] 페이지네이션 호출 (`page=1&limit=20`)
- [ ] 빈 결과 처리 (`page=999`)
- [ ] 잘못된 파라미터 처리 (`page=0`, `limit=-1`)
- [ ] 인증 실패 처리
- [ ] 성능 테스트 (대량 데이터)
- [ ] 인덱스 성능 확인

구현이 완료되었습니다!
