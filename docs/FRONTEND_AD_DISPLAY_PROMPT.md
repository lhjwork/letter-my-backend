# 📱 Frontend 광고 노출 구현 프롬프트

## 📋 개요

Admin에서 생성된 광고를 Letter Community 프론트엔드에서 사용자에게 노출하는 기능을 구현합니다.

### 프로젝트 정보
- 프론트엔드: Next.js (포트 3001) - `letter-community`
- 백엔드: Express.js (포트 5001) - `letter-my-backend`

### 백엔드 API 베이스 URL
```
http://localhost:5001/api/ads
```

---

## 🎯 구현 목표

1. **광고 랜딩 페이지** - QR 스캔 시 보여줄 광고 페이지
2. **광고 배너 컴포넌트** - 편지 페이지 등에 삽입할 배너
3. **이벤트 추적** - 노출, 클릭, 체류시간 추적

---

## 📄 1. 광고 랜딩 페이지

### 경로
```
/ad/[adSlug]
```

### 플로우
```
QR 스캔 → /ad/{adSlug}?utm_source=qr&utm_medium=offline → 광고 페이지 → CTA 클릭 → 광고주 사이트
```

### API 연동

```typescript
// 광고 정보 조회 (인증 불필요)
GET /api/ads/{adSlug}

// Response (200 OK)
{
  "success": true,
  "data": {
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
      "ctr": 7.12
    }
  }
}

// Response (404 Not Found)
{
  "success": false,
  "message": "광고를 찾을 수 없습니다."
}
```

### 페이지 구현

```tsx
// app/ad/[adSlug]/page.tsx

import { notFound } from 'next/navigation';
import AdLandingClient from './AdLandingClient';

interface PageProps {
  params: { adSlug: string };
  searchParams: { 
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    letter?: string;
  };
}

// 광고 데이터 fetch (서버 컴포넌트)
async function getAdData(adSlug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ads/${adSlug}`, {
    next: { revalidate: 60 }, // 1분 캐시
  });
  
  if (!res.ok) return null;
  
  const data = await res.json();
  return data.success ? data.data : null;
}

export default async function AdLandingPage({ params, searchParams }: PageProps) {
  const ad = await getAdData(params.adSlug);
  
  if (!ad) {
    notFound();
  }
  
  // 비활성 광고 처리
  if (ad.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">현재 이용할 수 없는 광고입니다.</p>
      </div>
    );
  }
  
  return (
    <AdLandingClient 
      ad={ad} 
      utm={{
        source: searchParams.utm_source,
        medium: searchParams.utm_medium,
        campaign: searchParams.utm_campaign,
      }}
      letterId={searchParams.letter}
    />
  );
}
```

### 클라이언트 컴포넌트 (이벤트 추적 포함)

```tsx
// app/ad/[adSlug]/AdLandingClient.tsx
'use client';

import { useEffect, useRef } from 'react';
import { trackAdImpression, trackAdClick, trackAdDwell } from '@/lib/analytics/ad-tracker';

interface Ad {
  _id: string;
  slug: string;
  status: string;
  advertiser: {
    name: string;
    logo?: string;
  };
  content: {
    headline: string;
    description: string;
    ctaText: string;
    targetUrl: string;
    backgroundImage?: string;
    backgroundColor?: string;
    theme?: string;
  };
}

interface Props {
  ad: Ad;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  letterId?: string;
}

export default function AdLandingClient({ ad, utm, letterId }: Props) {
  const startTimeRef = useRef<number>(Date.now());
  const hasTrackedImpression = useRef(false);

  // 노출 추적 (페이지 로드 시 1회)
  useEffect(() => {
    if (hasTrackedImpression.current) return;
    hasTrackedImpression.current = true;

    trackAdImpression({
      adId: ad._id,
      adSlug: ad.slug,
      letterId,
      utm,
    });
  }, [ad._id, ad.slug, letterId, utm]);

  // 체류시간 추적 (페이지 이탈 시)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const dwellTime = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      trackAdDwell({
        adId: ad._id,
        adSlug: ad.slug,
        dwellTime,
        letterId,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ad._id, ad.slug, letterId]);

  // CTA 클릭 핸들러
  const handleCtaClick = async () => {
    await trackAdClick({
      adId: ad._id,
      adSlug: ad.slug,
      clickTarget: 'cta',
      letterId,
    });
    
    // 광고주 사이트로 이동
    window.location.href = ad.content.targetUrl;
  };

  // 테마별 스타일
  const themeStyles = {
    wedding: 'bg-pink-50',
    birthday: 'bg-yellow-50',
    congratulation: 'bg-blue-50',
    general: 'bg-gray-50',
  };

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center p-6 ${
        themeStyles[ad.content.theme as keyof typeof themeStyles] || themeStyles.general
      }`}
      style={{ 
        backgroundColor: ad.content.backgroundColor,
        backgroundImage: ad.content.backgroundImage 
          ? `url(${ad.content.backgroundImage})` 
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 광고주 로고 */}
      {ad.advertiser.logo && (
        <img 
          src={ad.advertiser.logo} 
          alt={ad.advertiser.name}
          className="w-24 h-24 object-contain mb-6"
        />
      )}

      {/* 헤드라인 */}
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-4">
        {ad.content.headline}
      </h1>

      {/* 설명 */}
      <p className="text-gray-600 text-center mb-8 max-w-md">
        {ad.content.description}
      </p>

      {/* CTA 버튼 */}
      <button
        onClick={handleCtaClick}
        className="px-8 py-4 bg-blue-600 text-white rounded-full font-semibold 
                   hover:bg-blue-700 transition-colors shadow-lg"
      >
        {ad.content.ctaText}
      </button>

      {/* 광고주 정보 */}
      <p className="mt-8 text-sm text-gray-400">
        광고 · {ad.advertiser.name}
      </p>
    </div>
  );
}
```

---

## 📊 2. 이벤트 추적 유틸리티

### 추적 API

```typescript
// 이벤트 추적 (인증 불필요)
POST /api/ads/track

// Request Body
{
  "eventType": "impression" | "click" | "dwell",
  "adId": "광고 _id (MongoDB ObjectId)",
  "adSlug": "광고 슬러그",
  "letterId": "연결된 편지 ID (선택)",
  "clickTarget": "cta" | "logo" (click 이벤트용),
  "dwellTime": 15 (dwell 이벤트용, 초 단위),
  "utm": {
    "source": "qr",
    "medium": "offline",
    "campaign": "campaign_name"
  },
  "device": {
    "type": "mobile" | "desktop" | "tablet",
    "os": "iOS 17.0",
    "browser": "Safari",
    "screenWidth": 390,
    "screenHeight": 844,
    "userAgent": "..."
  },
  "session": {
    "sessionId": "sess_abc123",
    "visitorId": "visitor_xyz789",
    "isNewVisitor": true
  }
}

// Response (항상 200 OK - 추적 실패가 UX에 영향 주지 않도록)
{
  "success": true
}
```

### 추적 유틸리티 구현

```typescript
// lib/analytics/ad-tracker.ts

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// 기기 정보 수집
function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/Mobi|Android/i.test(ua)) type = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) type = 'tablet';
  
  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iOS|iPhone|iPad/i.test(ua)) os = 'iOS';
  
  let browser = 'Unknown';
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';
  
  return {
    type,
    os,
    browser,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    userAgent: ua,
  };
}

// 세션 관리
function getOrCreateSession() {
  const SESSION_KEY = 'ad_session';
  const VISITOR_KEY = 'ad_visitor';
  
  let session = sessionStorage.getItem(SESSION_KEY);
  let visitor = localStorage.getItem(VISITOR_KEY);
  let isNewVisitor = false;
  
  if (!visitor) {
    visitor = `visitor_${crypto.randomUUID()}`;
    localStorage.setItem(VISITOR_KEY, visitor);
    isNewVisitor = true;
  }
  
  if (!session) {
    session = `sess_${crypto.randomUUID()}`;
    sessionStorage.setItem(SESSION_KEY, session);
  }
  
  return {
    sessionId: session,
    visitorId: visitor,
    isNewVisitor,
  };
}

// 노출 추적
export async function trackAdImpression(data: {
  adId: string;
  adSlug: string;
  letterId?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
}) {
  try {
    await fetch(`${BACKEND_URL}/api/ads/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'impression',
        adId: data.adId,
        adSlug: data.adSlug,
        letterId: data.letterId,
        utm: data.utm,
        device: getDeviceInfo(),
        session: getOrCreateSession(),
        page: {
          path: window.location.pathname,
          referrer: document.referrer,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('Failed to track impression:', error);
  }
}

// 클릭 추적
export async function trackAdClick(data: {
  adId: string;
  adSlug: string;
  clickTarget: string;
  letterId?: string;
}) {
  try {
    await fetch(`${BACKEND_URL}/api/ads/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'click',
        adId: data.adId,
        adSlug: data.adSlug,
        clickTarget: data.clickTarget,
        letterId: data.letterId,
        session: getOrCreateSession(),
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('Failed to track click:', error);
  }
}

// 체류시간 추적 (Beacon API 사용 - 페이지 이탈 시에도 전송 보장)
export function trackAdDwell(data: {
  adId: string;
  adSlug: string;
  dwellTime: number;
  letterId?: string;
}) {
  const payload = JSON.stringify({
    eventType: 'dwell',
    adId: data.adId,
    adSlug: data.adSlug,
    dwellTime: data.dwellTime,
    letterId: data.letterId,
    timestamp: new Date().toISOString(),
  });
  
  // Beacon API로 페이지 이탈 시에도 전송 보장
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${BACKEND_URL}/api/ads/track`, payload);
  } else {
    // Fallback
    fetch(`${BACKEND_URL}/api/ads/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}
```

---

## 🎨 3. 광고 배너 컴포넌트 (선택)

편지 페이지나 다른 페이지에 광고 배너를 삽입할 수 있습니다.

### 배너 컴포넌트

```tsx
// components/ads/AdBanner.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { trackAdImpression, trackAdClick } from '@/lib/analytics/ad-tracker';

interface Ad {
  _id: string;
  slug: string;
  advertiser: { name: string; logo?: string };
  content: {
    headline: string;
    ctaText: string;
    targetUrl: string;
    backgroundColor?: string;
  };
}

interface Props {
  adSlug: string;
  letterId?: string;
  className?: string;
}

export default function AdBanner({ adSlug, letterId, className }: Props) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const hasTracked = useRef(false);

  // 광고 데이터 로드
  useEffect(() => {
    async function fetchAd() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ads/${adSlug}`);
        const data = await res.json();
        
        if (data.success && data.data.status === 'active') {
          setAd(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch ad:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAd();
  }, [adSlug]);

  // 노출 추적 (Intersection Observer로 실제 화면에 보일 때만)
  useEffect(() => {
    if (!ad || hasTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          hasTracked.current = true;
          trackAdImpression({
            adId: ad._id,
            adSlug: ad.slug,
            letterId,
            utm: { source: 'banner', medium: 'web' },
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`ad-banner-${ad._id}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [ad, letterId]);

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 h-24 rounded-lg ${className}`} />;
  }

  if (!ad) return null;

  const handleClick = () => {
    trackAdClick({
      adId: ad._id,
      adSlug: ad.slug,
      clickTarget: 'banner',
      letterId,
    });
  };

  return (
    <a
      id={`ad-banner-${ad._id}`}
      href={ad.content.targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`block p-4 rounded-lg border hover:shadow-md transition-shadow ${className}`}
      style={{ backgroundColor: ad.content.backgroundColor || '#f9fafb' }}
    >
      <div className="flex items-center gap-4">
        {ad.advertiser.logo && (
          <img 
            src={ad.advertiser.logo} 
            alt={ad.advertiser.name}
            className="w-12 h-12 object-contain"
          />
        )}
        <div className="flex-1">
          <p className="font-medium">{ad.content.headline}</p>
          <p className="text-sm text-gray-500">광고 · {ad.advertiser.name}</p>
        </div>
        <span className="text-blue-600 font-medium">
          {ad.content.ctaText} →
        </span>
      </div>
    </a>
  );
}
```

### 사용 예시

```tsx
// 편지 상세 페이지에서 사용
<LetterContent letter={letter} />

{/* 광고 배너 */}
<AdBanner 
  adSlug="spring-wedding-2024" 
  letterId={letter._id}
  className="mt-6"
/>
```

---

## 🔗 4. QR 코드 URL 구조

### QR 스캔 시 URL 형식
```
https://letter.community/ad/{adSlug}?utm_source=qr&utm_medium=offline&utm_campaign={campaign}&letter={letterId}
```

### 예시
```
https://letter.community/ad/spring-wedding-2024?utm_source=qr&utm_medium=offline&utm_campaign=wedding_promo&letter=abc123
```

### URL 파라미터 설명
| 파라미터 | 설명 | 용도 |
|---------|------|------|
| utm_source | 유입 소스 (`qr`) | QR 스캔 여부 판별 |
| utm_medium | 매체 (`offline`) | 오프라인 유입 판별 |
| utm_campaign | 캠페인명 | 캠페인별 성과 분석 |
| letter | 편지 ID | 어떤 편지에서 유입됐는지 추적 |

---

## 📁 파일 구조 (권장)

```
app/
├── ad/
│   └── [adSlug]/
│       ├── page.tsx              # 서버 컴포넌트 (데이터 fetch)
│       └── AdLandingClient.tsx   # 클라이언트 컴포넌트 (이벤트 추적)
components/
└── ads/
    ├── AdBanner.tsx              # 배너 컴포넌트
    └── AdCard.tsx                # 카드형 광고 (선택)
lib/
└── analytics/
    └── ad-tracker.ts             # 이벤트 추적 유틸리티
```

---

## ✅ 구현 체크리스트

### 필수
- [ ] 광고 랜딩 페이지 (`/ad/[adSlug]`)
- [ ] 이벤트 추적 유틸리티 (`lib/analytics/ad-tracker.ts`)
- [ ] 노출 추적 (페이지 로드 시)
- [ ] 클릭 추적 (CTA 버튼 클릭 시)
- [ ] 체류시간 추적 (페이지 이탈 시)

### 선택
- [ ] 광고 배너 컴포넌트
- [ ] 404 페이지 (광고 없을 때)
- [ ] 만료/비활성 광고 처리

### 환경 설정
- [ ] `NEXT_PUBLIC_API_URL` 환경변수 설정

---

## 🧪 테스트 방법

### 1. Admin에서 광고 생성
1. Admin (`http://localhost:5173`)에서 광고 생성
2. 상태를 `active`로 설정
3. 생성된 광고의 `slug` 확인

### 2. 프론트엔드에서 광고 확인
```
http://localhost:3001/ad/{adSlug}?utm_source=qr&utm_medium=offline
```

### 3. 이벤트 추적 확인
- 브라우저 개발자 도구 Network 탭에서 `/api/ads/track` 요청 확인
- Admin 통계 페이지에서 노출/클릭 수 증가 확인

---

## ⚠️ 주의사항

1. **adId는 백엔드에서 생성됨**
   - Admin에서 광고를 먼저 생성해야 함
   - 프론트엔드는 API 응답의 `_id` 값을 사용

2. **status가 'active'인 광고만 노출**
   - `draft`, `paused`, `expired` 상태는 노출되지 않음

3. **UTM 파라미터 전달 필수**
   - QR 스캔 추적을 위해 `utm_source=qr` 포함 필요

4. **CORS 설정 확인**
   - 백엔드에서 프론트엔드 도메인 허용 필요

---

## 📝 참고 문서

- 백엔드 API 문서: `docs/AD_API_DOCUMENTATION.md`
- Admin 광고 관리: `docs/ADMIN_AD_MANAGEMENT_PROMPT.md`
