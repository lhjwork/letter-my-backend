# 🎯 Frontend 광고 통합 구현 프롬프트

## 📋 개요

Admin에서 등록한 광고를 Frontend에서 올바르게 노출하기 위한 완전한 구현 가이드입니다.

### 프로젝트 정보
- Frontend: Next.js (포트 3001) - `letter-community`
- Backend: Express.js (포트 5001) - `letter-my-backend`

---

## 🛠️ 1. API 유틸리티 구현

### API 기본 설정

```typescript
// lib/config/api.ts

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  ENDPOINTS: {
    ADS: '/api/ads',
    AD_TRACK: '/api/ads/track',
    AD_DISPLAYABLE: '/api/ads/displayable',
    AD_DEBUG: '/api/ads/debug'
  }
};

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta: {
    timestamp: string;
  };
}
```

### 광고 API 서비스

```typescript
// lib/services/adService.ts

import { API_CONFIG, ApiResponse } from '@/lib/config/api';

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
    placements: string[];
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
}

export interface AdDebugInfo {
  ad: {
    _id: string;
    name: string;
    slug: string;
    status: string;
  };
  displayStatus: {
    isDisplayable: boolean;
    reasons: Array<{
      check: string;
      passed: boolean;
      value: any;
      startDate?: string;
      endDate?: string;
      currentTime?: string;
    }>;
  };
}

export interface DisplayableAdsDebug {
  displayableAds: Ad[];
  filteredOutAds: Array<{
    _id: string;
    name: string;
    slug: string;
    reason: string;
  }>;
  totalAdsInDB: number;
  activeAds: number;
  visibleAds: number;
  displayableAdsCount: number;
}

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

  // 특정 광고 조회
  async getAdBySlug(adSlug: string, placement?: string): Promise<Ad | null> {
    const url = new URL(`${API_CONFIG.ENDPOINTS.ADS}/${adSlug}`, API_CONFIG.BASE_URL);
    if (placement) {
      url.searchParams.set('placement', placement);
    }

    const response = await this.fetchApi<Ad>(url.pathname + url.search);
    return response.success ? response.data || null : null;
  }

  // 노출 가능한 광고 목록 조회
  async getDisplayableAds(options?: {
    placement?: string;
    limit?: number;
    theme?: string;
  }): Promise<Ad[]> {
    const url = new URL(API_CONFIG.ENDPOINTS.AD_DISPLAYABLE, API_CONFIG.BASE_URL);
    
    if (options?.placement) url.searchParams.set('placement', options.placement);
    if (options?.limit) url.searchParams.set('limit', options.limit.toString());
    if (options?.theme) url.searchParams.set('theme', options.theme);

    const response = await this.fetchApi<Ad[]>(url.pathname + url.search);
    return response.success ? response.data || [] : [];
  }

  // 광고 디버그 정보 조회 (개발 환경용)
  async getAdDebugInfo(adSlug: string): Promise<AdDebugInfo | null> {
    if (process.env.NODE_ENV !== 'development') return null;

    const response = await this.fetchApi<AdDebugInfo>(`${API_CONFIG.ENDPOINTS.AD_DEBUG}/${adSlug}`);
    return response.success ? response.data || null : null;
  }

  // 노출 가능한 광고 목록 디버그 정보 조회 (개발 환경용)
  async getDisplayableAdsDebug(placement?: string): Promise<DisplayableAdsDebug | null> {
    if (process.env.NODE_ENV !== 'development') return null;

    const url = new URL(API_CONFIG.ENDPOINTS.AD_DISPLAYABLE, API_CONFIG.BASE_URL);
    url.searchParams.set('debug', 'true');
    if (placement) url.searchParams.set('placement', placement);

    const response = await this.fetchApi<DisplayableAdsDebug>(url.pathname + url.search);
    return response.success ? response.data || null : null;
  }

  // 이벤트 추적
  async trackEvent(eventData: {
    eventType: 'impression' | 'click' | 'dwell';
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
    const response = await this.fetchApi(API_CONFIG.ENDPOINTS.AD_TRACK, {
      method: 'POST',
      body: JSON.stringify({
        ...eventData,
        device: this.getDeviceInfo(),
        session: this.getOrCreateSession(),
        page: {
          path: window.location.pathname,
          referrer: document.referrer,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return response.success;
  }

  // 기기 정보 수집
  private getDeviceInfo() {
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

## 🎨 2. 광고 컴포넌트 구현

### 기본 광고 배너 컴포넌트

```tsx
// components/ads/AdBanner.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { adService, Ad } from '@/lib/services/adService';

interface AdBannerProps {
  placement: 'landing' | 'banner' | 'sidebar' | 'footer' | 'popup';
  limit?: number;
  theme?: 'wedding' | 'birthday' | 'congratulation' | 'general';
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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const hasTrackedImpression = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function fetchAds() {
      try {
        // 광고 목록 조회
        const adList = await adService.getDisplayableAds({ placement, limit, theme });
        setAds(adList);

        // 개발 환경에서 디버그 정보 조회
        if (showDebugInfo && process.env.NODE_ENV === 'development') {
          const debug = await adService.getDisplayableAdsDebug(placement);
          setDebugInfo(debug);
        }
      } catch (error) {
        console.error('광고 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAds();
  }, [placement, limit, theme, showDebugInfo]);

  // 노출 추적 (Intersection Observer 사용)
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
  }, [ads, placement]);

  // 클릭 추적
  const handleAdClick = async (ad: Ad, clickTarget: string = 'cta') => {
    await adService.trackEvent({
      eventType: 'click',
      adId: ad._id,
      adSlug: ad.slug,
      clickTarget,
    });
  };

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 h-24 rounded-lg ${className}`} />;
  }

  // 디버그 정보 표시 (개발 환경)
  if (showDebugInfo && debugInfo) {
    return (
      <div className={`border-2 border-yellow-400 p-4 rounded-lg bg-yellow-50 ${className}`}>
        <h3 className="font-bold text-yellow-800 mb-2">🐛 광고 디버그 정보 ({placement})</h3>
        <div className="text-sm space-y-1">
          <p>전체 광고: {debugInfo.totalAdsInDB}개</p>
          <p>활성 광고: {debugInfo.activeAds}개</p>
          <p>노출 설정된 광고: {debugInfo.visibleAds}개</p>
          <p>노출 가능한 광고: {debugInfo.displayableAdsCount}개</p>
          <p>필터링된 광고: {debugInfo.filteredOutAds?.length || 0}개</p>
        </div>
        
        {debugInfo.filteredOutAds?.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-yellow-700">필터링된 광고 보기</summary>
            <ul className="mt-1 text-xs space-y-1">
              {debugInfo.filteredOutAds.map((ad: any) => (
                <li key={ad._id} className="text-red-600">
                  <strong>{ad.name}</strong>: {ad.reason}
                </li>
              ))}
            </ul>
          </details>
        )}

        {debugInfo.displayableAds.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-green-700">노출 가능한 광고 보기</summary>
            <ul className="mt-1 text-xs space-y-1">
              {debugInfo.displayableAds.map((ad: Ad) => (
                <li key={ad._id} className="text-green-600">
                  <strong>{ad.name}</strong> (우선순위: {ad.displayControl.priority})
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  // 광고가 없는 경우
  if (ads.length === 0) {
    if (showDebugInfo) {
      return (
        <div className={`border border-gray-300 p-4 rounded-lg bg-gray-50 ${className}`}>
          <p className="text-gray-500 text-center">
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
            <p className="text-gray-600 text-sm mb-4">{ad.content.description}</p>
            
            {/* CTA 버튼 */}
            <a
              href={ad.content.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleAdClick(ad, 'cta')}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {ad.content.ctaText}
            </a>
            
            {/* 광고 표시 */}
            <p className="text-xs text-gray-400 mt-3">
              광고 · {ad.advertiser.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 광고 랜딩 페이지 컴포넌트

```tsx
// app/ad/[adSlug]/page.tsx

import { notFound } from 'next/navigation';
import AdLandingClient from './AdLandingClient';
import { adService } from '@/lib/services/adService';

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
    // 서버 사이드에서는 직접 API 호출
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ads/${adSlug}`, {
      next: { revalidate: 60 }, // 1분 캐시
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
import { adService, Ad } from '@/lib/services/adService';

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

## 🔧 3. 페이지에서 사용 예시

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
          {/* 편지 목록 */}
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
        <div className="prose">
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

## 🧪 4. 테스트 및 디버깅

### 개발 환경에서 디버깅

```typescript
// utils/adDebugger.ts

export const adDebugger = {
  // 특정 광고 상태 확인
  async checkAdStatus(adSlug: string) {
    console.log(`🔍 광고 상태 확인: ${adSlug}`);
    
    try {
      const debugInfo = await adService.getAdDebugInfo(adSlug);
      
      if (debugInfo) {
        console.log('광고 기본 정보:', debugInfo.ad);
        console.log('노출 가능 여부:', debugInfo.displayStatus.isDisplayable ? '✅' : '❌');
        
        debugInfo.displayStatus.reasons.forEach((reason) => {
          const status = reason.passed ? '✅' : '❌';
          console.log(`${status} ${reason.check}:`, reason.value);
        });
      } else {
        console.log('❌ 광고를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('❌ 디버깅 중 에러:', error);
    }
  },

  // 노출 가능한 광고 목록 확인
  async checkDisplayableAds(placement?: string) {
    console.log(`🔍 노출 가능한 광고 확인${placement ? ` (${placement})` : ''}`);
    
    try {
      const debugInfo = await adService.getDisplayableAdsDebug(placement);
      
      if (debugInfo) {
        console.log(`전체 광고: ${debugInfo.totalAdsInDB}개`);
        console.log(`활성 광고: ${debugInfo.activeAds}개`);
        console.log(`노출 설정된 광고: ${debugInfo.visibleAds}개`);
        console.log(`노출 가능한 광고: ${debugInfo.displayableAdsCount}개`);
        
        if (debugInfo.displayableAds.length > 0) {
          console.log('✅ 노출 가능한 광고:');
          debugInfo.displayableAds.forEach(ad => {
            console.log(`  - ${ad.name} (우선순위: ${ad.displayControl.priority})`);
          });
        }
        
        if (debugInfo.filteredOutAds.length > 0) {
          console.log('❌ 필터링된 광고:');
          debugInfo.filteredOutAds.forEach(ad => {
            console.log(`  - ${ad.name}: ${ad.reason}`);
          });
        }
      }
    } catch (error) {
      console.error('❌ 디버깅 중 에러:', error);
    }
  }
};

// 전역에서 사용 가능하도록 설정 (개발 환경)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).adDebugger = adDebugger;
}
```

### 브라우저 콘솔에서 테스트

```javascript
// 개발 환경에서 브라우저 콘솔에서 실행

// 1. 특정 광고 상태 확인
adDebugger.checkAdStatus('마비스-광고');

// 2. 배너 위치 광고 확인
adDebugger.checkDisplayableAds('banner');

// 3. 전체 광고 현황 확인
adDebugger.checkDisplayableAds();
```

---

## ✅ 구현 체크리스트

### API 서비스
- [ ] `lib/services/adService.ts` 구현
- [ ] `lib/config/api.ts` 설정
- [ ] 에러 처리 및 로깅

### 컴포넌트
- [ ] `AdBanner` 컴포넌트 구현
- [ ] `AdLandingClient` 컴포넌트 구현
- [ ] 이벤트 추적 (노출, 클릭, 체류시간)

### 페이지 통합
- [ ] 메인 페이지에 광고 배너 추가
- [ ] 편지 상세 페이지에 광고 추가
- [ ] 광고 랜딩 페이지 구현

### 디버깅 도구
- [ ] 개발 환경 디버그 정보 표시
- [ ] 브라우저 콘솔 디버깅 유틸리티
- [ ] 광고 상태 확인 도구

### 환경 설정
- [ ] `NEXT_PUBLIC_API_URL` 환경변수 설정
- [ ] 개발/프로덕션 환경 분리

이 가이드를 따라 구현하면 Admin에서 등록한 광고가 Frontend에서 올바르게 노출됩니다!