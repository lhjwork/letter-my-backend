# 📮 누적 실물 편지 신청 시스템 API 문서

## 📋 개요

누적 실물 편지 신청 시스템은 편지 URL을 통해 접속한 각 방문자가 개별적으로 실물 편지를 신청할 수 있는 시스템입니다. 편지 작성자와 방문자 모두 동일한 방식으로 편지를 신청할 수 있으며, 익명 신청이 가능합니다.

## 🎯 주요 특징

- **익명 신청 가능**: 로그인 없이도 실물 편지 신청
- **세션 기반 관리**: 세션 ID를 통한 개별 신청 추적
- **누적 신청 현황**: 편지별 총 신청 수 및 통계 관리
- **스팸 방지**: 동일 세션 요청 제한 및 IP 기반 모니터링
- **관리자 도구**: 완전한 관리자 인터페이스

## 🏗️ 시스템 구조

### 데이터 모델

#### CumulativePhysicalLetterRequest

```typescript
interface ICumulativePhysicalLetterRequest {
  letterId: ObjectId;

  // 신청자 정보 (익명 가능)
  requesterInfo: {
    sessionId: string;
    userAgent?: string;
    ipAddress?: string; // 해시 처리
    requestedAt: Date;
  };

  // 수신자 정보
  recipientInfo: {
    name: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  };

  // 상태 및 비용
  status: CumulativeRequestStatus;
  cost: {
    shippingCost: number;
    letterCost: number;
    totalCost: number;
  };

  // 배송 정보
  shipping: {
    trackingNumber?: string;
    shippingCompany?: string;
    sentAt?: Date;
    deliveredAt?: Date;
  };

  // 관리자 메모
  adminNotes: Array<{
    note: string;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

#### Letter 모델 확장

```typescript
interface ILetter {
  // 기존 필드들...
  physicalRequestCount: number; // 누적 신청 수
}
```

## 📡 API 엔드포인트

### 1. 사용자 API

#### 1.1 개별 실물 편지 신청

```http
POST /api/letters/:letterId/cumulative-physical-request
Content-Type: application/json
```

**요청 본문:**

```json
{
  "address": {
    "name": "김철수",
    "phone": "010-1234-5678",
    "zipCode": "12345",
    "address1": "서울시 강남구 테헤란로 123",
    "address2": "456호",
    "memo": "문 앞에 놓아주세요"
  }
}
```

**응답:**

```json
{
  "success": true,
  "message": "실물 편지 신청이 완료되었습니다.",
  "data": {
    "requestId": "64f8a1b2c3d4e5f6a7b8c9d1",
    "cost": 5000,
    "status": "requested"
  }
}
```

#### 1.2 편지별 누적 신청 현황 조회

```http
GET /api/letters/:letterId/cumulative-physical-requests?page=1&limit=20&status=requested
```

**응답:**

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "recipientInfo": {
          "name": "김철수",
          "phone": "010-1234-5678",
          "zipCode": "12345",
          "address1": "서울시 강남구 테헤란로 123",
          "address2": "456호"
        },
        "status": "requested",
        "cost": {
          "totalCost": 5000
        },
        "createdAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalRequests": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "summary": {
      "totalRequests": 1,
      "statusCounts": {
        "requested": 1,
        "confirmed": 0,
        "writing": 0,
        "sent": 0,
        "delivered": 0,
        "failed": 0,
        "cancelled": 0
      },
      "totalCost": 5000
    }
  }
}
```

#### 1.3 개별 신청 상태 조회

```http
GET /api/cumulative-physical-requests/:requestId
```

**응답:**

```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "letterId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "소중한 사람에게",
      "content": "<p>편지 내용...</p>"
    },
    "recipientInfo": {
      "name": "김철수",
      "phone": "010-1234-5678",
      "zipCode": "12345",
      "address1": "서울시 강남구 테헤란로 123",
      "address2": "456호",
      "memo": "문 앞에 놓아주세요"
    },
    "status": "confirmed",
    "cost": {
      "shippingCost": 3000,
      "letterCost": 2000,
      "totalCost": 5000
    },
    "shipping": {
      "trackingNumber": "1234567890",
      "shippingCompany": "우체국택배"
    },
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
}
```

#### 1.4 요청 제한 체크 (스팸 방지)

```http
GET /api/letters/:letterId/request-limit-check
```

**응답:**

```json
{
  "success": true,
  "data": {
    "canRequest": true,
    "remainingRequests": 4,
    "maxRequestsPerDay": 5,
    "recentRequestCount": 1
  }
}
```

### 2. 관리자 API

#### 2.1 전체 신청 목록 조회

```http
GET /api/admin/cumulative-physical-requests
Authorization: Bearer {admin_token}
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 50)
- `status`: 상태 필터
- `letterId`: 특정 편지 ID 필터
- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)

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
          "title": "소중한 사람에게",
          "type": "friend"
        },
        "recipientInfo": {
          "name": "김철수",
          "phone": "010-1234-5678",
          "zipCode": "12345",
          "address1": "서울시 강남구 테헤란로 123"
        },
        "status": "requested",
        "cost": {
          "totalCost": 5000
        },
        "createdAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalRequests": 1
    }
  }
}
```

#### 2.2 신청 상태 업데이트

```http
PATCH /api/admin/cumulative-physical-requests/:requestId
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**요청 본문:**

```json
{
  "status": "confirmed",
  "trackingNumber": "1234567890",
  "shippingCompany": "우체국택배",
  "adminNote": "확인 완료, 작성 시작"
}
```

**응답:**

```json
{
  "success": true,
  "message": "신청 상태가 업데이트되었습니다.",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "status": "confirmed",
    "shipping": {
      "trackingNumber": "1234567890",
      "shippingCompany": "우체국택배"
    },
    "adminNotes": [
      {
        "note": "확인 완료, 작성 시작",
        "createdAt": "2024-01-11T14:30:00.000Z",
        "createdBy": "admin-id"
      }
    ],
    "updatedAt": "2024-01-11T14:30:00.000Z"
  }
}
```

#### 2.3 인기 편지 분석

```http
GET /api/admin/analytics/popular-letters?limit=20
Authorization: Bearer {admin_token}
```

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "letterId": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "소중한 사람에게",
      "ogTitle": "소중한 사람에게",
      "type": "friend",
      "requestCount": 15,
      "totalRevenue": 75000,
      "avgCost": 5000
    }
  ]
}
```

#### 2.4 통계 대시보드

```http
GET /api/admin/cumulative-physical-requests/stats?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {admin_token}
```

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
      }
    ],
    "dailyStats": []
  }
}
```

## 💰 비용 체계

### 배송비 계산

- **서울/경기 지역**: 3,000원 (우편번호 01-19)
- **기타 지역**: 3,500원

### 편지 작성비

- **고정**: 2,000원

### 총 비용 계산

```javascript
function calculateCost(zipCode) {
  const seoulGyeonggi = ["01", "02", "03", "04", "05", "06", "07", "08", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];
  const prefix = zipCode.substring(0, 2);
  const shippingCost = seoulGyeonggi.includes(prefix) ? 3000 : 3500;
  const letterCost = 2000;
  return shippingCost + letterCost;
}
```

## 🔒 보안 및 개인정보 보호

### 1. 개인정보 보호

- **IP 주소 해시 처리**: SHA-256 + Salt
- **민감 정보 제외**: API 응답에서 IP 주소 및 관리자 메모 제외
- **세션 기반 접근 제어**: 본인 신청만 조회 가능

### 2. 스팸 방지

- **요청 제한**: 동일 세션에서 하루 최대 5회 신청
- **Rate Limiting**: IP 기반 요청 빈도 제한
- **의심 패턴 감지**: 비정상적인 신청 패턴 모니터링

### 3. 데이터 무결성

- **트랜잭션 처리**: 신청 생성과 편지 통계 업데이트 원자성 보장
- **유효성 검사**: 강화된 입력 데이터 검증
- **에러 로깅**: 모든 오류 상황 로깅 및 모니터링

## 🛠️ 기술 구현 세부사항

### 세션 관리

```javascript
// Express Session 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24시간
    },
  })
);
```

### IP 해시 처리

```javascript
function hashIP(ip) {
  const salt = process.env.IP_SALT || "default-salt";
  return crypto
    .createHash("sha256")
    .update(ip + salt)
    .digest("hex");
}
```

### 주소 유효성 검사

```javascript
const addressValidation = [
  body("address.name").trim().isLength({ min: 2, max: 50 }),
  body("address.phone").matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/),
  body("address.zipCode").matches(/^[0-9]{5}$/),
  body("address.address1").trim().isLength({ min: 5, max: 200 }),
  body("address.address2").optional().trim().isLength({ max: 200 }),
  body("address.memo").optional().trim().isLength({ max: 500 }),
];
```

## 📊 모니터링 및 분석

### 주요 지표

1. **신청 성공률**: 전체 신청 대비 성공한 신청 비율
2. **평균 처리 시간**: 신청부터 배송 완료까지 소요 시간
3. **지역별 분포**: 우편번호 기반 신청 지역 분석
4. **인기 편지**: 신청 수가 많은 편지 순위
5. **취소율**: 전체 신청 대비 취소된 신청 비율

### 대시보드 기능

- 실시간 신청 현황
- 일별/월별 통계
- 지역별 히트맵
- 수익 분석
- 처리 상태별 분포

## 🚀 배포 및 운영

### 환경 변수

```env
# 세션 관리
SESSION_SECRET=your-session-secret-key

# IP 해시 처리
IP_SALT=your-ip-salt-key

# MongoDB 연결
MONGODB_URI=mongodb://localhost:27017/letter-db

# CORS 설정
ALLOWED_ORIGINS=http://localhost:3000,https://letter-community.vercel.app
```

### 데이터베이스 인덱스

```javascript
// 성능 최적화를 위한 인덱스
db.cumulativephysicalletterrequests.createIndex({ letterId: 1, "requesterInfo.sessionId": 1 });
db.cumulativephysicalletterrequests.createIndex({ status: 1, createdAt: -1 });
db.cumulativephysicalletterrequests.createIndex({ "requesterInfo.requestedAt": -1 });
```

### 마이그레이션 실행

```bash
# 기존 편지에 physicalRequestCount 필드 추가
npm run migrate:cumulative-physical-letter

# 시스템 테스트
npm run test:cumulative-physical-letter

# 테스트 데이터 정리
npm run test:cumulative-physical-letter -- --cleanup
```

## 📝 프론트엔드 연동 가이드

### 1. 실물 편지 신청

```javascript
const requestPhysicalLetter = async (letterId, addressData) => {
  try {
    const response = await fetch(`/api/letters/${letterId}/cumulative-physical-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 세션 쿠키 포함
      body: JSON.stringify({ address: addressData }),
    });

    const result = await response.json();
    if (result.success) {
      return result.data;
    }
  } catch (error) {
    console.error("신청 실패:", error);
  }
};
```

### 2. 신청 현황 조회

```javascript
const getLetterRequests = async (letterId, page = 1) => {
  try {
    const response = await fetch(`/api/letters/${letterId}/cumulative-physical-requests?page=${page}`, { credentials: "include" });

    const result = await response.json();
    if (result.success) {
      return result.data;
    }
  } catch (error) {
    console.error("조회 실패:", error);
  }
};
```

### 3. 개별 신청 상태 확인

```javascript
const checkRequestStatus = async (requestId) => {
  try {
    const response = await fetch(`/api/cumulative-physical-requests/${requestId}`, { credentials: "include" });

    const result = await response.json();
    if (result.success) {
      return result.data;
    }
  } catch (error) {
    console.error("상태 확인 실패:", error);
  }
};
```

## 🔧 문제 해결

### 자주 발생하는 문제

1. **세션 문제**
   - 증상: "세션 정보가 없습니다" 오류
   - 해결: 쿠키 설정 확인, credentials: 'include' 설정

2. **CORS 문제**
   - 증상: 브라우저에서 CORS 오류
   - 해결: allowedOrigins에 도메인 추가

3. **주소 유효성 검사 실패**
   - 증상: "올바른 형식이 아닙니다" 오류
   - 해결: 입력 데이터 형식 확인

### 로그 모니터링

```javascript
// 주요 로그 포인트
console.log("📮 새로운 누적 실물 편지 신청");
console.log("🔍 세션 기반 접근 제어");
console.log("💰 비용 계산 완료");
console.log("📊 통계 업데이트");
```

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024-12-24  
**작성자**: Letter Community Team
