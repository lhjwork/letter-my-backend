# 🎠 캐러셀 광고 API 문서

## 📋 개요

이미지 중심의 캐러셀 광고 시스템을 위한 API 문서입니다. 기존 텍스트 기반 광고를 캐러셀 형태로 개선하여 사용자 경험과 광고 효과를 극대화합니다.

### 백엔드 API 베이스 URL
```
http://localhost:5001/api/ads
```

---

## 🌐 공개 API (인증 불필요)

### 1. 캐러셀 전용 광고 목록 조회

캐러셀에 최적화된 광고 목록을 우선순위 순으로 반환합니다.

```
GET /api/ads/carousel
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| placement | string | ❌ | - | 캐러셀 노출 위치 (`home`, `stories`, `letters`) |
| limit | number | ❌ | 3 | 캐러셀에 표시할 광고 수 (최대: 5) |
| aspectRatio | string | ❌ | "16:9" | 화면 비율 (`16:9`, `21:9`, `4:3`) |
| deviceType | string | ❌ | "desktop" | 기기 타입 (`mobile`, `tablet`, `desktop`) |
| autoPlay | boolean | ❌ | - | 자동재생 지원 광고만 필터링 |

#### 사용 예시

```typescript
// 홈페이지 캐러셀 광고 3개 조회
const response = await fetch('/api/ads/carousel?placement=home&limit=3');

// 모바일용 자동재생 광고만 조회
const response = await fetch('/api/ads/carousel?placement=stories&deviceType=mobile&autoPlay=true');

// 21:9 비율 광고 조회
const response = await fetch('/api/ads/carousel?aspectRatio=21:9&limit=5');
```

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
          "logo": "https://cdn.example.com/logos/mavis-logo.png"
        },
        "content": {
          "headline": "프리미엄 원두로 만든 특별한 커피",
          "description": "매일 아침을 특별하게 만들어줄 마비스 커피",
          "ctaText": "지금 주문하기",
          "targetUrl": "https://maviscoffee.com/order",
          "theme": "general",
          // 캐러셀 전용 필드
          "carouselImage": "https://cdn.example.com/carousel/mavis-1920x1080.jpg",
          "carouselImageMobile": "https://cdn.example.com/carousel/mavis-mobile-1080x1080.jpg",
          "carouselPriority": 90,
          "carouselAutoPlay": true,
          "carouselDuration": 6000,
          // 시각적 개선
          "overlayOpacity": 0.4,
          "textColor": "white",
          "textShadow": true,
          // 반응형 텍스트
          "mobileHeadline": "특별한 커피",
          "mobileDescription": "마비스 커피"
        },
        "campaign": {
          "name": "2026 신년 프로모션",
          "startDate": "2026-01-01T00:00:00.000Z",
          "endDate": "2026-03-31T23:59:59.000Z"
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
        }
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

---

### 2. 캐러셀 이벤트 추적

캐러셀 전용 이벤트를 추적합니다.

```
POST /api/ads/track
```

#### 새로운 이벤트 타입

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
    "screenHeight": 1080
  },
  "session": {
    "sessionId": "sess_abc123",
    "visitorId": "visitor_xyz789",
    "isNewVisitor": false
  },
  // 캐러셀 전용 데이터
  "carouselData": {
    "currentSlide": 0,           // 현재 슬라이드 인덱스 (0부터 시작)
    "totalSlides": 3,            // 전체 슬라이드 수
    "viewDuration": 4200,        // 해당 슬라이드 시청 시간 (밀리초)
    "interactionType": "auto",   // "auto", "manual", "hover_pause"
    "slideDirection": "next"     // "next", "prev", "direct"
  },
  "timestamp": "2026-01-04T16:30:00.000Z"
}
```

#### 캐러셀 데이터 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| currentSlide | number | 현재 슬라이드 인덱스 (0부터 시작) |
| totalSlides | number | 전체 슬라이드 수 |
| viewDuration | number | 해당 슬라이드 시청 시간 (밀리초) |
| interactionType | string | 상호작용 타입 (`auto`: 자동재생, `manual`: 수동 조작, `hover_pause`: 호버 일시정지) |
| slideDirection | string | 슬라이드 방향 (`next`: 다음, `prev`: 이전, `direct`: 직접 선택) |

#### Response (200 OK)

```json
{
  "success": true,
  "meta": {
    "timestamp": "2026-01-04T16:30:00.000Z"
  }
}
```

---

## 📊 캐러셀 데이터 구조

### 캐러셀 광고 필드

```typescript
interface CarouselAd {
  // 기본 광고 필드들...
  content: {
    // 기존 필드들...
    
    // 캐러셀 전용 필드
    carouselImage: string;           // 캐러셀용 고해상도 이미지 (1920x1080 권장)
    carouselImageMobile: string;     // 모바일용 캐러셀 이미지 (1080x1080 권장)
    carouselPriority: number;        // 캐러셀 내 순서 (0-100, 높을수록 먼저 표시)
    carouselAutoPlay: boolean;       // 자동 재생 허용 여부
    carouselDuration: number;        // 노출 시간 (밀리초, 3000-10000)
    
    // 시각적 개선
    overlayOpacity: number;          // 오버레이 투명도 (0-1)
    textColor: string;               // 텍스트 색상
    textShadow: boolean;             // 텍스트 그림자 사용 여부
    
    // 반응형 지원
    mobileHeadline: string;          // 모바일용 짧은 헤드라인
    mobileDescription: string;       // 모바일용 짧은 설명
  };
  
  displayControl: {
    // 기존 필드들...
    
    // 캐러셀 전용 설정
    carouselEnabled: boolean;        // 캐러셀 노출 허용 여부
    carouselPlacements: string[];    // 캐러셀 노출 위치 ["home", "stories", "letters"]
    maxCarouselImpressions: number;  // 캐러셀 최대 노출 횟수
    carouselSchedule: {              // 캐러셀 노출 시간대
      startHour: number;             // 시작 시간 (0-23)
      endHour: number;               // 종료 시간 (0-23)
      timezone: string;              // 시간대 (기본값: "Asia/Seoul")
    };
  };
  
  stats: {
    // 기존 필드들...
    
    // 캐러셀 전용 통계
    carouselImpressions: number;     // 캐러셀 노출 횟수
    carouselClicks: number;          // 캐러셀 클릭 횟수
    carouselCtr: number;             // 캐러셀 CTR
    carouselAvgViewTime: number;     // 캐러셀 평균 시청 시간 (밀리초)
    carouselSlideChanges: number;    // 슬라이드 변경 횟수 (사용자 액션)
    carouselAutoPlayStops: number;   // 자동재생 중단 횟수
  };
}
```

### 캐러셀 노출 위치

| 값 | 설명 | 권장 크기 |
|----|------|----------|
| `home` | 홈페이지 메인 캐러셀 | 1920x1080 (16:9) |
| `stories` | 스토리 목록 페이지 | 1920x1080 (16:9) |
| `letters` | 편지 상세 페이지 | 1200x675 (16:9) |

### 화면 비율 지원

| 비율 | 설명 | 권장 해상도 |
|------|------|-------------|
| `16:9` | 표준 와이드스크린 | 1920x1080 |
| `21:9` | 울트라 와이드 | 2560x1080 |
| `4:3` | 클래식 비율 | 1024x768 |

---

## 🧪 API 테스트 예시

### 브라우저 콘솔에서 테스트

```javascript
// 1. 홈페이지 캐러셀 광고 조회
fetch('http://localhost:5001/api/ads/carousel?placement=home&limit=3')
  .then(res => res.json())
  .then(console.log);

// 2. 모바일용 캐러셀 광고 조회
fetch('http://localhost:5001/api/ads/carousel?deviceType=mobile&autoPlay=true')
  .then(res => res.json())
  .then(console.log);

// 3. 캐러셀 노출 이벤트 추적
fetch('http://localhost:5001/api/ads/track', {
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
})
.then(res => res.json())
.then(console.log);

// 4. 캐러셀 클릭 이벤트 추적
fetch('http://localhost:5001/api/ads/track', {
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
})
.then(res => res.json())
.then(console.log);
```

---

## 📈 캐러셀 성능 지표

### 주요 KPI

| 지표 | 설명 | 계산 방법 |
|------|------|----------|
| 캐러셀 CTR | 캐러셀 클릭률 | (캐러셀 클릭 수 / 캐러셀 노출 수) × 100 |
| 평균 시청 시간 | 슬라이드 평균 시청 시간 | 총 시청 시간 / 시청 완료 수 |
| 슬라이드 완주율 | 전체 슬라이드 시청 비율 | (완주 수 / 노출 수) × 100 |
| 상호작용률 | 사용자 상호작용 비율 | (수동 조작 수 / 노출 수) × 100 |

### 예상 성과 개선

| 지표 | 기존 텍스트 광고 | 캐러셀 광고 | 개선율 |
|------|----------------|-------------|--------|
| CTR | 2.5% | 4.0% | +60% |
| 체류시간 | 3.2초 | 8.5초 | +166% |
| 브랜드 인지도 | 기준 | +45% | +45% |
| 광고 단가 | 기준 | +30% | +30% |

---

## ⚠️ 주의사항

### 1. 이미지 요구사항
- **캐러셀 이미지**: 1920x1080 (16:9 비율) 권장
- **모바일 이미지**: 1080x1080 (1:1 비율) 권장
- **파일 크기**: 최대 5MB
- **포맷**: WebP, JPEG, PNG 지원

### 2. 성능 최적화
- 이미지는 CDN을 통해 제공 권장
- WebP 포맷 우선 사용
- 모바일에서는 작은 이미지 사용

### 3. 접근성
- 자동재생은 사용자가 제어할 수 있어야 함
- 키보드 네비게이션 지원 필요
- 스크린 리더 호환성 고려

### 4. 캐러셀 제한사항
- 최대 5개 슬라이드까지 권장
- 자동재생 간격: 3-10초 사이
- 모바일에서는 스와이프 제스처 지원

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-04 | 1.0.0 | 캐러셀 광고 API 최초 작성 |

이 API를 활용하여 효과적인 캐러셀 광고 시스템을 구축할 수 있습니다!