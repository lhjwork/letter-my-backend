# 🚀 Frontend 광고 구현 완전 가이드

## 📋 개요

백엔드에서 등록된 광고를 Frontend(Next.js)에서 노출하기 위한 단계별 구현 가이드입니다.

### 프로젝트 정보
- **Frontend:** Next.js (포트 3001) - `letter-community`
- **Backend:** Express.js (포트 5001) - `letter-my-backend`
- **현재 등록된 광고:** Mavis Coffee (`행복의 마비스`)

---

## 🛠️ 1단계: API 서비스 구현

### 환경 설정

```typescript
// lib/config/api.ts

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  ENDPOINTS: {
    ADS_DISPLAYABLE: '/api/ads/displayable',
    ADS_DETAIL: '/api/ads',
    ADS_TRACK: '/api/ads/track',
    ADS_DEBUG: '/api/ads/debug'
  }
} as const;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta: {
    timestamp: string;
  };
}
```

### 광고 타입 정의

```typescript
// types/ad.ts

export interface Ad {
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
    placements: AdPlacement[];
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

export type AdPlacement = 'landing' | 'banner' | 'sidebar' | 'footer' | 'popup';
export type AdEventType = 'impression' | 'click' | 'dwell';
```

### 광고 API 서비스

```typescript
// lib/services/adService.ts

import { API_CONFIG, ApiResponse } from '@/lib/config/api';
import { Ad, AdPlacement, AdEventType } from '@/types/ad';

class AdService {
  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const url = `${API_CONFIG.BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.warn(`API 요청 실패 (${endpoint}):`, data.message);
      }

      return data;
    } catch (error) {
      console.error(`API 요청 에러 (${endpoint}):`, error);
      return {
        success: false,
        message: '네트워크 오류가 발생했습니다.',
        meta: { timestamp: new Date().toISOString() }
      };
    }
  }

  // 노출 가능한 광고 목록 조회
  async getDisplayableAds(options?: {
    placement?: AdPlacement;
    limit?: number;
    theme?: string;
  }): Promise<Ad[]> {
    const url = new URL(API_CONFIG.ENDPOINTS.ADS_DISPLAYABLE, API_CONFIG.BASE_URL);
    
    if (options?.placement) url.searchParams.set('placement', options.placement);
    if (options?.limit) url.searchParams.set('limit', options.limit.toString());
    if (options?.theme) url.searchParams.set('theme', options.theme);

    const response = await this.fetchApi<Ad[]>(url.pathname + url.search);
    return response.success ? response.data || [] : [];
  }

  // 특정 광고 조회
  async getAdBySlug(adSlug: string, placement?: AdPlacement): Promise<Ad | null> {
    const url = new URL(`${API_CONFIG.ENDPOINTS.ADS_DETAIL}/${encodeURIComponent(adSlug)}`, API_CONFIG.BASE_URL);
    if (placement) {
      url.searchParams.set('placement', placement);
    }

    const response = await this.fetchApi<Ad>(url.pathname + url.search);
    return response.success ? response.data || null : null;
  }

  // 이벤트 추적
  async trackEvent(eventData: {
    eventType: AdEventType;
    adId: string;
    adSlug: string;
    letterId?: string;
    clickTarget?: string;
    dwellTime?: number;
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
    };
  }): Promise<boolean> {
    const response = await this.fetchApi(API_CONFIG.ENDPOINTS.ADS_TRACK, {
      method: 'POST',
      body: JSON.stringify({
        ...eventData,
        device: this.getDeviceInfo(),
        session: this.getOrCreateSession(),
        page: {
          path: typeof window !== 'undefined' ? window.location.pathname : '',
          referrer: typeof window !== 'undefined' ? document.referrer : '',
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return response.success;
  }

  // 디버그 정보 조회 (개발 환경용)
  async getAdDebugInfo(adSlug: string): Promise<any> {
    if (process.env.NODE_ENV !== 'development') return null;

    const response = await this.fetchApi(`${API_CONFIG.ENDPOINTS.ADS_DEBUG}/${encodeURIComponent(adSlug)}`);
    return response.success ? response.data : null;
  }

  // 기기 정보 수집
  private getDeviceInfo() {
    if (typeof window === 'undefined') return {};

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
  private getOrCreateSession() {
    if (typeof window === 'undefined') return {};

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
}

export const adService = new AdService();
```

---

## 🎨 2단계: 광고 컴포넌트 구현

### 기본 광고 배너 컴포넌트

```tsx
// components/ads/AdBanner.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { adService } from '@/lib/services/adService';
import { Ad, AdPlacement } from '@/types/ad';

interface AdBannerProps {
  placement: AdPlacement;
  limit?: number;
  theme?: string;
  className?: string;
  showDebugInfo?: boolean;
}

export default function AdBanner({ 
  placement, 
  limit = 1, 
  theme, 
  className = '',
  showDebugInfo = false 
}: AdBannerProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasTrackedImpression = useRef<Set<string>>(new Set());

  // 광고 데이터 로드
  useEffect(() => {
    async function fetchAds() {
      try {
        setLoading(true);
        setError(null);
        
        const adList = await adService.getDisplayableAds({ placement, limit, theme });
        setAds(adList);
        
        if (showDebugInfo && process.env.NODE_ENV === 'development') {
          console.log(`🔍 [${placement}] 광고 로드:`, adList.length, '개');
        }
      } catch (error) {
        console.error('광고 로드 실패:', error);
        setError('광고를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchAds();
  }, [placement, limit, theme, showDebugInfo]);

  // 노출 추적 (Intersection Observer)
  useEffect(() => {
    if (ads.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const adId = entry.target.getAttribute('data-ad-id');
            const adSlug = entry.target.getAttribute('data-ad-slug');
            
            if (adId && adSlug && !hasTrackedImpression.current.has(adId)) {
              hasTrackedImpression.current.add(adId);
              
              adService.trackEvent({
                eventType: 'impression',
                adId,
                adSlug,
                utm: { source: 'banner', medium: 'web' },
              });

              if (showDebugInfo) {
                console.log(`📊 노출 추적: ${adSlug}`);
              }
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // 모든 광고 요소 관찰
    const adElements = document.querySelectorAll(`[data-placement="${placement}"]`);
    adElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [ads, placement, showDebugInfo]);

  // 클릭 추적
  const handleAdClick = async (ad: Ad, clickTarget: string = 'cta') => {
    await adService.trackEvent({
      eventType: 'click',
      adId: ad._id,
      adSlug: ad.slug,
      clickTarget,
    });

    if (showDebugInfo) {
      console.log(`🖱️ 클릭 추적: ${ad.slug} (${clickTarget})`);
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}>
        <div className="h-24 bg-gray-300 rounded"></div>
      </div>
    );
  }

  // 에러 상태
  if (error && showDebugInfo) {
    return (
      <div className={`border border-red-300 p-4 rounded-lg bg-red-50 ${className}`}>
        <p className="text-red-600 text-sm">❌ {error}</p>
      </div>
    );
  }

  // 광고가 없는 경우
  if (ads.length === 0) {
    if (showDebugInfo) {
      return (
        <div className={`border border-gray-300 p-4 rounded-lg bg-gray-50 ${className}`}>
          <p className="text-gray-500 text-center text-sm">
            📭 {placement} 위치에 노출할 광고가 없습니다
          </p>
        </div>
      );
    }
    return null; // 프로덕션에서는 아무것도 표시하지 않음
  }

  // 광고 렌더링
  return (
    <div className={`space-y-4 ${className}`}>
      {ads.map((ad) => (
        <div
          key={ad._id}
          data-ad-id={ad._id}
          data-ad-slug={ad.slug}
          data-placement={placement}
          className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          style={{ backgroundColor: ad.content.backgroundColor }}
        >
          {/* 배경 이미지 */}
          {ad.content.backgroundImage && (
            <div 
              className="h-32 bg-cover bg-center"
              style={{ backgroundImage: `url(${ad.content.backgroundImage})` }}
            />
          )}
          
          <div className="p-4">
            {/* 광고주 로고 */}
            {ad.advertiser.logo && (
              <img 
                src={ad.advertiser.logo} 
                alt={ad.advertiser.name}
                className="w-12 h-12 object-contain mb-3"
              />
            )}

            {/* 헤드라인 */}
            <h3 className="font-semibold text-lg mb-2">{ad.content.headline}</h3>
            
            {/* 설명 */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{ad.content.description}</p>
            
            {/* CTA 버튼 */}
            <a
              href={ad.content.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleAdClick(ad, 'cta')}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {ad.content.ctaText}
            </a>
            
            {/* 광고 표시 */}
            <p className="text-xs text-gray-400 mt-3">
              광고 · {ad.advertiser.name}
            </p>

            {/* 디버그 정보 */}
            {showDebugInfo && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p><strong>ID:</strong> {ad._id}</p>
                <p><strong>우선순위:</strong> {ad.displayControl.priority}</p>
                <p><strong>노출 위치:</strong> {ad.displayControl.placements.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 광고 랜딩 페이지 구현

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

// 서버 사이드에서 광고 데이터 조회
async function getAdData(adSlug: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ads/${encodeURIComponent(adSlug)}`, {
      next: { revalidate: 300 }, // 5분 캐시
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('광고 데이터 조회 실패:', error);
    return null;
  }
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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">광고를 찾을 수 없습니다</h1>
          <p className="text-gray-500">현재 이용할 수 없는 광고입니다.</p>
        </div>
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

// 메타데이터 생성
export async function generateMetadata({ params }: { params: { adSlug: string } }) {
  const ad = await getAdData(params.adSlug);
  
  if (!ad) {
    return {
      title: '광고를 찾을 수 없습니다',
    };
  }
  
  return {
    title: ad.content.headline,
    description: ad.content.description,
    openGraph: {
      title: ad.content.headline,
      description: ad.content.description,
      images: ad.content.backgroundImage ? [ad.content.backgroundImage] : [],
    },
  };
}
```

### 광고 랜딩 클라이언트 컴포넌트

```tsx
// app/ad/[adSlug]/AdLandingClient.tsx
'use client';

import { useEffect, useRef } from 'react';
import { adService } from '@/lib/services/adService';
import { Ad } from '@/types/ad';

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

    adService.trackEvent({
      eventType: 'impression',
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
      
      // Beacon API로 페이지 이탈 시에도 전송 보장
      const payload = JSON.stringify({
        eventType: 'dwell',
        adId: ad._id,
        adSlug: ad.slug,
        dwellTime,
        letterId,
        timestamp: new Date().toISOString(),
      });
      
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${process.env.NEXT_PUBLIC_API_URL}/api/ads/track`, payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ad._id, ad.slug, letterId]);

  // CTA 클릭 핸들러
  const handleCtaClick = async () => {
    await adService.trackEvent({
      eventType: 'click',
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
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 max-w-2xl">
        {ad.content.headline}
      </h1>

      {/* 설명 */}
      <p className="text-lg text-gray-600 text-center mb-8 max-w-md">
        {ad.content.description}
      </p>

      {/* CTA 버튼 */}
      <button
        onClick={handleCtaClick}
        className="px-8 py-4 bg-blue-600 text-white text-lg rounded-full font-semibold 
                   hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
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

## 📄 3단계: 페이지에 광고 통합

### 메인 페이지

```tsx
// app/page.tsx

import AdBanner from '@/components/ads/AdBanner';

export default function HomePage() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Letter Community</h1>
      
      {/* 상단 배너 광고 */}
      <AdBanner 
        placement="banner" 
        limit={1}
        className="mb-8"
        showDebugInfo={isDevelopment}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-semibold mb-4">최근 편지</h2>
          {/* 편지 목록 컴포넌트 */}
        </div>
        
        {/* 사이드바 */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">추천</h3>
          
          {/* 사이드바 광고 */}
          <AdBanner 
            placement="sidebar" 
            limit={2}
            className="mb-6"
            showDebugInfo={isDevelopment}
          />
        </div>
      </div>
      
      {/* 하단 광고 */}
      <AdBanner 
        placement="footer" 
        limit={1}
        className="mt-12"
        showDebugInfo={isDevelopment}
      />
    </div>
  );
}
```

### 편지 상세 페이지

```tsx
// app/letters/[letterId]/page.tsx

import AdBanner from '@/components/ads/AdBanner';

interface Props {
  params: { letterId: string };
}

export default function LetterDetailPage({ params }: Props) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 편지 내용 */}
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">편지 제목</h1>
        <div className="prose max-w-none">
          {/* 편지 내용 */}
        </div>
        
        {/* 편지 하단 광고 */}
        <AdBanner 
          placement="banner" 
          limit={1}
          theme="general"
          className="mt-8"
          showDebugInfo={isDevelopment}
        />
      </div>
    </div>
  );
}
```

---

## 🔧 4단계: 환경 설정

### 환경 변수 설정

```bash
# .env.local

NEXT_PUBLIC_API_URL=http://localhost:5001
```

### package.json 의존성

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🧪 5단계: 테스트 및 디버깅

### 개발 환경 디버깅 도구

```typescript
// utils/adDebugger.ts

import { adService } from '@/lib/services/adService';

export const adDebugger = {
  // 특정 위치의 광고 확인
  async checkPlacement(placement: string) {
    console.log(`🔍 [${placement}] 광고 확인 중...`);
    
    const ads = await adService.getDisplayableAds({ placement: placement as any });
    console.log(`📊 결과: ${ads.length}개 광고 발견`);
    
    ads.forEach((ad, index) => {
      console.log(`  ${index + 1}. ${ad.name} (우선순위: ${ad.displayControl.priority})`);
    });
    
    return ads;
  },

  // 모든 위치 확인
  async checkAllPlacements() {
    const placements = ['landing', 'banner', 'sidebar', 'footer', 'popup'];
    
    for (const placement of placements) {
      await this.checkPlacement(placement);
    }
  },

  // 특정 광고 상세 확인
  async checkAd(adSlug: string) {
    console.log(`🔍 광고 상세 확인: ${adSlug}`);
    
    const debugInfo = await adService.getAdDebugInfo(adSlug);
    if (debugInfo) {
      console.log('광고 정보:', debugInfo.ad);
      console.log('노출 가능:', debugInfo.displayStatus.isDisplayable ? '✅' : '❌');
      
      debugInfo.displayStatus.reasons.forEach((reason: any) => {
        const status = reason.passed ? '✅' : '❌';
        console.log(`${status} ${reason.check}:`, reason.value);
      });
    } else {
      console.log('❌ 광고를 찾을 수 없습니다');
    }
  }
};

// 개발 환경에서 전역 사용 가능하도록 설정
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).adDebugger = adDebugger;
}
```

### 브라우저 콘솔에서 테스트

```javascript
// 개발 환경에서 브라우저 콘솔에서 실행

// 1. 모든 위치의 광고 확인
adDebugger.checkAllPlacements();

// 2. 특정 위치 광고 확인
adDebugger.checkPlacement('landing');
adDebugger.checkPlacement('banner');

// 3. 특정 광고 상세 확인
adDebugger.checkAd('행복의 마비스');
```

---

## ✅ 구현 체크리스트

### API 서비스
- [ ] `lib/config/api.ts` 설정
- [ ] `types/ad.ts` 타입 정의
- [ ] `lib/services/adService.ts` 구현
- [ ] 에러 처리 및 로깅

### 컴포넌트
- [ ] `AdBanner` 컴포넌트 구현
- [ ] `AdLandingClient` 컴포넌트 구현
- [ ] 이벤트 추적 (노출, 클릭, 체류시간)
- [ ] 반응형 디자인 적용

### 페이지 통합
- [ ] 메인 페이지에 광고 배너 추가
- [ ] 편지 상세 페이지에 광고 추가
- [ ] 광고 랜딩 페이지 구현 (`/ad/[adSlug]`)

### 환경 설정
- [ ] `NEXT_PUBLIC_API_URL` 환경변수 설정
- [ ] 개발/프로덕션 환경 분리

### 테스트
- [ ] 각 placement별 광고 노출 확인
- [ ] 이벤트 추적 동작 확인
- [ ] 디버깅 도구 활용

---

## 🎯 현재 테스트 가능한 광고

### Mavis Coffee 광고
- **슬러그:** `행복의 마비스`
- **노출 위치:** `landing` (랜딩 페이지만)
- **테스트 URL:** `http://localhost:3001/ad/행복의%20마비스`

### 테스트 방법

1. **랜딩 페이지 광고 확인:**
   ```tsx
   <AdBanner placement="landing" showDebugInfo={true} />
   ```

2. **배너 위치 광고 (현재 없음):**
   ```tsx
   <AdBanner placement="banner" showDebugInfo={true} />
   ```

3. **Admin에서 추가 설정:**
   - 기존 광고의 노출 위치에 `banner`, `sidebar` 등 추가
   - 또는 새로운 광고 생성

이 가이드를 따라 구현하면 Frontend에서 광고가 정상적으로 노출됩니다!