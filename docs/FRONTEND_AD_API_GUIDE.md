# 🎯 Frontend 광고 노출 API 가이드

## 📋 개요

백엔드에서 등록된 광고를 Frontend에서 노출하기 위한 완전한 API 가이드입니다.

### 백엔드 API 베이스 URL
```
http://localhost:5001/api/ads
```

---

## 🌐 공개 API (인증 불필요)

### 1. 노출 가능한 광고 목록 조회

특정 위치에 노출할 수 있는 광고 목록을 우선순위 순으로 반환합니다.

```
GET /api/ads/displayable
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| placement | string | ❌ | - | 노출 위치 (`landing`, `banner`, `sidebar`, `footer`, `popup`) |
| limit | number | ❌ | 10 | 최대 반환 개수 |
| theme | string | ❌ | - | 테마 필터 (`wedding`, `birthday`, `congratulation`, `general`) |
| debug | boolean | ❌ | false | 디버그 모드 (개발 환경용) |

#### 사용 예시

```typescript
// 배너 위치 광고 1개 조회
const response = await fetch('/api/ads/displayable?placement=banner&limit=1');
const data = await response.json();

if (data.success) {
  const ads = data.data; // 광고 배열
}

// 사이드바 위치 웨딩 테마 광고 3개 조회
const response = await fetch('/api/ads/displayable?placement=sidebar&theme=wedding&limit=3');

// 디버그 모드 (개발 환경)
const response = await fetch('/api/ads/displayable?placement=banner&debug=true');
```

#### Response (200 OK)

**일반 모드:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "695a6eb1935b1105e18fda37",
      "name": "Mavis-coffee",
      "slug": "행복의 마비스",
      "status": "active",
      "advertiser": {
        "name": "김태수",
        "logo": "",
        "contactEmail": "jin.com.up.business@gmail.com",
        "contactPhone": "02-123-1234"
      },
      "content": {
        "headline": "행복의 마비스",
        "description": "행복의 마비스",
        "ctaText": "자세히 보기",
        "targetUrl": "https://maviscoffee.com/index.html",
        "backgroundImage": "https://maviscoffee.com/index.html",
        "backgroundColor": "#0247e8",
        "theme": "general"
      },
      "campaign": {
        "name": "행복의 마비스",
        "startDate": "2026-01-03T15:14:00.000Z",
        "endDate": "2026-01-20T15:14:00.000Z",
        "budget": 100000,
        "targetImpressions": 1000,
        "targetClicks": 500
      },
      "displayControl": {
        "isVisible": true,
        "placements": ["landing", "banner"],
        "priority": 50,
        "targetAudience": {
          "gender": "all",
          "regions": []
        }
      },
      "stats": {
        "impressions": 0,
        "clicks": 0,
        "ctr": 0,
        "uniqueVisitors": 0,
        "avgDwellTime": 0
      }
    }
  ],
  "meta": {
    "timestamp": "2026-01-04T16:03:00.000Z"
  }
}
```

**디버그 모드 (debug=true):**
```json
{
  "success": true,
  "data": {
    "displayableAds": [...], // 노출 가능한 광고 배열
    "filteredOutAds": [      // 필터링된 광고와 이유
      {
        "_id": "...",
        "name": "만료된 광고",
        "slug": "expired-ad",
        "reason": "Campaign has ended"
      }
    ],
    "totalAdsInDB": 5,       // 전체 광고 수
    "activeAds": 3,          // 활성 광고 수
    "visibleAds": 2,         // 노출 설정된 광고 수
    "displayableAdsCount": 1 // 실제 노출 가능한 광고 수
  }
}
```

---

### 2. 특정 광고 조회 (슬러그)

광고 랜딩 페이지에서 사용합니다.

```
GET /api/ads/:adSlug
```

#### Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adSlug | string | ✅ | 광고 슬러그 |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| placement | string | ❌ | 노출 위치 (노출 가능 여부 확인용) |

#### 사용 예시

```typescript
// 광고 랜딩 페이지에서 사용
const response = await fetch('/api/ads/행복의%20마비스?placement=landing');
const data = await response.json();

if (data.success) {
  const ad = data.data;
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "695a6eb1935b1105e18fda37",
    "name": "Mavis-coffee",
    "slug": "행복의 마비스",
    "status": "active",
    "advertiser": { ... },
    "content": { ... },
    "campaign": { ... },
    "displayControl": { ... },
    "stats": { ... }
  },
  "meta": {
    "timestamp": "2026-01-04T16:03:00.000Z"
  }
}
```

#### Response (404 Not Found)

```json
{
  "success": false,
  "message": "광고를 찾을 수 없습니다.",
  "meta": {
    "timestamp": "2026-01-04T16:03:00.000Z"
  }
}
```

---

### 3. 이벤트 추적

광고 노출, 클릭, 체류시간을 추적합니다.

```
POST /api/ads/track
```

#### Request Body

```json
{
  "eventType": "impression" | "click" | "dwell",
  "adId": "695a6eb1935b1105e18fda37",
  "adSlug": "행복의 마비스",
  "letterId": "letter123", // 선택
  "clickTarget": "cta",    // click 이벤트용
  "dwellTime": 15,         // dwell 이벤트용 (초)
  "utm": {
    "source": "qr",
    "medium": "offline",
    "campaign": "winter_promo"
  },
  "device": {
    "type": "mobile",
    "os": "iOS 17.0",
    "browser": "Safari",
    "screenWidth": 390,
    "screenHeight": 844,
    "userAgent": "Mozilla/5.0..."
  },
  "session": {
    "sessionId": "sess_abc123",
    "visitorId": "visitor_xyz789",
    "isNewVisitor": true
  },
  "page": {
    "path": "/ad/행복의-마비스",
    "referrer": "https://letter.community"
  },
  "timestamp": "2026-01-04T16:03:00.000Z"
}
```

#### 필수 필드

| 필드 | 설명 |
|------|------|
| eventType | 이벤트 타입 |
| adId | 광고 ID (MongoDB ObjectId) |
| adSlug | 광고 슬러그 |

#### Response (200 OK)

```json
{
  "success": true,
  "meta": {
    "timestamp": "2026-01-04T16:03:00.000Z"
  }
}
```

---

### 4. 광고 디버그 정보 조회 (개발 환경용)

```
GET /api/ads/debug/:adSlug
```

#### 사용 예시

```typescript
// 개발 환경에서만 사용
if (process.env.NODE_ENV === 'development') {
  const response = await fetch('/api/ads/debug/행복의%20마비스');
  const data = await response.json();
  console.log('광고 디버그 정보:', data);
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "ad": {
      "_id": "695a6eb1935b1105e18fda37",
      "name": "Mavis-coffee",
      "slug": "행복의 마비스",
      "status": "active"
    },
    "displayStatus": {
      "isDisplayable": true,
      "reasons": [
        {
          "check": "status",
          "passed": true,
          "value": "active"
        },
        {
          "check": "isVisible",
          "passed": true,
          "value": true
        },
        {
          "check": "campaignPeriod",
          "passed": true,
          "value": "Campaign is active",
          "startDate": "2026-01-03T15:14:00.000Z",
          "endDate": "2026-01-20T15:14:00.000Z",
          "currentTime": "2026-01-04T16:03:00.000Z"
        },
        {
          "check": "placements",
          "passed": true,
          "value": ["landing"]
        },
        {
          "check": "impressionLimit",
          "passed": true,
          "value": "0/∞"
        }
      ]
    }
  }
}
```

---

## 📊 데이터 타입 정의

### Ad 인터페이스

```typescript
interface Ad {
  _id: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'paused' | 'expired';
  advertiser: {
    name: string;
    logo?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  content: {
    headline: string;
    description: string;
    ctaText: string;
    targetUrl: string;
    backgroundImage?: string;
    backgroundColor?: string;
    theme?: 'wedding' | 'birthday' | 'congratulation' | 'general';
  };
  campaign: {
    name?: string;
    startDate: string;
    endDate: string;
    budget?: number;
    targetImpressions?: number;
    targetClicks?: number;
  };
  displayControl: {
    isVisible: boolean;
    placements: ('landing' | 'banner' | 'sidebar' | 'footer' | 'popup')[];
    priority: number;
    maxDailyImpressions?: number;
    maxTotalImpressions?: number;
    targetAudience?: {
      ageRange?: { min: number; max: number };
      gender?: 'male' | 'female' | 'all';
      regions?: string[];
    };
    schedule?: {
      startTime?: string;
      endTime?: string;
      daysOfWeek?: number[];
    };
  };
  stats: {
    impressions: number;
    clicks: number;
    ctr: number;
    uniqueVisitors: number;
    avgDwellTime: number;
  };
  linkedLetters: any[];
  createdAt: string;
  updatedAt: string;
}
```

### Placement 타입

```typescript
type AdPlacement = 'landing' | 'banner' | 'sidebar' | 'footer' | 'popup';
```

### Event 타입

```typescript
type AdEventType = 'impression' | 'click' | 'dwell';
```

---

## 🧪 API 테스트 예시

### 브라우저 콘솔에서 테스트

```javascript
// 1. 랜딩 위치 광고 조회
fetch('http://localhost:5001/api/ads/displayable?placement=landing')
  .then(res => res.json())
  .then(console.log);

// 2. 배너 위치 광고 조회
fetch('http://localhost:5001/api/ads/displayable?placement=banner')
  .then(res => res.json())
  .then(console.log);

// 3. 특정 광고 조회
fetch('http://localhost:5001/api/ads/행복의%20마비스')
  .then(res => res.json())
  .then(console.log);

// 4. 디버그 정보 조회
fetch('http://localhost:5001/api/ads/debug/행복의%20마비스')
  .then(res => res.json())
  .then(console.log);

// 5. 노출 이벤트 추적
fetch('http://localhost:5001/api/ads/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'impression',
    adId: '695a6eb1935b1105e18fda37',
    adSlug: '행복의 마비스',
    utm: { source: 'test', medium: 'web' },
    timestamp: new Date().toISOString()
  })
})
.then(res => res.json())
.then(console.log);
```

---

## ⚠️ 주의사항

### 1. URL 인코딩
한글 슬러그는 URL 인코딩이 필요합니다:
```typescript
const encodedSlug = encodeURIComponent('행복의 마비스');
// 결과: '%ED%96%89%EB%B3%B5%EC%9D%98%20%EB%A7%88%EB%B9%84%EC%8A%A4'
```

### 2. CORS 설정
백엔드에서 Frontend 도메인이 허용되어 있는지 확인:
- `http://localhost:3001` (개발)
- `https://your-domain.com` (프로덕션)

### 3. 에러 처리
모든 API 호출에서 에러 처리를 구현해야 합니다:
```typescript
try {
  const response = await fetch('/api/ads/displayable');
  const data = await response.json();
  
  if (!data.success) {
    console.warn('API 요청 실패:', data.message);
    return [];
  }
  
  return data.data;
} catch (error) {
  console.error('네트워크 에러:', error);
  return [];
}
```

### 4. 캐싱
광고 데이터는 적절한 캐싱을 적용하는 것이 좋습니다:
```typescript
// Next.js에서 캐싱 예시
const response = await fetch('/api/ads/displayable', {
  next: { revalidate: 300 } // 5분 캐시
});
```

---

## 📝 현재 등록된 광고 정보

### Mavis Coffee 광고
- **ID:** `695a6eb1935b1105e18fda37`
- **슬러그:** `행복의 마비스`
- **상태:** `active`
- **노출 위치:** `landing` (랜딩 페이지만)
- **우선순위:** `50`
- **캠페인 기간:** 2026-01-03 ~ 2026-01-20
- **테마:** `general`

### 테스트 URL
```
# 광고 목록 조회 (랜딩 위치)
GET http://localhost:5001/api/ads/displayable?placement=landing

# 광고 상세 조회
GET http://localhost:5001/api/ads/행복의%20마비스

# 디버그 정보
GET http://localhost:5001/api/ads/debug/행복의%20마비스
```

이 API 가이드를 참고하여 Frontend에서 광고를 구현하면 됩니다!