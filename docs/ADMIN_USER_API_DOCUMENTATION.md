# Letter My Admin 백엔드 API 문서

## 개요

Letter My 서비스의 관리자 페이지를 위한 백엔드 API입니다.

## 기본 정보

- **Base URL**: `http://localhost:5001/api/admin`
- **인증 방식**: JWT Bearer Token
- **Content-Type**: `application/json`

## 인증

모든 API 요청에는 JWT 토큰이 필요합니다.

```
Authorization: Bearer <token>
```

## API 엔드포인트

### 1. 사용자 관리

#### 1.1 사용자 목록 조회

```
GET /api/admin/users
```

**권한**: `admin` (users.read)

**쿼리 파라미터**:

- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 항목 수 (기본값: 20, 최대: 100)
- `search` (optional): 검색어 (이름 또는 이메일)
- `sortBy` (optional): 정렬 기준 (`createdAt`, `name`, `letterCount`)
- `sortOrder` (optional): 정렬 순서 (`asc`, `desc`)
- `status` (optional): 사용자 상태 (`active`, `inactive`, `all`)

**응답**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "user123",
      "email": "user@example.com",
      "name": "사용자명",
      "image": "https://example.com/profile.jpg",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-12-22T00:00:00.000Z",
      "letterCount": 15
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### 1.2 사용자 검색

```
GET /api/admin/users/search
```

**권한**: `admin` (users.read)

**쿼리 파라미터**:

- `query` (required): 검색어 (이름 또는 이메일)
- `limit` (optional): 결과 개수 제한 (기본값: 10, 최대: 50)
- `status` (optional): 사용자 상태 필터 (`active`, `inactive`, `deleted`, `all`)

**응답**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "user123",
      "email": "user@example.com",
      "name": "사용자명",
      "image": "https://example.com/profile.jpg",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "letterCount": 5,
      "lastActiveAt": "2024-12-20T00:00:00.000Z"
    }
  ]
}
```

#### 1.3 사용자 상세 정보 (통계 포함)

```
GET /api/admin/users/:userId/detail
```

**권한**: `admin` (users.read)

**응답**:

```json
{
  "success": true,
  "data": {
    "_id": "69365701abedd0b95bbe32d2",
    "email": "user@example.com",
    "name": "사용자명",
    "image": "https://example.com/profile.jpg",
    "status": "active",
    "oauthAccounts": [
      {
        "provider": "kakao",
        "providerId": "kakao123456"
      }
    ],
    "addresses": [
      {
        "_id": "addr123",
        "addressName": "집",
        "recipientName": "홍길동",
        "zipCode": "12345",
        "address": "서울시 강남구",
        "addressDetail": "101동 101호",
        "phone": "010-1234-5678",
        "isDefault": true
      }
    ],
    "inactiveAt": null,
    "inactiveReason": null,
    "deletedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-12-22T00:00:00.000Z",
    "letterCount": 15,
    "lastActiveAt": "2024-12-22T00:00:00.000Z",
    "stats": {
      "totalLetters": 15,
      "totalStories": 8,
      "totalViews": 1250,
      "totalLikes": 89,
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "lastActiveAt": "2024-12-22T00:00:00.000Z"
    }
  }
}
```

#### 1.4 사용자 통계 정보

```
GET /api/admin/users/:userId/stats
```

**권한**: `admin` (users.read)

**응답**:

```json
{
  "success": true,
  "data": {
    "totalLetters": 15,
    "totalStories": 8,
    "totalViews": 1250,
    "totalLikes": 89,
    "joinedAt": "2024-01-01T00:00:00.000Z",
    "lastActiveAt": "2024-12-22T00:00:00.000Z"
  }
}
```

#### 1.5 사용자 작성 편지 목록

```
GET /api/admin/users/:userId/letters
```

**권한**: `admin` (letters.read)

**쿼리 파라미터**:

- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 항목 수 (기본값: 20, 최대: 100)
- `status` (optional): 편지 상태 필터 (`created`, `published`, `hidden`, `deleted`, `all`)

**응답**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "letter123",
      "type": "letter",
      "userId": "69365701abedd0b95bbe32d2",
      "title": "편지 제목",
      "content": "편지 내용입니다...",
      "authorName": "작성자명",
      "category": "가족",
      "status": "published",
      "viewCount": 150,
      "likeCount": 12,
      "hiddenAt": null,
      "hiddenReason": null,
      "deletedAt": null,
      "createdAt": "2024-12-01T00:00:00.000Z",
      "updatedAt": "2024-12-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### 1.6 사용자 상태 변경

```
PUT /api/admin/users/:userId/status
```

**권한**: `super_admin`

**요청 본문**:

```json
{
  "status": "active" // 또는 "inactive"
}
```

**응답**:

```json
{
  "success": true,
  "data": {
    "_id": "user123",
    "email": "user@example.com",
    "name": "사용자명",
    "status": "active",
    "updatedAt": "2024-12-22T00:00:00.000Z"
  },
  "message": "사용자 상태가 active로 변경되었습니다."
}
```

#### 1.7 사용자 삭제

```
DELETE /api/admin/users/:userId
```

**권한**: `super_admin`

**응답**:

```json
{
  "success": true,
  "message": "사용자가 삭제되었습니다."
}
```

#### 1.8 대시보드 통계

```
GET /api/admin/users/dashboard-stats
```

**권한**: `admin` (users.read)

**응답**:

```json
{
  "success": true,
  "data": {
    "totalUsers": 1500,
    "activeUsers": 1450,
    "inactiveUsers": 50,
    "recentUsers": [
      {
        "_id": "user123",
        "name": "사용자명",
        "email": "user@example.com",
        "createdAt": "2024-12-22T00:00:00.000Z"
      }
    ]
  }
}
```

## 오류 응답

### 표준 오류 형식

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "사용자를 찾을 수 없습니다",
    "details": {}
  }
}
```

### 오류 코드

| 코드                   | HTTP 상태 | 설명                  |
| ---------------------- | --------- | --------------------- |
| `USER_NOT_FOUND`       | 404       | 사용자를 찾을 수 없음 |
| `INVALID_PARAMETERS`   | 400       | 잘못된 파라미터       |
| `SEARCH_TERM_REQUIRED` | 400       | 검색어가 필요함       |
| `INVALID_STATUS`       | 400       | 유효하지 않은 상태값  |
| `UNAUTHORIZED`         | 401       | 인증 실패             |
| `FORBIDDEN`            | 403       | 권한 없음             |
| `INTERNAL_ERROR`       | 500       | 서버 내부 오류        |

## 데이터 타입

### LetterStatus

- `created`: 작성됨
- `published`: 게시됨
- `hidden`: 숨김
- `deleted`: 삭제됨

### LetterType

- `story`: 스토리
- `letter`: 편지

### LetterCategory

- `가족`
- `사랑`
- `우정`
- `성장`
- `위로`
- `추억`
- `감사`
- `기타`

### UserStatus

- `active`: 활성
- `inactive`: 비활성
- `deleted`: 삭제됨

### OAuthProvider

- `instagram`
- `naver`
- `kakao`

## 성능 최적화

### 데이터베이스 인덱스

다음 인덱스들이 자동으로 생성됩니다:

**User 컬렉션**:

- `email` (unique)
- `name`
- `status`
- `oauthAccounts.provider + oauthAccounts.providerId` (복합)

**Letter 컬렉션**:

- `userId`
- `status`
- `createdAt`
- `type`
- `category`
- `userId + status + createdAt` (복합, 사용자별 편지 조회 최적화)

### 인덱스 생성 방법

```bash
npx ts-node scripts/createIndexes.ts
```

## 테스트

### 사용자 검색 예제

```bash
# 이름으로 검색
curl -X GET "http://localhost:5001/api/admin/users/search?query=홍길동&limit=10" \
  -H "Authorization: Bearer <token>"

# 활성 사용자만 검색
curl -X GET "http://localhost:5001/api/admin/users/search?query=홍길동&status=active" \
  -H "Authorization: Bearer <token>"
```

### 사용자 편지 목록 조회 예제

```bash
# 게시된 편지만 조회
curl -X GET "http://localhost:5001/api/admin/users/69365701abedd0b95bbe32d2/letters?page=1&limit=10&status=published" \
  -H "Authorization: Bearer <token>"

# 모든 편지 조회
curl -X GET "http://localhost:5001/api/admin/users/69365701abedd0b95bbe32d2/letters?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### 사용자 상세 정보 조회 예제

```bash
curl -X GET "http://localhost:5001/api/admin/users/69365701abedd0b95bbe32d2/detail" \
  -H "Authorization: Bearer <token>"
```

## 변경 이력

### 2024-12-22

- 사용자 검색 API에 `status` 필터 추가
- 사용자 편지 목록 API에 `status` 필터 추가
- 모든 API에 표준 오류 응답 형식 적용
- 권한 주석 추가 (users.read, letters.read 등)
- 데이터베이스 인덱스 생성 스크립트 추가
- 성능 최적화를 위한 복합 인덱스 추가
