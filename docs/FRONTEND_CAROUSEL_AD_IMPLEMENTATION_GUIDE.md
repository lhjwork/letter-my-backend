# 🎠 프론트엔드 캐러셀 광고 구현 가이드

## 📋 개요

이미지 중심의 캐러셀 광고 시스템을 프론트엔드에 통합하는 완전한 가이드입니다. 기존 텍스트 기반 광고를 캐러셀 형태로 개선하여 사용자 경험과 광고 효과를 극대화합니다.

### 🎯 주요 개선사항
- **이미지 중심 디자인**: 고해상도 캐러셀 이미지로 시각적 임팩트 극대화
- **반응형 지원**: 데스크톱/모바일 별도 이미지 및 텍스트 최적화
- **상호작용 추적**: 슬라이드 변경, 자동재생 제어 등 상세 이벤트 추적
- **성능 최적화**: 이미지 지연 로딩, WebP 지원, CDN 활용

---

## 🚀 구현 단계

### 1단계: 캐러셀 컴포넌트 생성

#### `components/ads/CarouselAd.tsx`

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

interface CarouselAdData {
  _id: string;
  name: string;
  slug: string;
  content: {
    headline: string;
    description: string;
    ctaText: string;
    targetUrl: string;
    carouselImage: string;
    carouselImageMobile: string;
    carouselPriority: number;
    carouselAutoPlay: boolean;
    carouselDuration: number;
    overlayOpacity: number;
    textColor: string;
    textShadow: boolean;
    mobileHeadline?: string;
    mobileDescription?: string;
  };
  stats: {
    carouselImpressions: number;
    carouselClicks: number;
    carouselCtr: number;
  };
}

interface CarouselAdProps {
  ads: CarouselAdData[];
  placement: 'home' | 'stories' | 'letters';
  aspectRatio?: '16:9' | '21:9' | '4:3';
  autoPlay?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
}

export const CarouselAd: React.FC<CarouselAdProps> = ({
  ads,
  placement,
  aspectRatio = '16:9',
  autoPlay = true,
  showControls = true,
  showIndicators = true,
  className = ''
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // 반응형 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 자동재생 로직
  useEffect(() => {
    if (isAutoPlaying && !isPaused && ads.length > 1) {
      const currentAd = ads[currentSlide];
      const duration = currentAd?.content.carouselDuration || 5000;
      
      intervalRef.current = setTimeout(() => {
        handleSlideChange('next', 'auto');
      }, duration);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [currentSlide, isAutoPlaying, isPaused, ads]);

  // 노출 이벤트 추적
  useEffect(() => {
    if (ads[currentSlide]) {
      trackCarouselEvent('carousel_impression', {
        currentSlide,
        totalSlides: ads.length,
        interactionType: 'auto'
      });
      startTimeRef.current = Date.now();
    }
  }, [currentSlide, ads]);

  const handleSlideChange = (direction: 'next' | 'prev' | 'direct', interactionType: 'auto' | 'manual' = 'manual', targetIndex?: number) => {
    const viewDuration = Date.now() - startTimeRef.current;
    
    // 현재 슬라이드 시청 시간 추적
    if (viewDuration > 1000) { // 1초 이상 시청한 경우만
      trackCarouselEvent('carousel_slide_change', {
        currentSlide,
        totalSlides: ads.length,
        viewDuration,
        interactionType,
        slideDirection: direction
      });
    }

    let nextSlide;
    if (direction === 'direct' && targetIndex !== undefined) {
      nextSlide = targetIndex;
    } else if (direction === 'next') {
      nextSlide = (currentSlide + 1) % ads.length;
    } else {
      nextSlide = currentSlide === 0 ? ads.length - 1 : currentSlide - 1;
    }

    setCurrentSlide(nextSlide);
  };

  const handleAdClick = (ad: CarouselAdData, clickTarget: 'image' | 'cta') => {
    const viewDuration = Date.now() - startTimeRef.current;
    
    trackCarouselEvent('carousel_click', {
      currentSlide,
      totalSlides: ads.length,
      viewDuration,
      interactionType: 'manual'
    }, clickTarget);

    // 외부 링크로 이동
    window.open(ad.content.targetUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleAutoPlay = () => {
    const newAutoPlayState = !isAutoPlaying;
    setIsAutoPlaying(newAutoPlayState);
    
    if (!newAutoPlayState) {
      trackCarouselEvent('carousel_autoplay_stop', {
        currentSlide,
        totalSlides: ads.length,
        interactionType: 'manual'
      });
    }
  };

  const handleMouseEnter = () => {
    if (isAutoPlaying) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (isAutoPlaying) {
      setIsPaused(false);
    }
  };

  // 이벤트 추적 함수
  const trackCarouselEvent = async (
    eventType: string, 
    carouselData: any, 
    clickTarget?: string
  ) => {
    const currentAd = ads[currentSlide];
    if (!currentAd) return;

    try {
      await fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          adId: currentAd._id,
          adSlug: currentAd.slug,
          clickTarget,
          carouselData,
          device: {
            type: isMobile ? 'mobile' : 'desktop',
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            userAgent: navigator.userAgent
          },
          session: {
            sessionId: getSessionId(),
            visitorId: getVisitorId(),
            isNewVisitor: isNewVisitor()
          },
          page: {
            path: window.location.pathname,
            referrer: document.referrer
          },
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to track carousel event:', error);
    }
  };

  if (!ads.length) return null;

  const currentAd = ads[currentSlide];
  const aspectRatioClass = {
    '16:9': 'aspect-video',
    '21:9': 'aspect-[21/9]',
    '4:3': 'aspect-[4/3]'
  }[aspectRatio];

  return (
    <div 
      className={`relative overflow-hidden rounded-lg shadow-lg ${aspectRatioClass} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 캐러셀 이미지 */}
      <div className="relative w-full h-full">
        <img
          src={isMobile ? currentAd.content.carouselImageMobile : currentAd.content.carouselImage}
          alt={currentAd.content.headline}
          className="w-full h-full object-cover"
          loading="lazy"
          onClick={() => handleAdClick(currentAd, 'image')}
        />
        
        {/* 오버레이 */}
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: currentAd.content.overlayOpacity }}
        />
        
        {/* 텍스트 콘텐츠 */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
          <div className="text-white">
            <h3 
              className={`text-lg md:text-2xl font-bold mb-2 ${
                currentAd.content.textShadow ? 'drop-shadow-lg' : ''
              }`}
              style={{ color: currentAd.content.textColor }}
            >
              {isMobile && currentAd.content.mobileHeadline 
                ? currentAd.content.mobileHeadline 
                : currentAd.content.headline}
            </h3>
            <p 
              className={`text-sm md:text-base mb-4 ${
                currentAd.content.textShadow ? 'drop-shadow-md' : ''
              }`}
              style={{ color: currentAd.content.textColor }}
            >
              {isMobile && currentAd.content.mobileDescription 
                ? currentAd.content.mobileDescription 
                : currentAd.content.description}
            </p>
            <button
              onClick={() => handleAdClick(currentAd, 'cta')}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              {currentAd.content.ctaText}
            </button>
          </div>
        </div>
      </div>

      {/* 네비게이션 컨트롤 */}
      {showControls && ads.length > 1 && (
        <>
          <button
            onClick={() => handleSlideChange('prev')}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => handleSlideChange('next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* 자동재생 컨트롤 */}
      {autoPlay && ads.length > 1 && (
        <button
          onClick={toggleAutoPlay}
          className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
      )}

      {/* 인디케이터 */}
      {showIndicators && ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
          {ads.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange('direct', 'manual', index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 유틸리티 함수들
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('carousel_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('carousel_session_id', sessionId);
  }
  return sessionId;
};

const getVisitorId = () => {
  let visitorId = localStorage.getItem('carousel_visitor_id');
  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('carousel_visitor_id', visitorId);
  }
  return visitorId;
};

const isNewVisitor = () => {
  return !localStorage.getItem('carousel_visitor_id');
};
```

### 2단계: 캐러셀 데이터 훅 생성

#### `hooks/useCarouselAds.ts`

```typescript
import { useState, useEffect } from 'react';

interface CarouselAdData {
  _id: string;
  name: string;
  slug: string;
  content: {
    headline: string;
    description: string;
    ctaText: string;
    targetUrl: string;
    carouselImage: string;
    carouselImageMobile: string;
    carouselPriority: number;
    carouselAutoPlay: boolean;
    carouselDuration: number;
    overlayOpacity: number;
    textColor: string;
    textShadow: boolean;
    mobileHeadline?: string;
    mobileDescription?: string;
  };
  stats: {
    carouselImpressions: number;
    carouselClicks: number;
    carouselCtr: number;
  };
}

interface CarouselResponse {
  success: boolean;
  data: {
    ads: CarouselAdData[];
    meta: {
      totalAds: number;
      carouselAds: number;
      filteredAds: number;
      recommendedDuration: number;
      aspectRatio: string;
      deviceType: string;
      placement?: string;
    };
  };
}

interface UseCarouselAdsOptions {
  placement: 'home' | 'stories' | 'letters';
  limit?: number;
  aspectRatio?: '16:9' | '21:9' | '4:3';
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  autoPlay?: boolean;
  enabled?: boolean;
}

export const useCarouselAds = (options: UseCarouselAdsOptions) => {
  const [ads, setAds] = useState<CarouselAdData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<CarouselResponse['data']['meta'] | null>(null);

  const {
    placement,
    limit = 3,
    aspectRatio = '16:9',
    deviceType = 'desktop',
    autoPlay,
    enabled = true
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const fetchCarouselAds = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          placement,
          limit: limit.toString(),
          aspectRatio,
          deviceType
        });

        if (autoPlay !== undefined) {
          params.append('autoPlay', autoPlay.toString());
        }

        const response = await fetch(`/api/ads/carousel?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CarouselResponse = await response.json();
        
        if (data.success) {
          setAds(data.data.ads);
          setMeta(data.data.meta);
        } else {
          throw new Error('Failed to fetch carousel ads');
        }
      } catch (err) {
        console.error('Error fetching carousel ads:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setAds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCarouselAds();
  }, [placement, limit, aspectRatio, deviceType, autoPlay, enabled]);

  const refetch = () => {
    if (enabled) {
      setLoading(true);
      // Re-trigger the effect by updating a dependency
    }
  };

  return {
    ads,
    loading,
    error,
    meta,
    refetch
  };
};
```

### 3단계: 페이지별 캐러셀 통합

#### 홈페이지 (`pages/Home.tsx`)

```tsx
import React from 'react';
import { CarouselAd } from '../components/ads/CarouselAd';
import { useCarouselAds } from '../hooks/useCarouselAds';

export const HomePage: React.FC = () => {
  const { ads, loading, error } = useCarouselAds({
    placement: 'home',
    limit: 3,
    aspectRatio: '16:9',
    autoPlay: true
  });

  return (
    <div className="min-h-screen">
      {/* 히어로 섹션 */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-8">
            편지 커뮤니티에 오신 것을 환영합니다
          </h1>
          
          {/* 캐러셀 광고 */}
          {!loading && !error && ads.length > 0 && (
            <div className="mb-12">
              <CarouselAd
                ads={ads}
                placement="home"
                aspectRatio="16:9"
                autoPlay={true}
                showControls={true}
                showIndicators={true}
                className="max-w-4xl mx-auto"
              />
            </div>
          )}
          
          {/* 로딩 상태 */}
          {loading && (
            <div className="max-w-4xl mx-auto mb-12">
              <div className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
            </div>
          )}
          
          {/* 에러 상태 */}
          {error && (
            <div className="max-w-4xl mx-auto mb-12 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">광고를 불러오는데 실패했습니다: {error}</p>
            </div>
          )}
        </div>
      </section>

      {/* 나머지 홈페이지 콘텐츠 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* 기존 홈페이지 콘텐츠 */}
        </div>
      </section>
    </div>
  );
};
```

#### 스토리 목록 페이지 (`pages/Stories.tsx`)

```tsx
import React from 'react';
import { CarouselAd } from '../components/ads/CarouselAd';
import { useCarouselAds } from '../hooks/useCarouselAds';

export const StoriesPage: React.FC = () => {
  const { ads, loading, error } = useCarouselAds({
    placement: 'stories',
    limit: 2,
    aspectRatio: '21:9', // 와이드 비율
    autoPlay: true
  });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">스토리 목록</h1>
        
        {/* 캐러셀 광고 */}
        {!loading && !error && ads.length > 0 && (
          <div className="mb-8">
            <CarouselAd
              ads={ads}
              placement="stories"
              aspectRatio="21:9"
              autoPlay={true}
              showControls={true}
              showIndicators={true}
              className="w-full"
            />
          </div>
        )}
        
        {/* 스토리 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 스토리 카드들 */}
        </div>
      </div>
    </div>
  );
};
```

#### 편지 상세 페이지 (`pages/LetterDetail.tsx`)

```tsx
import React from 'react';
import { CarouselAd } from '../components/ads/CarouselAd';
import { useCarouselAds } from '../hooks/useCarouselAds';

export const LetterDetailPage: React.FC = () => {
  const { ads, loading, error } = useCarouselAds({
    placement: 'letters',
    limit: 1,
    aspectRatio: '4:3', // 정사각형에 가까운 비율
    autoPlay: false // 읽기 중에는 자동재생 비활성화
  });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <article className="max-w-3xl mx-auto">
          {/* 편지 내용 */}
          <div className="prose prose-lg mx-auto mb-8">
            {/* 편지 콘텐츠 */}
          </div>
          
          {/* 캐러셀 광고 */}
          {!loading && !error && ads.length > 0 && (
            <div className="my-8">
              <CarouselAd
                ads={ads}
                placement="letters"
                aspectRatio="4:3"
                autoPlay={false}
                showControls={false}
                showIndicators={false}
                className="max-w-md mx-auto"
              />
            </div>
          )}
        </article>
      </div>
    </div>
  );
};
```

---

## 🎨 스타일링 가이드

### Tailwind CSS 설정

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      aspectRatio: {
        '21/9': '21 / 9',
      },
    },
  },
  plugins: [],
};
```

### 커스텀 CSS (선택사항)

```css
/* styles/carousel.css */
.carousel-fade-enter {
  opacity: 0;
  transform: translateX(100%);
}

.carousel-fade-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: opacity 300ms, transform 300ms;
}

.carousel-fade-exit {
  opacity: 1;
  transform: translateX(0);
}

.carousel-fade-exit-active {
  opacity: 0;
  transform: translateX(-100%);
  transition: opacity 300ms, transform 300ms;
}
```

---

## 📊 성능 최적화

### 1. 이미지 최적화

```tsx
// components/ads/OptimizedImage.tsx
import React, { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  loading = 'lazy'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // WebP 지원 확인
  const getOptimizedSrc = (originalSrc: string) => {
    if (originalSrc.includes('unsplash.com')) {
      return `${originalSrc}&fm=webp&q=80`;
    }
    return originalSrc;
  };

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={getOptimizedSrc(src)}
        alt={alt}
        loading={loading}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-500">이미지를 불러올 수 없습니다</span>
        </div>
      )}
    </div>
  );
};
```

### 2. 지연 로딩

```tsx
// hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react';

export const useIntersectionObserver = (options?: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref, isIntersecting };
};

// 사용 예시
const LazyCarouselAd: React.FC<CarouselAdProps> = (props) => {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  return (
    <div ref={ref}>
      {isIntersecting ? (
        <CarouselAd {...props} />
      ) : (
        <div className="aspect-video bg-gray-200 rounded-lg" />
      )}
    </div>
  );
};
```

---

## 🧪 테스트 가이드

### 단위 테스트

```tsx
// __tests__/CarouselAd.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CarouselAd } from '../components/ads/CarouselAd';

const mockAds = [
  {
    _id: '1',
    name: 'Test Ad 1',
    slug: 'test-ad-1',
    content: {
      headline: 'Test Headline 1',
      description: 'Test Description 1',
      ctaText: 'Click Here',
      targetUrl: 'https://example.com',
      carouselImage: 'https://example.com/image1.jpg',
      carouselImageMobile: 'https://example.com/image1-mobile.jpg',
      carouselPriority: 90,
      carouselAutoPlay: true,
      carouselDuration: 5000,
      overlayOpacity: 0.4,
      textColor: 'white',
      textShadow: true
    },
    stats: {
      carouselImpressions: 100,
      carouselClicks: 10,
      carouselCtr: 10
    }
  }
];

describe('CarouselAd', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders carousel ad correctly', () => {
    render(<CarouselAd ads={mockAds} placement="home" />);
    
    expect(screen.getByText('Test Headline 1')).toBeInTheDocument();
    expect(screen.getByText('Test Description 1')).toBeInTheDocument();
    expect(screen.getByText('Click Here')).toBeInTheDocument();
  });

  test('tracks impression event on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<CarouselAd ads={mockAds} placement="home" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('carousel_impression')
      });
    });
  });

  test('tracks click event on CTA click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<CarouselAd ads={mockAds} placement="home" />);
    
    const ctaButton = screen.getByText('Click Here');
    fireEvent.click(ctaButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('carousel_click')
      });
    });
  });
});
```

### E2E 테스트

```typescript
// cypress/integration/carousel-ads.spec.ts
describe('Carousel Ads', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/ads/carousel*', {
      fixture: 'carousel-ads.json'
    }).as('getCarouselAds');
    
    cy.intercept('POST', '/api/ads/track', {
      success: true
    }).as('trackEvent');
  });

  it('displays carousel ads on home page', () => {
    cy.visit('/');
    cy.wait('@getCarouselAds');
    
    cy.get('[data-testid="carousel-ad"]').should('be.visible');
    cy.get('[data-testid="carousel-headline"]').should('contain', 'Test Headline');
  });

  it('auto-advances slides', () => {
    cy.visit('/');
    cy.wait('@getCarouselAds');
    
    cy.get('[data-testid="carousel-slide-0"]').should('be.visible');
    cy.wait(6000); // Wait for auto-advance
    cy.get('[data-testid="carousel-slide-1"]').should('be.visible');
  });

  it('tracks events correctly', () => {
    cy.visit('/');
    cy.wait('@getCarouselAds');
    
    // Check impression tracking
    cy.wait('@trackEvent').its('request.body').should('include', 'carousel_impression');
    
    // Click CTA and check click tracking
    cy.get('[data-testid="carousel-cta"]').click();
    cy.wait('@trackEvent').its('request.body').should('include', 'carousel_click');
  });
});
```

---

## 🚀 배포 체크리스트

### 프로덕션 준비사항

- [ ] **이미지 최적화**: WebP 포맷 지원, CDN 설정
- [ ] **성능 모니터링**: Core Web Vitals 측정
- [ ] **접근성 검증**: 키보드 네비게이션, 스크린 리더 지원
- [ ] **브라우저 호환성**: IE11+ 지원 (필요시)
- [ ] **모바일 최적화**: 터치 제스처, 반응형 이미지
- [ ] **에러 처리**: 네트워크 오류, 이미지 로딩 실패 대응
- [ ] **분석 도구**: Google Analytics, 광고 성과 추적
- [ ] **A/B 테스트**: 캐러셀 vs 정적 광고 성과 비교

### 성능 목표

- **LCP (Largest Contentful Paint)**: < 2.5초
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **캐러셀 로딩 시간**: < 1초
- **이미지 최적화율**: > 70% 용량 감소

---

## 📞 지원 및 문의

구현 중 문제가 발생하거나 추가 기능이 필요한 경우:

1. **API 문제**: 백엔드 팀에 문의
2. **디자인 이슈**: 디자인 팀과 협의
3. **성능 문제**: 프론트엔드 리드에게 보고
4. **버그 리포트**: GitHub Issues에 등록

---

이 가이드를 따라 구현하면 고성능의 캐러셀 광고 시스템을 성공적으로 통합할 수 있습니다. 사용자 경험과 광고 효과를 모두 극대화하는 현대적인 광고 솔루션을 제공하게 됩니다.