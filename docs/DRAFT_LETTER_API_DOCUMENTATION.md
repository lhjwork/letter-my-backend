# 편지 임시저장 API 문서

## 📋 개요

편지 작성 중 언제든 임시저장하고, 마이페이지에서 작성 중인 편지를 관리할 수 있는 백엔드 API입니다.

## 🔗 Base URL

```
http://localhost:5001/api/drafts
```

## 🔐 인증

모든 API 엔드포인트는 JWT 토큰을 통한 인증이 필요합니다.

```http
Authorization: Bearer <your-jwt-token>
```

## 📚 API 엔드포인트

### 1. 임시저장 생성

**POST** `/api/drafts`

편지를 임시저장합니다. 제목 없이도 저장 가능하며, 자동 제목이 생성됩니다.

#### 요청 본문

```json
{
  "title": "편지 제목 (선택사항)",
  "content": "편지 내용",
  "type": "friend|story",
  "category": "카테고리 (선택사항)",
  "recipientAddresses": [
    {
      "name": "받는 분 성함",
      "phone": "010-1234-5678",
      "zipCode": "12345",
      "address1": "주소",
      "address2": "상세주소 (선택사항)",
      "memo": "메모 (선택사항)"
    }
  ]
}
```

#### 응답

```json
{
  "success": true,
  "data": {
    "_id": "draft_id",
    "title": "편지 제목",
    "autoTitle": "자동 생성된 제목...",
    "content": "편지 내용",
    "type": "friend",
    "category": "기타",
    "wordCount": 150,
    "saveCount": 1,
    "lastSavedAt": "2024-01-01T12:00:00Z",
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "message": "임시저장되었습니다."
}
```

### 2. 임시저장 수정

**PUT** `/api/drafts/:draftId`

기존 임시저장을 수정합니다.

#### 요청 본문

```json
{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "type": "friend|story",
  "category": "수정된 카테고리"
}
```

#### 응답

```json
{
  "success": true,
  "data": {
    "_id": "draft_id",
    "title": "수정된 제목",
    "content": "수정된 내용",
    "saveCount": 2,
    "lastSavedAt": "2024-01-01T12:05:00Z"
  },
  "message": "임시저장이 업데이트되었습니다."
}
```

### 3. 임시저장 목록 조회

**GET** `/api/drafts`

사용자의 임시저장 목록을 조회합니다.

#### 쿼리 파라미터

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `sort`: 정렬 방식 (`latest`, `oldest`, `wordCount`)
- `type`: 편지 타입 필터 (`all`, `friend`, `story`)

#### 예시 요청

```http
GET /api/drafts?page=1&limit=5&sort=latest&type=all
```

#### 응답

```json
{
  "success": true,
  "data": {
    "drafts": [
      {
        "_id": "draft_id",
        "title": "편지 제목",
        "autoTitle": "자동 생성된 제목...",
        "content": "편지 내용 미리보기...",
        "type": "friend",
        "category": "감사",
        "wordCount": 245,
        "saveCount": 3,
        "lastSavedAt": "2024-01-01T12:00:00Z",
        "createdAt": "2024-01-01T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "stats": {
      "totalDrafts": 25,
      "totalWords": 5420,
      "oldestDraft": "2024-01-01T10:00:00Z"
    }
  }
}
```

### 4. 임시저장 상세 조회

**GET** `/api/drafts/:draftId`

특정 임시저장의 상세 정보를 조회합니다.

#### 응답

```json
{
  "success": true,
  "data": {
    "_id": "draft_id",
    "title": "편지 제목",
    "content": "전체 편지 내용...",
    "type": "friend",
    "category": "감사",
    "recipientAddresses": [...],
    "wordCount": 245,
    "saveCount": 3,
    "lastSavedAt": "2024-01-01T12:00:00Z",
    "createdAt": "2024-01-01T11:00:00Z"
  }
}
```

### 5. 임시저장 삭제

**DELETE** `/api/drafts/:draftId`

임시저장을 삭제합니다 (소프트 삭제).

#### 응답

```json
{
  "success": true,
  "message": "임시저장된 편지가 삭제되었습니다."
}
```

### 6. 임시저장 → 정식 발행

**POST** `/api/drafts/:draftId/publish`

임시저장된 편지를 정식 편지로 발행합니다.

#### 요청 본문 (선택사항)

```json
{
  "title": "최종 편지 제목",
  "content": "최종 편지 내용",
  "type": "friend|story",
  "category": "최종 카테고리"
}
```

#### 응답

```json
{
  "success": true,
  "data": {
    "letterId": "published_letter_id",
    "url": "https://domain.com/letter/published_letter_id",
    "draftId": "draft_id"
  },
  "message": "편지가 성공적으로 발행되었습니다."
}
```

### 7. 임시저장 통계

**GET** `/api/drafts/stats`

사용자의 임시저장 통계를 조회합니다.

#### 응답

```json
{
  "success": true,
  "data": {
    "totalDrafts": 25,
    "totalWords": 5420,
    "oldestDraft": "2024-01-01T10:00:00Z",
    "recentActivity": [
      {
        "date": "2024-01-01",
        "saves": 12
      }
    ]
  }
}
```

### 8. 오래된 임시저장 정리 (관리자용)

**POST** `/api/drafts/cleanup`

30일 이상 된 임시저장을 정리합니다.

#### 응답

```json
{
  "success": true,
  "data": {
    "cleanedCount": 15
  },
  "message": "15개의 오래된 임시저장이 정리되었습니다."
}
```

## 🚨 에러 응답

### 400 Bad Request

```json
{
  "success": false,
  "error": "제목은 200자 이내여야 합니다."
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "로그인이 필요합니다."
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "임시저장된 편지를 찾을 수 없습니다."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "서버 오류가 발생했습니다."
}
```

## 📊 데이터 모델

### DraftLetter Schema

```typescript
interface IDraftLetter {
  _id: string;
  authorId: string;
  title: string;
  content: string;
  type: "friend" | "story";
  category: string;
  autoTitle: string;
  wordCount: number;
  recipientAddresses: IDraftRecipientAddress[];
  status: "draft" | "published" | "deleted";
  saveCount: number;
  lastSavedAt: Date;
  publishedAt?: Date;
  publishedLetterId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 수신자 주소 Schema

```typescript
interface IDraftRecipientAddress {
  name?: string;
  phone?: string;
  zipCode?: string;
  address1?: string;
  address2?: string;
  memo?: string;
}
```

## 🔒 보안 및 제한사항

### 입력값 제한

- **제목**: 최대 200자
- **내용**: 최대 10,000자
- **카테고리**: 최대 50자
- **메모**: 최대 500자

### Rate Limiting

- 임시저장 API: 사용자당 분당 20회
- 일반 API: 사용자당 분당 30회

### 데이터 정리

- 30일 이상 된 임시저장은 자동으로 삭제됩니다 (매일 새벽 2시)
- 소프트 삭제 방식으로 데이터 복구 가능

## 🧪 테스트 예시

### cURL 예시

```bash
# 임시저장 생성
curl -X POST http://localhost:5001/api/drafts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "테스트 편지",
    "content": "테스트 내용입니다.",
    "type": "friend",
    "category": "테스트"
  }'

# 임시저장 목록 조회
curl -X GET "http://localhost:5001/api/drafts?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 임시저장 발행
curl -X POST http://localhost:5001/api/drafts/DRAFT_ID/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "최종 편지 제목"
  }'
```

### JavaScript 예시

```javascript
// 임시저장 생성
const saveDraft = async (draftData) => {
  const response = await fetch("/api/drafts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(draftData),
  });
  return response.json();
};

// 임시저장 목록 조회
const getDrafts = async (page = 1, limit = 10) => {
  const response = await fetch(`/api/drafts?page=${page}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
};

// 임시저장 발행
const publishDraft = async (draftId, updateData = {}) => {
  const response = await fetch(`/api/drafts/${draftId}/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });
  return response.json();
};
```

## 🚀 배포 및 모니터링

### 환경 변수

```env
# 데이터베이스
MONGODB_URI=mongodb://localhost:27017/letter-community

# JWT
JWT_SECRET=your-jwt-secret

# 세션
SESSION_SECRET=your-session-secret

# 프론트엔드 URL
FRONTEND_URL=http://localhost:3000

# 환경
NODE_ENV=production
```

### 로그 모니터링

임시저장 관련 모든 작업은 상세한 로그를 남깁니다:

- `🔍 [DEBUG]`: 디버그 정보
- `✅ [DEBUG]`: 성공 작업
- `❌ [DEBUG]`: 에러 발생
- `📊 [DEBUG]`: 통계 정보
- `🧹 [CRON]`: 크론 작업
- `⏰ [CRON]`: 크론 스케줄링

### 성능 최적화

- MongoDB 인덱스 최적화
- 페이지네이션으로 대용량 데이터 처리
- 자동 정리로 데이터베이스 크기 관리
- 캐싱 전략 (Redis 권장)

## 📞 지원

문제가 발생하거나 추가 기능이 필요한 경우:

1. GitHub Issues 등록
2. API 로그 확인
3. 테스트 케이스 실행
4. 개발팀 문의

---

**버전**: 1.0.0  
**최종 업데이트**: 2024-01-02  
**작성자**: Letter Community Team
