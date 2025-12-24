# 다중 수신자 실물 편지 시스템 API 문서

## 📋 개요

다중 수신자 실물 편지 시스템은 한 편지를 여러 명의 수신자에게 동시에 실물 편지로 발송할 수 있는 기능입니다. 각 수신자별로 개별 요청이 생성되며, 독립적인 상태 관리가 가능합니다.

## 🏗️ 시스템 구조

### 모델 구조

- **Letter**: 기본 편지 정보 + 다중 수신자 관련 필드
- **PhysicalLetterRequest**: 개별 수신자별 실물 편지 요청 정보

### 주요 특징

- 한 번에 최대 10명까지 신청 가능
- 수신자별 독립적인 상태 관리
- 지역별 차등 배송비 적용
- 트랜잭션 기반 일관성 보장

## 📡 API 엔드포인트

### 1. 사용자 API

#### 1.1 다중 수신자 실물 편지 신청

```http
POST /api/letters/:letterId/multiple-physical-request
Authorization: Bearer {token}
Content-Type: application/json
```

**요청 본문:**

```json
{
  "recipients": [
    {
      "name": "김철수",
      "phone": "010-1234-5678",
      "zipCode": "12345",
      "address1": "서울시 강남구 테헤란로 123",
      "address2": "456호",
      "memo": "문 앞에 놓아주세요"
    },
    {
      "name": "이영희",
      "phone": "010-9876-5432",
      "zipCode": "54321",
      "address1": "부산시 해운대구 해운대로 789",
      "address2": "",
      "memo": ""
    }
  ]
}
```

**응답:**

```json
{
  "success": true,
  "message": "다중 수신자 실물 편지 신청이 완료되었습니다.",
  "data": {
    "letterId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "totalRecipients": 2,
    "totalCost": 11000,
    "requests": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "recipientName": "김철수",
        "address": "(12345) 서울시 강남구 테헤란로 123 456호",
        "cost": 5000,
        "status": "requested"
      },
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "recipientName": "이영희",
        "address": "(54321) 부산시 해운대구 해운대로 789",
        "cost": 5500,
        "status": "requested"
      }
    ]
  }
}
```

#### 1.2 편지의 실물 편지 요청 목록 조회

```http
GET /api/letters/:letterId/physical-requests
Authorization: Bearer {token}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRequests": 2,
      "statusCounts": {
        "requested": 1,
        "confirmed": 1,
        "writing": 0,
        "sent": 0,
        "delivered": 0,
        "failed": 0,
        "cancelled": 0
      },
      "totalCost": 11000
    },
    "requests": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "recipientInfo": {
          "name": "김철수",
          "phone": "010-1234-5678",
          "zipCode": "12345",
          "address1": "서울시 강남구 테헤란로 123",
          "address2": "456호",
          "memo": "문 앞에 놓아주세요"
        },
        "status": "confirmed",
        "cost": 5000,
        "trackingNumber": "1234567890",
        "shippingCompany": "우체국택배",
        "estimatedDelivery": "2024-01-15T00:00:00.000Z",
        "requestedAt": "2024-01-10T10:00:00.000Z",
        "confirmedAt": "2024-01-11T14:30:00.000Z"
      }
    ]
  }
}
```

#### 1.3 개별 실물 편지 요청 취소

```http
DELETE /api/letters/physical-requests/:requestId
Authorization: Bearer {token}
```

**응답:**

```json
{
  "success": true,
  "message": "실물 편지 요청이 취소되었습니다.",
  "data": {
    "requestId": "64f8a1b2c3d4e5f6a7b8c9d1",
    "recipientName": "김철수",
    "status": "cancelled"
  }
}
```

### 2. 관리자 API

#### 2.1 실물 편지 요청 목록 조회

```http
GET /api/admin/multiple-physical-requests
Authorization: Bearer {admin_token}
```

**쿼리 파라미터:**

- `status`: 상태 필터 (requested, confirmed, writing, sent, delivered, failed, cancelled, all)
- `letterId`: 특정 편지 ID 필터
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20)
- `sortBy`: 정렬 기준 (기본값: requestedAt)
- `sortOrder`: 정렬 순서 (desc, asc, 기본값: desc)

**응답:**

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "letterId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
          "title": "소중한 사람에게"
        },
        "requesterId": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9e0",
          "name": "홍길동",
          "email": "hong@example.com"
        },
        "recipientInfo": {
          "name": "김철수",
          "phone": "010-1234-5678",
          "zipCode": "12345",
          "address1": "서울시 강남구 테헤란로 123",
          "address2": "456호"
        },
        "status": "requested",
        "totalCost": 5000,
        "requestedAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "stats": {
      "requested": {
        "count": 1,
        "totalCost": 5000
      }
    }
  }
}
```

#### 2.2 실물 편지 요청 상태 업데이트

```http
PUT /api/admin/multiple-physical-requests/:requestId
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**요청 본문:**

```json
{
  "status": "confirmed",
  "adminNotes": "확인 완료, 작성 시작",
  "trackingNumber": "1234567890",
  "shippingCompany": "우체국택배",
  "estimatedDelivery": "2024-01-15"
}
```

**응답:**

```json
{
  "success": true,
  "message": "실물 편지 요청 상태가 업데이트되었습니다.",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "status": "confirmed",
    "adminNotes": "확인 완료, 작성 시작",
    "trackingNumber": "1234567890",
    "shippingCompany": "우체국택배",
    "estimatedDelivery": "2024-01-15T00:00:00.000Z",
    "confirmedAt": "2024-01-11T14:30:00.000Z",
    "updatedAt": "2024-01-11T14:30:00.000Z"
  }
}
```

#### 2.3 일괄 상태 업데이트

```http
PUT /api/admin/multiple-physical-requests/bulk-update
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**요청 본문:**

```json
{
  "requestIds": ["64f8a1b2c3d4e5f6a7b8c9d1", "64f8a1b2c3d4e5f6a7b8c9d2"],
  "updateData": {
    "status": "writing",
    "adminNotes": "일괄 작성 시작"
  }
}
```

**응답:**

```json
{
  "success": true,
  "message": "2개의 요청이 업데이트되었습니다.",
  "data": {
    "updated": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "status": "writing"
      },
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "status": "writing"
      }
    ],
    "errors": [],
    "totalRequested": 2,
    "successCount": 2,
    "errorCount": 0
  }
}
```

#### 2.4 통계 조회

```http
GET /api/admin/multiple-physical-requests/stats
Authorization: Bearer {admin_token}
```

**쿼리 파라미터:**

- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)

**응답:**

```json
{
  "success": true,
  "data": {
    "totalRequests": 150,
    "statusBreakdown": {
      "requested": 20,
      "confirmed": 30,
      "writing": 25,
      "sent": 40,
      "delivered": 30,
      "failed": 3,
      "cancelled": 2
    },
    "totalRevenue": 750000,
    "averageProcessingTime": 3.5,
    "topRegions": [
      {
        "region": "서울/경기",
        "count": 80,
        "percentage": 53.3
      },
      {
        "region": "기타지역",
        "count": 70,
        "percentage": 46.7
      }
    ],
    "dailyStats": []
  }
}
```

## 💰 비용 계산

### 배송비

- **서울/경기 지역**: 3,000원
- **기타 지역**: 3,500원

### 편지 작성비

- **고정**: 2,000원

### 총 비용

```
총 비용 = 배송비 + 편지 작성비
```

**예시:**

- 서울 지역: 3,000원 + 2,000원 = 5,000원
- 부산 지역: 3,500원 + 2,000원 = 5,500원

## 📊 상태 관리

### 실물 편지 요청 상태

1. **requested**: 신청됨
2. **confirmed**: 확인됨
3. **writing**: 작성 중
4. **sent**: 발송됨
5. **delivered**: 배송 완료
6. **failed**: 실패
7. **cancelled**: 취소됨

### 상태 전환 규칙

- `requested` → `confirmed` → `writing` → `sent` → `delivered`
- `requested` 또는 `confirmed` 상태에서만 취소 가능
- `failed` 상태는 어느 단계에서든 가능

## 🔒 권한 관리

### 사용자 권한

- 본인이 작성한 편지에 대해서만 신청/조회/취소 가능
- 로그인 필수

### 관리자 권한

- 모든 실물 편지 요청 조회/관리 가능
- `LETTERS_READ`: 조회 권한
- `LETTERS_WRITE`: 수정 권한

## 🛡️ 보안 및 검증

### 입력 데이터 검증

- 수신자 수: 1-10명
- 이름: 2-50자
- 휴대폰: 01X-XXXX-XXXX 형식
- 우편번호: 5자리 숫자
- 주소: 5-200자

### 중복 신청 방지

- 동일 편지에 대한 중복 신청 허용 (다른 수신자)
- 동일 수신자에 대한 중복 신청 방지는 비즈니스 로직에서 처리

## 🔄 트랜잭션 처리

모든 다중 수신자 신청은 MongoDB 트랜잭션으로 처리되어 데이터 일관성을 보장합니다:

1. PhysicalLetterRequest 문서들 일괄 생성
2. Letter 문서의 다중 수신자 관련 필드 업데이트
3. 실패 시 모든 변경사항 롤백

## 📱 프론트엔드 연동 가이드

### 1. 다중 수신자 신청 폼

```javascript
const submitMultipleRequest = async (letterId, recipients) => {
  try {
    const response = await fetch(`/api/letters/${letterId}/multiple-physical-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipients }),
    });

    const result = await response.json();
    if (result.success) {
      // 성공 처리
      console.log("신청 완료:", result.data);
    }
  } catch (error) {
    console.error("신청 실패:", error);
  }
};
```

### 2. 요청 목록 조회

```javascript
const getPhysicalRequests = async (letterId) => {
  try {
    const response = await fetch(`/api/letters/${letterId}/physical-requests`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (result.success) {
      return result.data;
    }
  } catch (error) {
    console.error("조회 실패:", error);
  }
};
```

### 3. 요청 취소

```javascript
const cancelRequest = async (requestId) => {
  try {
    const response = await fetch(`/api/letters/physical-requests/${requestId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (result.success) {
      // 취소 완료 처리
      console.log("취소 완료:", result.data);
    }
  } catch (error) {
    console.error("취소 실패:", error);
  }
};
```

## 🚀 배포 및 운영

### 환경 변수

```env
# MongoDB 연결
MONGODB_URI=mongodb://localhost:27017/letter-db

# JWT 설정
JWT_SECRET=your-jwt-secret
ADMIN_JWT_SECRET=your-admin-jwt-secret

# CORS 설정
ALLOWED_ORIGINS=http://localhost:3000,https://letter-community.vercel.app
```

### 모니터링 포인트

1. 신청 성공률
2. 평균 처리 시간
3. 지역별 신청 분포
4. 취소율
5. 배송 완료율

## 📝 추가 개발 사항

### 향후 개선 계획

1. 실시간 알림 시스템
2. 배송 추적 연동
3. 자동 상태 업데이트
4. 비용 할인 시스템
5. 대량 신청 지원 (10명 초과)

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024-12-24  
**작성자**: Letter Community Team
