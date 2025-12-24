# 📮 편지 작성자 승인 시스템 API 문서

## 📋 개요

편지 URL에 접속한 사람들이 여러 번 실물 편지를 신청할 수 있고, 편지 작성자가 신청자들을 확인하여 승인해야만 실제 배송이 진행되는 시스템입니다.

**Base URL**: `https://letter-my-backend.onrender.com/api`

---

## 🔗 API 엔드포인트 목록

### 1. 실물 편지 신청 (Public)

### 2. 공개 신청 현황 조회 (Public)

### 3. 요청 제한 체크 (Public)

### 4. 개별 신청 상태 조회 (Public, 세션 기반)

### 5. 작성자용 신청 목록 조회 (Private)

### 6. 신청 승인/거절 (Private)

### 7. 편지 설정 업데이트 (Private)

---

## 📝 API 상세 문서

### 1. 실물 편지 신청

**무제한으로 실물 편지를 신청할 수 있습니다. 편지 작성자의 승인이 필요합니다.**

```http
POST /api/letters/{letterId}/physical-requests
```

#### Request Body

```json
{
  "address": {
    "name": "받는분 이름",
    "phone": "010-1234-5678",
    "zipCode": "12345",
    "address1": "서울시 강남구 테스트로 123",
    "address2": "테스트빌딩 456호",
    "memo": "배송 시 주의사항"
  }
}
```

#### Validation Rules

- `name`: 2-50자, 필수
- `phone`: 휴대폰 번호 형식 (`010-1234-5678`), 필수
- `zipCode`: 5자리 숫자, 필수
- `address1`: 5-200자, 필수
- `address2`: 200자 이내, 선택
- `memo`: 500자 이내, 선택

#### Response (201 Created)

```json
{
  "success": true,
  "message": "실물 편지 신청이 완료되었습니다. 편지 작성자의 승인을 기다려주세요.",
  "data": {
    "requestId": "674b9bb30d0b7f5029a882a3",
    "cost": 0,
    "status": "pending",
    "needsApproval": true
  }
}
```

#### 자동 승인인 경우 Response

```json
{
  "success": true,
  "message": "실물 편지 신청이 자동 승인되었습니다.",
  "data": {
    "requestId": "674b9bb30d0b7f5029a882a3",
    "cost": 0,
    "status": "approved",
    "needsApproval": false
  }
}
```

#### Error Responses

```json
// 편지를 찾을 수 없는 경우
{
  "success": false,
  "error": "편지를 찾을 수 없습니다."
}

// 신청이 허용되지 않는 경우
{
  "success": false,
  "error": "이 편지는 실물 편지 신청이 허용되지 않습니다."
}

// 최대 신청 수 초과
{
  "success": false,
  "error": "1인당 최대 5개까지만 신청할 수 있습니다."
}

// 유효성 검사 실패
{
  "success": false,
  "error": "받는 분 성함은 2자 이상이어야 합니다."
}
```

---

### 2. 공개 신청 현황 조회

**편지별 승인된 신청 현황을 공개적으로 조회합니다. 개인정보는 마스킹됩니다.**

```http
GET /api/letters/{letterId}/physical-requests/public?limit=10
```

#### Query Parameters

- `limit` (optional): 조회할 승인된 신청 수 (기본값: 10)

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "approvedRequests": [
      {
        "recipientName": "김***",
        "approvedAt": "2025-12-24T08:30:00.000Z",
        "cost": 0
      },
      {
        "recipientName": "이***",
        "approvedAt": "2025-12-24T07:15:00.000Z",
        "cost": 0
      }
    ],
    "summary": {
      "totalRequests": 15,
      "approvedRequests": 8,
      "pendingRequests": 5,
      "allowNewRequests": true
    }
  }
}
```

---

### 3. 요청 제한 체크

**스팸 방지를 위한 1인당 신청 제한을 확인합니다.**

```http
GET /api/letters/{letterId}/request-limit-check
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "canRequest": true,
    "remainingRequests": 3,
    "maxRequestsPerPerson": 5,
    "currentRequestCount": 2
  }
}
```

#### 세션이 없는 경우 (첫 방문자)

```json
{
  "success": true,
  "data": {
    "canRequest": true,
    "remainingRequests": 5,
    "maxRequestsPerPerson": 5,
    "currentRequestCount": 0
  }
}
```

---

### 4. 개별 신청 상태 조회

**신청자가 자신의 신청 상태를 조회합니다. 세션 기반으로 권한을 확인합니다.**

```http
GET /api/letters/physical-requests/{requestId}/status
```

#### Headers

- `Cookie`: 세션 쿠키 필요 (자동으로 설정됨)

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "674b9bb30d0b7f5029a882a3",
    "letterId": "674b92d65c6d02132a1bfa04",
    "status": "pending",
    "recipientInfo": {
      "name": "김철수",
      "phone": "010-1234-5678",
      "zipCode": "12345",
      "address1": "서울시 강남구 테스트로 123",
      "address2": "테스트빌딩 456호",
      "memo": "배송 시 주의사항"
    },
    "cost": {
      "shippingCost": 0,
      "letterCost": 0,
      "totalCost": 0
    },
    "authorApproval": {
      "isApproved": false
    },
    "createdAt": "2025-12-24T08:00:00.000Z",
    "updatedAt": "2025-12-24T08:00:00.000Z"
  }
}
```

#### 승인된 경우

```json
{
  "success": true,
  "data": {
    "_id": "674b9bb30d0b7f5029a882a3",
    "status": "approved",
    "authorApproval": {
      "isApproved": true,
      "approvedAt": "2025-12-24T09:00:00.000Z"
    }
    // ... 기타 필드
  }
}
```

#### 거절된 경우

```json
{
  "success": true,
  "data": {
    "_id": "674b9bb30d0b7f5029a882a3",
    "status": "rejected",
    "authorApproval": {
      "isApproved": false,
      "rejectedAt": "2025-12-24T09:00:00.000Z",
      "rejectionReason": "배송 불가 지역입니다."
    }
    // ... 기타 필드
  }
}
```

#### Error Responses

```json
// 세션 정보가 없는 경우
{
  "success": false,
  "error": "세션 정보가 없습니다."
}

// 접근 권한이 없는 경우
{
  "success": false,
  "error": "접근 권한이 없습니다."
}

// 신청을 찾을 수 없는 경우
{
  "success": false,
  "error": "신청을 찾을 수 없습니다."
}
```

---

## 🔐 작성자 전용 API (JWT 토큰 필요)

### 5. 작성자용 신청 목록 조회

**편지 작성자가 자신의 편지에 대한 모든 신청을 조회합니다.**

```http
GET /api/letters/{letterId}/physical-requests/author?status=pending&page=1&limit=20
```

#### Headers

```
Authorization: Bearer {JWT_TOKEN}
```

#### Query Parameters

- `status` (optional): 신청 상태 필터 (`pending`, `approved`, `rejected`, `writing`, `sent`, `delivered`, `cancelled`)
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 항목 수 (기본값: 20)

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "_id": "674b9bb30d0b7f5029a882a3",
        "letterId": "674b92d65c6d02132a1bfa04",
        "status": "pending",
        "requesterInfo": {
          "sessionId": "abc123...",
          "userAgent": "Mozilla/5.0...",
          "requestedAt": "2025-12-24T08:00:00.000Z"
        },
        "recipientInfo": {
          "name": "김철수",
          "phone": "010-1234-5678",
          "zipCode": "12345",
          "address1": "서울시 강남구 테스트로 123",
          "address2": "테스트빌딩 456호",
          "memo": "배송 시 주의사항"
        },
        "cost": {
          "shippingCost": 0,
          "letterCost": 0,
          "totalCost": 0
        },
        "authorApproval": {
          "isApproved": false
        },
        "createdAt": "2025-12-24T08:00:00.000Z",
        "updatedAt": "2025-12-24T08:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalRequests": 45,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalRequests": 45,
      "statusCounts": {
        "pending": 15,
        "approved": 20,
        "rejected": 8,
        "writing": 2
      },
      "totalApprovedCost": 0,
      "letterSettings": {
        "allowPhysicalRequests": true,
        "autoApprove": false,
        "maxRequestsPerPerson": 5,
        "requireApprovalMessage": "신청을 검토 중입니다."
      }
    }
  }
}
```

---

### 6. 신청 승인/거절

**편지 작성자가 신청을 승인하거나 거절합니다.**

```http
PATCH /api/letters/{letterId}/physical-requests/{requestId}/approval
```

#### Headers

```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

#### Request Body (승인)

```json
{
  "action": "approve"
}
```

#### Request Body (거절)

```json
{
  "action": "reject",
  "rejectionReason": "배송 불가 지역입니다."
}
```

#### Response (200 OK) - 승인

```json
{
  "success": true,
  "message": "신청이 승인되었습니다.",
  "data": {
    "_id": "674b9bb30d0b7f5029a882a3",
    "status": "approved",
    "authorApproval": {
      "isApproved": true,
      "approvedAt": "2025-12-24T09:00:00.000Z",
      "approvedBy": "674a1234567890abcdef1234"
    },
    "updatedAt": "2025-12-24T09:00:00.000Z"
    // ... 기타 필드
  }
}
```

#### Response (200 OK) - 거절

```json
{
  "success": true,
  "message": "신청이 거절되었습니다.",
  "data": {
    "_id": "674b9bb30d0b7f5029a882a3",
    "status": "rejected",
    "authorApproval": {
      "isApproved": false,
      "rejectedAt": "2025-12-24T09:00:00.000Z",
      "rejectionReason": "배송 불가 지역입니다."
    },
    "updatedAt": "2025-12-24T09:00:00.000Z"
    // ... 기타 필드
  }
}
```

#### Error Responses

```json
// 편지 작성자가 아닌 경우
{
  "success": false,
  "error": "편지 작성자만 접근할 수 있습니다."
}

// 이미 처리된 신청인 경우
{
  "success": false,
  "error": "이미 처리된 신청입니다."
}

// 유효하지 않은 액션
{
  "success": false,
  "error": "유효하지 않은 액션입니다."
}
```

---

### 7. 편지 설정 업데이트

**편지 작성자가 실물 편지 신청 관련 설정을 업데이트합니다.**

```http
PATCH /api/letters/{letterId}/settings
```

#### Headers

```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

#### Request Body

```json
{
  "authorSettings": {
    "allowPhysicalRequests": true,
    "autoApprove": false,
    "maxRequestsPerPerson": 3,
    "requireApprovalMessage": "신청을 신중히 검토하고 있습니다."
  }
}
```

#### 설정 필드 설명

- `allowPhysicalRequests`: 실물 편지 신청 허용 여부 (기본값: true)
- `autoApprove`: 자동 승인 여부 (기본값: false)
- `maxRequestsPerPerson`: 1인당 최대 신청 수 (1-20, 기본값: 5)
- `requireApprovalMessage`: 승인 요청 메시지 (1000자 이내)

#### Response (200 OK)

```json
{
  "success": true,
  "message": "설정이 업데이트되었습니다.",
  "data": {
    "allowPhysicalRequests": true,
    "autoApprove": false,
    "maxRequestsPerPerson": 3,
    "requireApprovalMessage": "신청을 신중히 검토하고 있습니다."
  }
}
```

---

## 📊 신청 상태 (Status)

| 상태        | 설명         |
| ----------- | ------------ |
| `pending`   | 승인 대기 중 |
| `approved`  | 승인됨       |
| `rejected`  | 거절됨       |
| `writing`   | 편지 작성 중 |
| `sent`      | 발송됨       |
| `delivered` | 배송 완료    |
| `cancelled` | 취소됨       |

---

## 💰 비용 계산

- **편지 작성비**: 0원 (현재 무료 버전)
- **배송비**: 0원 (무료)
- **총 비용**: 0원 (완전 무료)

---

## 🔒 보안 및 제한사항

### 세션 기반 식별

- 익명 사용자도 신청 가능
- 세션 ID로 신청자 식별
- IP 주소는 해시 처리하여 저장

### 스팸 방지

- 1인당 최대 신청 수 제한 (편지별 설정 가능)
- 세션 기반 중복 신청 방지
- 유효성 검사를 통한 잘못된 데이터 차단

### 개인정보 보호

- 공개 API에서는 개인정보 마스킹
- 작성자만 상세 신청 정보 접근 가능
- IP 주소 해시 처리

---

## 🧪 테스트 예제

### cURL 예제

#### 1. 실물 편지 신청

```bash
curl -X POST https://letter-my-backend.onrender.com/api/letters/674b92d65c6d02132a1bfa04/physical-requests \
  -H "Content-Type: application/json" \
  -d '{
    "address": {
      "name": "김철수",
      "phone": "010-1234-5678",
      "zipCode": "12345",
      "address1": "서울시 강남구 테스트로 123",
      "address2": "테스트빌딩 456호",
      "memo": "배송 시 주의사항"
    }
  }'
```

#### 2. 공개 신청 현황 조회

```bash
curl https://letter-my-backend.onrender.com/api/letters/674b92d65c6d02132a1bfa04/physical-requests/public?limit=5
```

#### 3. 작성자용 신청 목록 조회

```bash
curl https://letter-my-backend.onrender.com/api/letters/674b92d65c6d02132a1bfa04/physical-requests/author \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 4. 신청 승인

```bash
curl -X PATCH https://letter-my-backend.onrender.com/api/letters/674b92d65c6d02132a1bfa04/physical-requests/674b9bb30d0b7f5029a882a3/approval \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'
```

---

## ❓ FAQ

### Q: 한 사람이 몇 개까지 신청할 수 있나요?

A: 편지 작성자가 설정한 `maxRequestsPerPerson` 값에 따라 다릅니다. 기본값은 5개입니다.

### Q: 자동 승인 기능이 있나요?

A: 네, 편지 작성자가 `autoApprove`를 true로 설정하면 신청 즉시 자동 승인됩니다.

### Q: 신청자가 자신의 신청을 취소할 수 있나요?

A: 현재 버전에서는 신청자가 직접 취소할 수 없습니다. 편지 작성자가 거절 처리해야 합니다.

### Q: 편지 작성자가 신청을 승인하지 않으면 어떻게 되나요?

A: 신청은 `pending` 상태로 유지되며, 작성자가 승인하거나 거절할 때까지 대기합니다.

### Q: 배송비는 어떻게 계산되나요?

A: 현재는 완전 무료 버전입니다. 편지 작성비와 배송비 모두 0원입니다.

---

**마지막 업데이트**: 2025-12-24  
**API 버전**: v1.0  
**작성자**: Kiro AI Assistant
