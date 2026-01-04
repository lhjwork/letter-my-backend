# 📊 광고 QR 시스템 API 문서

## 📋 개요

Letter Community 서비스의 광고 QR 시스템 API입니다.  
실물 편지에 광고주 QR을 삽입하고, 랜딩 페이지를 통해 광고주 사이트로 리다이렉트하는 플로우를 지원합니다.

### 플로우
```
실물 편지 QR 스캔 → Letter 랜딩 페이지 (노출 추적) → CTA 클릭 (클릭 추적) → 광고주 사이트
```

---

## 🌐 Frontend API (공개)

프론트엔드에서 사용하는 공개 API입니다. 인증이 필요하지 않습니다.

### 1. 광고 정보 조회

광고 랜딩 페이지에서 광고 정보를 가져옵니다.

```
GET /api/ads/:adSlug
```

#### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adSlug | string | ✅ | 광고 슬러그 (URL용 고유 식별자) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "6789abc123def456",
    "name": "봄 웨딩 프로모션",
    "slug": "spring-wedding-2024",
    "status": "active",
    "advertiser": {
      "name": "플라워카페",
      "logo": "https://example.com/logo.png",
      "contactEmail": "contact@flowercafe.com",
      "contactPhone": "02-1234-5678"
    },
    "content": {
      "headline": "신혼부부 특별 할인 10%!",
      "description": "결혼을 축하합니다! 플라워카페에서 특별한 혜택을 준비했어요.",
      "ctaText": "혜택 받으러 가기",
      "targetUrl": "https://flowercafe.com/promo/wedding",
      "backgroundImage": "https://example.com/bg.jpg",
      "backgroundColor": "#fff5f5",
      "theme": "wedding"
    },
    "campaign": {
      "name": "2024 봄 웨딩 시즌",
      "startDate": "2024-03-01T00:00:00.000Z",
      "endDate": "2024-06-30T23:59:59.000Z"
    },
    "stats": {
      "impressions": 1250,
      "clicks": 89,
      "ctr": 7.12,
      "uniqueVisitors": 980,
      "avgDwellTime": 12
    }
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

#### Response (404 Not Found)

```json
{
  "success": false,
  "message": "광고를 찾을 수 없습니다.",
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

#### Frontend 사용 예시

```typescript
// app/ad/[adSlug]/page.tsx
async function getAdData(adSlug: string) {
  const res = await fetch(`${BACKEND_URL}/api/ads/${adSlug}`, {
    next: { revalidate: 60 }, // 1분 캐시
  });
  
  if (!res.ok) return null;
  const data = await res.json();
  return data.success ? data.data : null;
}
```

---

### 2. 이벤트 추적

광고 노출, 클릭, 체류시간을 추적합니다.

```
POST /api/ads/track
```

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| eventType | string | ✅ | 이벤트 타입: `impression`, `click`, `dwell` |
| adId | string | ✅ | 광고 ID |
| adSlug | string | ✅ | 광고 슬러그 |
| letterId | string | ❌ | 연결된 편지 ID (QR에서 전달) |
| clickTarget | string | ❌ | 클릭 대상 (click 이벤트용): `cta`, `logo` 등 |
| dwellTime | number | ❌ | 체류 시간 초 (dwell 이벤트용) |
| utm | object | ❌ | UTM 파라미터 |
| device | object | ❌ | 기기 정보 |
| session | object | ❌ | 세션 정보 |
| page | object | ❌ | 페이지 정보 |

#### UTM Object

```json
{
  "source": "qr",
  "medium": "offline",
  "campaign": "spring_wedding_2024",
  "content": "letter_a",
  "term": ""
}
```

#### Device Object

```json
{
  "type": "mobile",
  "os": "iOS 17.0",
  "browser": "Safari",
  "screenWidth": 390,
  "screenHeight": 844,
  "userAgent": "Mozilla/5.0..."
}
```

#### Session Object

```json
{
  "sessionId": "sess_abc123",
  "visitorId": "visitor_xyz789",
  "isNewVisitor": true
}
```

#### Request 예시 - 노출 추적

```json
{
  "eventType": "impression",
  "adId": "6789abc123def456",
  "adSlug": "spring-wedding-2024",
  "letterId": "letter123",
  "utm": {
    "source": "qr",
    "medium": "offline",
    "campaign": "spring_wedding_2024"
  },
  "device": {
    "type": "mobile",
    "os": "iOS 17.0",
    "browser": "Safari"
  },
  "session": {
    "sessionId": "sess_abc123",
    "visitorId": "visitor_xyz789",
    "isNewVisitor": true
  }
}
```

#### Request 예시 - 클릭 추적

```json
{
  "eventType": "click",
  "adId": "6789abc123def456",
  "adSlug": "spring-wedding-2024",
  "clickTarget": "cta",
  "letterId": "letter123",
  "utm": {
    "source": "qr",
    "medium": "offline"
  }
}
```

#### Request 예시 - 체류시간 추적

```json
{
  "eventType": "dwell",
  "adId": "6789abc123def456",
  "adSlug": "spring-wedding-2024",
  "dwellTime": 15,
  "letterId": "letter123"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

#### Frontend 사용 예시

```typescript
// lib/analytics/ad-tracker.ts

// 노출 추적 (페이지 로드 시)
export async function trackAdImpression(data: {
  adId: string;
  adSlug: string;
  letterId?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
}) {
  await fetch("/api/ad/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "impression",
      ...data,
      device: getDeviceInfo(),
      session: getOrCreateSession(),
      timestamp: new Date().toISOString(),
    }),
  });
}

// 클릭 추적 (CTA 버튼 클릭 시)
export async function trackAdClick(data: {
  adId: string;
  adSlug: string;
  clickTarget: string;
  letterId?: string;
}) {
  await fetch("/api/ad/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "click",
      ...data,
      timestamp: new Date().toISOString(),
    }),
  });
}

// 체류시간 추적 (페이지 이탈 시 - Beacon API 사용)
export function trackAdDwell(data: {
  adId: string;
  adSlug: string;
  dwellTime: number;
  letterId?: string;
}) {
  const payload = JSON.stringify({
    eventType: "dwell",
    ...data,
    timestamp: new Date().toISOString(),
  });
  
  // Beacon API로 페이지 이탈 시에도 전송 보장
  navigator.sendBeacon("/api/ad/track", payload);
}
```

---

## 🔐 Admin API (관리자 전용)

관리자 패널에서 사용하는 API입니다. **관리자 인증 토큰이 필요합니다.**

### 인증 헤더

```
Authorization: Bearer <admin_token>
```

---

### 1. 광고 목록 조회

```
GET /api/ads
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| status | string | ❌ | - | 상태 필터: `draft`, `active`, `paused`, `expired` |
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 20 | 페이지당 항목 수 |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "_id": "6789abc123def456",
      "name": "봄 웨딩 프로모션",
      "slug": "spring-wedding-2024",
      "status": "active",
      "advertiser": {
        "name": "플라워카페",
        "logo": "https://example.com/logo.png"
      },
      "content": {
        "headline": "신혼부부 특별 할인 10%!",
        "ctaText": "혜택 받으러 가기",
        "targetUrl": "https://flowercafe.com/promo",
        "theme": "wedding"
      },
      "campaign": {
        "name": "2024 봄 웨딩 시즌",
        "startDate": "2024-03-01T00:00:00.000Z",
        "endDate": "2024-06-30T23:59:59.000Z"
      },
      "stats": {
        "impressions": 1250,
        "clicks": 89,
        "ctr": 7.12
      },
      "createdAt": "2024-02-15T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

#### Admin 사용 예시

```typescript
// 광고 목록 조회
const response = await fetch(`${BACKEND_URL}/api/ads?status=active&page=1&limit=20`, {
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
});
```

---

### 2. 광고 생성

```
POST /api/ads
```

#### Request Body

```json
{
  "name": "봄 웨딩 프로모션",
  "slug": "spring-wedding-2024",
  "status": "draft",
  "advertiser": {
    "name": "플라워카페",
    "logo": "https://example.com/logo.png",
    "contactEmail": "contact@flowercafe.com",
    "contactPhone": "02-1234-5678"
  },
  "content": {
    "headline": "신혼부부 특별 할인 10%!",
    "description": "결혼을 축하합니다! 플라워카페에서 특별한 혜택을 준비했어요.",
    "ctaText": "혜택 받으러 가기",
    "targetUrl": "https://flowercafe.com/promo/wedding",
    "backgroundImage": "https://example.com/bg.jpg",
    "backgroundColor": "#fff5f5",
    "theme": "wedding"
  },
  "campaign": {
    "name": "2024 봄 웨딩 시즌",
    "startDate": "2024-03-01T00:00:00.000Z",
    "endDate": "2024-06-30T23:59:59.000Z",
    "budget": 1000000,
    "targetImpressions": 10000,
    "targetClicks": 500
  }
}
```

#### 필수 필드

| 필드 | 설명 |
|------|------|
| name | 광고명 (내부 관리용) |
| advertiser.name | 광고주명 |
| content.headline | 헤드라인 |
| content.description | 설명 텍스트 |
| content.targetUrl | 광고주 사이트 URL |
| campaign.startDate | 캠페인 시작일 |
| campaign.endDate | 캠페인 종료일 |

#### 선택 필드 기본값

| 필드 | 기본값 |
|------|--------|
| slug | name에서 자동 생성 |
| status | `draft` |
| content.ctaText | `자세히 보기` |
| content.backgroundColor | `#ffffff` |
| content.theme | `general` |

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "_id": "6789abc123def456",
    "name": "봄 웨딩 프로모션",
    "slug": "spring-wedding-2024",
    "status": "draft",
    ...
  },
  "message": "광고가 생성되었습니다.",
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

---

### 3. 광고 상세 조회

```
GET /api/ads/detail/:adId
```

#### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID (MongoDB ObjectId) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "6789abc123def456",
    "name": "봄 웨딩 프로모션",
    "slug": "spring-wedding-2024",
    "status": "active",
    "advertiser": { ... },
    "content": { ... },
    "campaign": { ... },
    "linkedLetters": [
      {
        "letterId": "letter123",
        "letterType": "wedding",
        "addedAt": "2024-03-01T00:00:00.000Z"
      }
    ],
    "stats": { ... },
    "createdBy": {
      "_id": "admin123",
      "name": "관리자",
      "email": "admin@letter.community"
    },
    "createdAt": "2024-02-15T09:00:00.000Z",
    "updatedAt": "2024-03-10T14:30:00.000Z"
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

---

### 4. 광고 수정

```
PUT /api/ads/:adId
```

#### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Request Body

수정할 필드만 전송합니다.

```json
{
  "status": "active",
  "content": {
    "headline": "수정된 헤드라인!",
    "ctaText": "지금 확인하기"
  },
  "campaign": {
    "endDate": "2024-07-31T23:59:59.000Z"
  }
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": { ... },
  "message": "광고가 수정되었습니다.",
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

---

### 5. 광고 삭제

```
DELETE /api/ads/:adId
```

#### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "광고가 삭제되었습니다.",
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

> ⚠️ **주의**: 광고 삭제 시 관련 이벤트 데이터도 함께 삭제됩니다.

---

### 6. 광고 통계 조회

```
GET /api/ads/:adId/stats
```

#### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| startDate | string | ❌ | 30일 전 | 조회 시작일 (ISO 8601) |
| endDate | string | ❌ | 오늘 | 조회 종료일 (ISO 8601) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "ad": {
      "_id": "6789abc123def456",
      "name": "봄 웨딩 프로모션",
      "slug": "spring-wedding-2024",
      "status": "active"
    },
    "summary": {
      "impressions": 1250,
      "clicks": 89,
      "ctr": "7.12",
      "uniqueVisitors": 980,
      "avgDwellTime": 12
    },
    "daily": [
      { "date": "2024-03-01", "impressions": 45, "clicks": 3 },
      { "date": "2024-03-02", "impressions": 52, "clicks": 4 },
      { "date": "2024-03-03", "impressions": 38, "clicks": 2 }
    ],
    "bySource": [
      { "_id": "qr", "count": 890 },
      { "_id": "direct", "count": 250 },
      { "_id": "link", "count": 110 }
    ],
    "byDevice": [
      { "_id": "mobile", "count": 980 },
      { "_id": "desktop", "count": 220 },
      { "_id": "tablet", "count": 50 }
    ],
    "period": {
      "start": "2024-02-15T00:00:00.000Z",
      "end": "2024-03-15T23:59:59.000Z"
    }
  },
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

---

### 7. 편지-광고 연결

특정 편지에 광고를 연결합니다.

```
POST /api/ads/:adId/link-letter
```

#### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Request Body

```json
{
  "letterId": "letter123abc",
  "letterType": "wedding"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": { ... },
  "message": "편지가 광고에 연결되었습니다.",
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

---

### 8. 편지-광고 연결 해제

```
DELETE /api/ads/:adId/unlink-letter/:letterId
```

#### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |
| letterId | string | ✅ | 편지 ID |

#### Response (200 OK)

```json
{
  "success": true,
  "data": { ... },
  "message": "편지 연결이 해제되었습니다.",
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

---

## 📊 데이터 타입 정의

### AdStatus (광고 상태)

| 값 | 설명 |
|----|------|
| `draft` | 초안 (비공개) |
| `active` | 활성 (공개) |
| `paused` | 일시 중지 |
| `expired` | 만료됨 |

### AdTheme (광고 테마)

| 값 | 설명 | 추천 색상 |
|----|------|----------|
| `wedding` | 결혼/웨딩 | 핑크, 로즈 |
| `birthday` | 생일 | 옐로우, 오렌지 |
| `congratulation` | 축하 | 블루, 인디고 |
| `general` | 일반 | 그레이, 화이트 |

### TrafficSource (유입 경로)

| 값 | 설명 |
|----|------|
| `qr` | QR 코드 스캔 |
| `direct` | 직접 접속 |
| `link` | 링크 클릭 |
| `referral` | 외부 사이트 |
| `social` | 소셜 미디어 |
| `email` | 이메일 |

### EventType (이벤트 타입)

| 값 | 설명 | 추적 시점 |
|----|------|----------|
| `impression` | 노출 | 페이지 로드 시 |
| `click` | 클릭 | CTA 버튼 클릭 시 |
| `dwell` | 체류 | 페이지 이탈 시 |

---

## 🔗 QR 코드 URL 구조

### 광고 QR URL

```
https://letter.community/ad/{adSlug}?utm_source=qr&utm_medium=offline&utm_campaign={campaign}&letter={letterId}
```

#### 예시

```
https://letter.community/ad/spring-wedding-2024?utm_source=qr&utm_medium=offline&utm_campaign=wedding_promo&letter=abc123
```

### URL 생성 유틸리티

```typescript
function generateAdQRUrl(
  adSlug: string,
  options?: {
    letterId?: string;
    campaign?: string;
  }
): string {
  const url = new URL(`/ad/${adSlug}`, "https://letter.community");
  url.searchParams.set("utm_source", "qr");
  url.searchParams.set("utm_medium", "offline");
  
  if (options?.letterId) {
    url.searchParams.set("letter", options.letterId);
  }
  if (options?.campaign) {
    url.searchParams.set("utm_campaign", options.campaign);
  }
  
  return url.toString();
}
```

---

## ⚠️ 에러 코드

| HTTP 상태 | 메시지 | 설명 |
|----------|--------|------|
| 400 | `letterId는 필수입니다.` | 필수 파라미터 누락 |
| 401 | `인증 토큰이 필요합니다` | 관리자 토큰 없음 |
| 403 | `권한이 없습니다` | 권한 부족 |
| 404 | `광고를 찾을 수 없습니다.` | 존재하지 않는 광고 |
| 500 | `광고 조회에 실패했습니다.` | 서버 에러 |

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-03-15 | 1.0.0 | 최초 작성 |
