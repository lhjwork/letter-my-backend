# 🎠 캐러셀 광고 완전 API 레퍼런스

## 📋 개요

캐러셀 광고 시스템의 모든 API 엔드포인트와 데이터 구조를 정의한 완전한 레퍼런스 문서입니다.

### 🔗 베이스 URL
```
Production: https://api.letter-community.com
Development: http://localhost:5001
```

### 🔐 인증
관리자 API는 JWT 토큰 인증이 필요합니다.
```
Authorization: Bearer {admin_jwt_token}
```

---

## 🌐 공개 API (인증 불필요)

### 1. 캐러셀 광고 목록 조회

**GET** `/api/ads/carousel`

캐러셀에 최적화된 광고 목록을 우선순위 순으로 반환합니다.

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| placement | string | ❌ | - | 캐러셀 노출 위치 (`home`, `stories`, `letters`) |
| limit | number | ❌ | 3 | 캐러셀에 표시할 광고 수 (최대: 5) |
| aspectRatio | string | ❌ | "16:9" | 화면 비율 (`16:9`, `21:9`, `4:3`) |
| deviceType | string | ❌ | "desktop" | 기기 타입 (`mobile`, `tablet`, `desktop`) |
| autoPlay | boolean | ❌ | - | 자동재생 지원 광고만 필터링 |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "_id": "695a6eb1935b1105e18fda37",
        "name": "Mavis Coffee 캐러셀",
        "slug": "mavis-coffee-carousel",
        "status": "active",
        "advertiser": {
          "name": "마비스 커피",
          "logo": "https://cdn.example.com/logos/mavis-logo.png",
          "contactEmail": "contact@maviscoffee.com",
          "contactPhone": "02-1234-5678"
        },
        "content": {
          "headline": "프리미엄 원두로 만든 특별한 커피",
          "description": "매일 아침을 특별하게 만들어줄 마비스 커피",
          "ctaText": "지금 주문하기",
          "targetUrl": "https://maviscoffee.com/order",
          "theme": "general",
          "carouselImage": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1920&h=1080&fit=crop",
          "carouselImageMobile": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1080&h=1080&fit=crop",
          "carouselPriority": 90,
          "carouselAutoPlay": true,
          "carouselDuration": 6000,
          "overlayOpacity": 0.4,
          "textColor": "white",
          "textShadow": true,
          "mobileHeadline": "특별한 커피",
          "mobileDescription": "마비스 커피"
        },
        "campaign": {
          "name": "2026 신년 프로모션",
          "startDate": "2026-01-01T00:00:00.000Z",
          "endDate": "2026-03-31T23:59:59.000Z",
          "budget": 1000000,
          "targetImpressions": 100000,
          "targetClicks": 5000
        },
        "displayControl": {
          "isVisible": true,
          "carouselEnabled": true,
          "carouselPlacements": ["home", "stories"],
          "priority": 80,
          "carouselSchedule": {
            "startHour": 9,
            "endHour": 22,
            "timezone": "Asia/Seoul"
          }
        },
        "stats": {
          "impressions": 1250,
          "clicks": 89,
          "ctr": 7.12,
          "carouselImpressions": 2340,
          "carouselClicks": 187,
          "carouselCtr": 7.99,
          "carouselAvgViewTime": 4200,
          "carouselSlideChanges": 456,
          "carouselAutoPlayStops": 23
        },
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-04T16:58:29.112Z"
      }
    ],
    "meta": {
      "totalAds": 8,
      "carouselAds": 3,
      "filteredAds": 3,
      "recommendedDuration": 5500,
      "aspectRatio": "16:9",
      "deviceType": "desktop",
      "placement": "home"
    }
  },
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

#### 사용 예시

```javascript
// 홈페이지 캐러셀 광고 3개 조회
const response = await fetch('/api/ads/carousel?placement=home&limit=3');
const data = await response.json();

// 모바일용 자동재생 광고만 조회
const mobileAds = await fetch('/api/ads/carousel?placement=stories&deviceType=mobile&autoPlay=true');

// 21:9 비율 광고 조회
const wideAds = await fetch('/api/ads/carousel?aspectRatio=21:9&limit=5');
```

### 2. 캐러셀 이벤트 추적

**POST** `/api/ads/track`

캐러셀 전용 이벤트를 추적합니다.

#### 캐러셀 이벤트 타입

| 이벤트 타입 | 설명 | 추적 시점 |
|------------|------|----------|
| `carousel_impression` | 캐러셀 슬라이드 노출 | 슬라이드가 화면에 표시될 때 |
| `carousel_click` | 캐러셀 클릭 | 이미지 또는 CTA 버튼 클릭 시 |
| `carousel_slide_change` | 슬라이드 변경 | 사용자가 수동으로 슬라이드 변경 시 |
| `carousel_autoplay_stop` | 자동재생 중단 | 사용자가 자동재생을 중단시킬 때 |
| `carousel_complete_view` | 전체 캐러셀 시청 완료 | 모든 슬라이드를 시청했을 때 |

#### Request Body

```json
{
  "eventType": "carousel_impression",
  "adId": "695a6eb1935b1105e18fda37",
  "adSlug": "mavis-coffee-carousel",
  "letterId": "letter123",
  "clickTarget": "cta",
  "utm": {
    "source": "carousel",
    "medium": "web",
    "campaign": "home_carousel"
  },
  "device": {
    "type": "desktop",
    "os": "macOS",
    "browser": "Chrome",
    "screenWidth": 1920,
    "screenHeight": 1080,
    "userAgent": "Mozilla/5.0..."
  },
  "session": {
    "sessionId": "sess_abc123",
    "visitorId": "visitor_xyz789",
    "isNewVisitor": false
  },
  "page": {
    "path": "/",
    "referrer": "https://google.com"
  },
  "carouselData": {
    "currentSlide": 0,
    "totalSlides": 3,
    "viewDuration": 4200,
    "interactionType": "auto",
    "slideDirection": "next"
  },
  "timestamp": "2026-01-04T16:30:00.000Z"
}
```

#### 캐러셀 데이터 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| currentSlide | number | 현재 슬라이드 인덱스 (0부터 시작) |
| totalSlides | number | 전체 슬라이드 수 |
| viewDuration | number | 해당 슬라이드 시청 시간 (밀리초) |
| interactionType | string | 상호작용 타입 (`auto`, `manual`, `hover_pause`) |
| slideDirection | string | 슬라이드 방향 (`next`, `prev`, `direct`) |

#### Response (200 OK)

```json
{
  "success": true,
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

#### 사용 예시

```javascript
// 캐러셀 노출 이벤트 추적
await fetch('/api/ads/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'carousel_impression',
    adId: '695a6eb1935b1105e18fda37',
    adSlug: 'mavis-coffee-carousel',
    carouselData: {
      currentSlide: 0,
      totalSlides: 3,
      viewDuration: 4200,
      interactionType: 'auto',
      slideDirection: 'next'
    },
    timestamp: new Date().toISOString()
  })
});

// 캐러셀 클릭 이벤트 추적
await fetch('/api/ads/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'carousel_click',
    adId: '695a6eb1935b1105e18fda37',
    adSlug: 'mavis-coffee-carousel',
    clickTarget: 'cta',
    carouselData: {
      currentSlide: 1,
      totalSlides: 3,
      interactionType: 'manual'
    },
    timestamp: new Date().toISOString()
  })
});
```

---

## 🔐 관리자 API (인증 필요)

### 3. 캐러셀 광고 생성

**POST** `/api/ads`

새로운 캐러셀 광고를 생성합니다.

#### Request Body

```json
{
  "name": "Mavis Coffee 캐러셀 광고",
  "advertiser": {
    "name": "마비스 커피",
    "logo": "https://cdn.example.com/logos/mavis-logo.png",
    "contactEmail": "contact@maviscoffee.com",
    "contactPhone": "02-1234-5678"
  },
  "content": {
    "headline": "프리미엄 원두로 만든 특별한 커피",
    "description": "매일 아침을 특별하게 만들어줄 마비스 커피",
    "ctaText": "지금 주문하기",
    "targetUrl": "https://maviscoffee.com/order",
    "theme": "general",
    "carouselImage": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1920&h=1080&fit=crop",
    "carouselImageMobile": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1080&h=1080&fit=crop",
    "carouselPriority": 90,
    "carouselAutoPlay": true,
    "carouselDuration": 6000,
    "overlayOpacity": 0.4,
    "textColor": "white",
    "textShadow": true,
    "mobileHeadline": "특별한 커피",
    "mobileDescription": "마비스 커피"
  },
  "campaign": {
    "name": "2026 신년 프로모션",
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-03-31T23:59:59.000Z",
    "budget": 1000000,
    "targetImpressions": 100000,
    "targetClicks": 5000
  },
  "displayControl": {
    "isVisible": true,
    "placements": ["landing", "banner"],
    "priority": 80,
    "carouselEnabled": true,
    "carouselPlacements": ["home", "stories"],
    "carouselSchedule": {
      "startHour": 9,
      "endHour": 22,
      "timezone": "Asia/Seoul"
    }
  }
}
```
#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "_id": "695a6eb1935b1105e18fda37",
    "name": "Mavis Coffee 캐러셀 광고",
    "slug": "mavis-coffee-캐러셀-광고",
    "status": "draft",
    "advertiser": { /* ... */ },
    "content": { /* ... */ },
    "campaign": { /* ... */ },
    "displayControl": { /* ... */ },
    "stats": {
      "impressions": 0,
      "clicks": 0,
      "ctr": 0,
      "carouselImpressions": 0,
      "carouselClicks": 0,
      "carouselCtr": 0,
      "carouselAvgViewTime": 0,
      "carouselSlideChanges": 0,
      "carouselAutoPlayStops": 0
    },
    "createdAt": "2026-01-04T16:30:00.000Z",
    "updatedAt": "2026-01-04T16:30:00.000Z"
  },
  "message": "광고가 생성되었습니다.",
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

### 4. 캐러셀 광고 수정

**PUT** `/api/ads/{adId}`

기존 캐러셀 광고를 수정합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Request Body

```json
{
  "content": {
    "headline": "수정된 헤드라인",
    "carouselImage": "https://new-image-url.com/image.jpg",
    "carouselDuration": 7000
  },
  "displayControl": {
    "carouselEnabled": true,
    "carouselPlacements": ["home", "stories", "letters"]
  }
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    /* 수정된 광고 데이터 */
  },
  "message": "광고가 수정되었습니다.",
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

### 5. 캐러셀 광고 목록 조회 (관리자)

**GET** `/api/ads`

관리자용 캐러셀 광고 목록을 조회합니다.

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| status | string | ❌ | - | 광고 상태 (`draft`, `active`, `paused`, `expired`) |
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 20 | 페이지당 항목 수 |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "_id": "695a6eb1935b1105e18fda37",
      "name": "Mavis Coffee 캐러셀",
      "slug": "mavis-coffee-carousel",
      "status": "active",
      "advertiser": { /* ... */ },
      "content": { /* ... */ },
      "campaign": { /* ... */ },
      "displayControl": { /* ... */ },
      "stats": { /* ... */ },
      "createdBy": {
        "_id": "admin123",
        "name": "관리자",
        "email": "admin@example.com"
      },
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-04T16:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

### 6. 캐러셀 광고 상세 조회

**GET** `/api/ads/detail/{adId}`

특정 캐러셀 광고의 상세 정보를 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "695a6eb1935b1105e18fda37",
    "name": "Mavis Coffee 캐러셀",
    "slug": "mavis-coffee-carousel",
    "status": "active",
    "advertiser": {
      "name": "마비스 커피",
      "logo": "https://cdn.example.com/logos/mavis-logo.png",
      "contactEmail": "contact@maviscoffee.com",
      "contactPhone": "02-1234-5678"
    },
    "content": {
      "headline": "프리미엄 원두로 만든 특별한 커피",
      "description": "매일 아침을 특별하게 만들어줄 마비스 커피",
      "ctaText": "지금 주문하기",
      "targetUrl": "https://maviscoffee.com/order",
      "theme": "general",
      "carouselImage": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1920&h=1080&fit=crop",
      "carouselImageMobile": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1080&h=1080&fit=crop",
      "carouselPriority": 90,
      "carouselAutoPlay": true,
      "carouselDuration": 6000,
      "overlayOpacity": 0.4,
      "textColor": "white",
      "textShadow": true,
      "mobileHeadline": "특별한 커피",
      "mobileDescription": "마비스 커피"
    },
    "campaign": {
      "name": "2026 신년 프로모션",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-03-31T23:59:59.000Z",
      "budget": 1000000,
      "targetImpressions": 100000,
      "targetClicks": 5000
    },
    "displayControl": {
      "isVisible": true,
      "placements": ["landing", "banner"],
      "priority": 80,
      "carouselEnabled": true,
      "carouselPlacements": ["home", "stories"],
      "carouselSchedule": {
        "startHour": 9,
        "endHour": 22,
        "timezone": "Asia/Seoul"
      }
    },
    "stats": {
      "impressions": 1250,
      "clicks": 89,
      "ctr": 7.12,
      "uniqueVisitors": 456,
      "avgDwellTime": 3200,
      "carouselImpressions": 2340,
      "carouselClicks": 187,
      "carouselCtr": 7.99,
      "carouselAvgViewTime": 4200,
      "carouselSlideChanges": 456,
      "carouselAutoPlayStops": 23
    },
    "createdBy": {
      "_id": "admin123",
      "name": "관리자",
      "email": "admin@example.com"
    },
    "linkedLetters": [],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-04T16:30:00.000Z"
  },
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

### 7. 캐러셀 광고 통계 조회

**GET** `/api/ads/{adId}/stats`

특정 캐러셀 광고의 상세 통계를 조회합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| startDate | string | ❌ | 30일 전 | 시작 날짜 (YYYY-MM-DD) |
| endDate | string | ❌ | 오늘 | 종료 날짜 (YYYY-MM-DD) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "ad": {
      "_id": "695a6eb1935b1105e18fda37",
      "name": "Mavis Coffee 캐러셀",
      "slug": "mavis-coffee-carousel",
      "status": "active"
    },
    "summary": {
      "impressions": 45230,
      "clicks": 1876,
      "ctr": "4.14",
      "uniqueVisitors": 12450,
      "avgDwellTime": 3200,
      "carouselImpressions": 67890,
      "carouselClicks": 2834,
      "carouselCtr": "4.17",
      "carouselAvgViewTime": 4200,
      "carouselSlideChanges": 8945,
      "carouselAutoPlayStops": 234,
      "slideCompletionRate": "78.5"
    },
    "daily": [
      {
        "date": "2026-01-01",
        "impressions": 1250,
        "clicks": 89,
        "carouselImpressions": 1890,
        "carouselClicks": 95
      },
      {
        "date": "2026-01-02",
        "impressions": 1340,
        "clicks": 92,
        "carouselImpressions": 2010,
        "carouselClicks": 98
      }
    ],
    "bySource": [
      { "_id": "direct", "count": 15230 },
      { "_id": "qr", "count": 12450 },
      { "_id": "referral", "count": 8900 },
      { "_id": "social", "count": 5670 }
    ],
    "byDevice": [
      { "_id": "mobile", "count": 28900 },
      { "_id": "desktop", "count": 12450 },
      { "_id": "tablet", "count": 3880 }
    ],
    "carouselBehavior": {
      "autoPlayCompletionRate": 65.2,
      "manualSlideChangeRate": 23.8,
      "averageSlidesViewed": 2.3,
      "bounceRate": 12.5,
      "hoverPauseRate": 18.7
    },
    "period": {
      "start": "2026-01-01T00:00:00.000Z",
      "end": "2026-01-31T23:59:59.000Z"
    }
  },
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

### 8. 캐러셀 광고 삭제

**DELETE** `/api/ads/{adId}`

캐러셀 광고를 삭제합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "광고가 삭제되었습니다.",
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

### 9. 캐러셀 노출 제어 설정 업데이트

**PUT** `/api/ads/{adId}/display-control`

캐러셀 광고의 노출 제어 설정을 업데이트합니다.

#### Path Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| adId | string | ✅ | 광고 ID |

#### Request Body

```json
{
  "isVisible": true,
  "placements": ["landing", "banner", "sidebar"],
  "priority": 85,
  "carouselEnabled": true,
  "carouselPlacements": ["home", "stories", "letters"],
  "maxCarouselImpressions": 100000,
  "carouselSchedule": {
    "startHour": 8,
    "endHour": 23,
    "timezone": "Asia/Seoul"
  },
  "targetAudience": {
    "ageRange": { "min": 20, "max": 50 },
    "gender": "all",
    "regions": ["서울", "경기", "부산"]
  }
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    /* 업데이트된 광고 데이터 */
  },
  "message": "노출 설정이 업데이트되었습니다.",
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

---

## 📊 데이터 구조 정의

### CarouselAd 스키마

```typescript
interface CarouselAd {
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
    // 기본 콘텐츠
    headline: string;
    description: string;
    ctaText: string;
    targetUrl: string;
    theme: 'wedding' | 'birthday' | 'congratulation' | 'general';
    
    // 캐러셀 전용 필드
    carouselImage: string;           // 1920x1080 권장
    carouselImageMobile: string;     // 1080x1080 권장
    carouselPriority: number;        // 0-100, 높을수록 먼저 표시
    carouselAutoPlay: boolean;       // 자동 재생 허용 여부
    carouselDuration: number;        // 노출 시간 (밀리초, 3000-10000)
    
    // 시각적 개선
    overlayOpacity: number;          // 오버레이 투명도 (0-1)
    textColor: string;               // 텍스트 색상
    textShadow: boolean;             // 텍스트 그림자 사용 여부
    
    // 반응형 지원
    mobileHeadline?: string;         // 모바일용 짧은 헤드라인
    mobileDescription?: string;      // 모바일용 짧은 설명
  };
  
  campaign: {
    name?: string;
    startDate: Date;
    endDate: Date;
    budget?: number;
    targetImpressions?: number;
    targetClicks?: number;
  };
  
  displayControl: {
    isVisible: boolean;
    placements: ('landing' | 'banner' | 'sidebar' | 'footer' | 'popup')[];
    priority: number;                // 0-100
    
    // 캐러셀 전용 설정
    carouselEnabled: boolean;
    carouselPlacements: ('home' | 'stories' | 'letters')[];
    maxCarouselImpressions?: number;
    carouselSchedule?: {
      startHour: number;             // 0-23
      endHour: number;               // 0-23
      timezone: string;              // 기본값: "Asia/Seoul"
    };
    
    // 타겟팅
    targetAudience?: {
      ageRange?: { min: number; max: number };
      gender?: 'male' | 'female' | 'all';
      regions?: string[];
    };
  };
  
  stats: {
    // 기본 통계
    impressions: number;
    clicks: number;
    ctr: number;
    uniqueVisitors: number;
    avgDwellTime: number;
    
    // 캐러셀 전용 통계
    carouselImpressions: number;
    carouselClicks: number;
    carouselCtr: number;
    carouselAvgViewTime: number;
    carouselSlideChanges: number;
    carouselAutoPlayStops: number;
  };
  
  createdBy?: string;
  linkedLetters: Array<{
    letterId: string;
    letterType?: string;
    addedAt: Date;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### CarouselEvent 스키마

```typescript
interface CarouselEvent {
  _id: string;
  adId: string;
  adSlug: string;
  eventType: 'carousel_impression' | 'carousel_click' | 'carousel_slide_change' | 
             'carousel_autoplay_stop' | 'carousel_complete_view';
  
  eventData: {
    dwellTime?: number;
    clickTarget?: string;
    
    // 캐러셀 전용 데이터
    currentSlide?: number;
    totalSlides?: number;
    viewDuration?: number;
    interactionType?: 'auto' | 'manual' | 'hover_pause';
    slideDirection?: 'next' | 'prev' | 'direct';
  };
  
  letter?: {
    letterId: string;
    letterType?: string;
  };
  
  traffic: {
    source: 'qr' | 'direct' | 'link' | 'social' | 'email' | 'referral' | 'other';
    medium?: string;
    campaign?: string;
    referrer?: string;
  };
  
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  
  device?: {
    type?: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
    screenWidth?: number;
    screenHeight?: number;
    userAgent?: string;
  };
  
  session?: {
    sessionId?: string;
    visitorId?: string;
    isNewVisitor?: boolean;
  };
  
  ip?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🚨 에러 코드

### HTTP 상태 코드

| 코드 | 설명 | 예시 |
|------|------|------|
| 200 | 성공 | 데이터 조회/수정 성공 |
| 201 | 생성됨 | 광고 생성 성공 |
| 400 | 잘못된 요청 | 필수 필드 누락, 잘못된 형식 |
| 401 | 인증 실패 | 토큰 없음, 만료된 토큰 |
| 403 | 권한 없음 | 관리자 권한 필요 |
| 404 | 찾을 수 없음 | 존재하지 않는 광고 ID |
| 500 | 서버 오류 | 내부 서버 오류 |

### 에러 응답 형식

```json
{
  "success": false,
  "message": "에러 메시지",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "carouselImage",
      "message": "캐러셀 이미지는 필수입니다"
    }
  },
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

### 주요 에러 코드

| 코드 | 설명 |
|------|------|
| `VALIDATION_ERROR` | 입력 데이터 검증 실패 |
| `AUTHENTICATION_ERROR` | 인증 실패 |
| `AUTHORIZATION_ERROR` | 권한 부족 |
| `NOT_FOUND` | 리소스를 찾을 수 없음 |
| `DUPLICATE_SLUG` | 중복된 슬러그 |
| `IMAGE_UPLOAD_ERROR` | 이미지 업로드 실패 |
| `CAMPAIGN_EXPIRED` | 만료된 캠페인 |
| `QUOTA_EXCEEDED` | 할당량 초과 |

---

## 🧪 테스트 예시

### cURL 예시

```bash
# 캐러셀 광고 조회
curl -X GET "http://localhost:5001/api/ads/carousel?placement=home&limit=3" \
  -H "Content-Type: application/json"

# 캐러셀 이벤트 추적
curl -X POST "http://localhost:5001/api/ads/track" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "carousel_impression",
    "adId": "695a6eb1935b1105e18fda37",
    "adSlug": "mavis-coffee-carousel",
    "carouselData": {
      "currentSlide": 0,
      "totalSlides": 3,
      "viewDuration": 4200,
      "interactionType": "auto"
    }
  }'

# 관리자 - 캐러셀 광고 생성
curl -X POST "http://localhost:5001/api/ads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "새 캐러셀 광고",
    "content": {
      "headline": "테스트 헤드라인",
      "description": "테스트 설명",
      "ctaText": "클릭하세요",
      "targetUrl": "https://example.com",
      "carouselImage": "https://example.com/image.jpg",
      "carouselEnabled": true
    }
  }'
```

### JavaScript/TypeScript 예시

```typescript
// 캐러셀 광고 조회
const getCarouselAds = async (placement: string) => {
  const response = await fetch(`/api/ads/carousel?placement=${placement}&limit=3`);
  const data = await response.json();
  return data.data.ads;
};

// 캐러셀 이벤트 추적
const trackCarouselEvent = async (eventData: any) => {
  await fetch('/api/ads/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
};

// 관리자 - 캐러셀 광고 생성
const createCarouselAd = async (adData: any, token: string) => {
  const response = await fetch('/api/ads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(adData)
  });
  return response.json();
};
```

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-04 | 1.0.0 | 캐러셀 광고 API 최초 작성 |
| 2026-01-04 | 1.1.0 | 이벤트 추적 API 추가 |
| 2026-01-04 | 1.2.0 | 관리자 API 완성 |

---

이 API 레퍼런스를 통해 캐러셀 광고 시스템의 모든 기능을 효과적으로 활용할 수 있습니다!