# 🎨 Letter SEO 프론트엔드 통합 가이드

## 📋 개요

Next.js App Router 기반으로 Letter 프로젝트의 SEO를 최적화하는 완전한 가이드입니다.

### 핵심 원칙
1. **모든 페이지 SSR/ISR** - Bot과 User 모두 동일한 HTML
2. **`<Link>` 컴포넌트 필수** - 크롤러가 링크를 따라갈 수 있도록
3. **generateMetadata() 활용** - 페이지별 동적 메타데이터
4. **구조화 데이터 포함** - Rich Snippets 지원

---

## 🔧 Next.js 설정

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 최적화
  images: {
    domains: [
      'your-backend-domain.com',
      'your-cdn-domain.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // 메타데이터 기본 설정
  metadata: {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://letter.com'),
  },
  
  // ISR 설정
  experimental: {
    staleTimes: {
      dynamic: 30, // 30초
      static: 180, // 3분
    },
  },
};

module.exports = nextConfig;
```

### 환경 변수 (.env.local)

```bash
# 프론트엔드 URL
NEXT_PUBLIC_SITE_URL=https://letter.com

# 백엔드 API URL
NEXT_PUBLIC_API_URL=https://api.letter.com

# 서버 사이드에서만 사용 (클라이언트 노출 안됨)
API_URL=https://api.letter.com
```

---

## 📦 SEO 유틸리티 함수

### lib/seo.ts

```typescript
// lib/seo.ts
import { Metadata } from 'next';

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  canonicalUrl: string;
  robots: {
    index: boolean;
    follow: boolean;
  };
  structuredData?: Record<string, any>;
}

/**
 * 백엔드에서 SEO 메타데이터 조회
 */
export async function fetchSEOMetadata(
  url: string,
  letterId?: string
): Promise<SEOMetadata | null> {
  try {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    const params = new URLSearchParams({ url });
    if (letterId) params.append('letterId', letterId);
    
    const response = await fetch(`${apiUrl}/api/seo/metadata?${params}`, {
      next: { revalidate: 300 }, // 5분 캐시
    });
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to fetch SEO metadata:', error);
    return null;
  }
}

/**
 * SEO 메타데이터를 Next.js Metadata 형식으로 변환
 */
export function convertToNextMetadata(seo: SEOMetadata): Metadata {
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    
    // Open Graph
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [
        {
          url: seo.ogImage,
          width: 1200,
          height: 630,
          alt: seo.ogTitle,
        },
      ],
      type: seo.ogType as any,
      siteName: 'Letter',
      locale: 'ko_KR',
    },
    
    // Twitter
    twitter: {
      card: seo.twitterCard as any,
      title: seo.twitterTitle,
      description: seo.twitterDescription,
      images: [seo.twitterImage],
      creator: '@letter_official',
    },
    
    // Canonical URL
    alternates: {
      canonical: seo.canonicalUrl,
    },
    
    // Robots
    robots: {
      index: seo.robots.index,
      follow: seo.robots.follow,
      googleBot: {
        index: seo.robots.index,
        follow: seo.robots.follow,
      },
    },
  };
}

/**
 * 기본 SEO 메타데이터
 */
export function getDefaultMetadata(): Metadata {
  return {
    title: {
      default: 'Letter - 마음을 전하는 편지 플랫폼',
      template: '%s | Letter',
    },
    description: '소중한 사람에게 진심을 담은 편지를 보내세요. 감동적인 사연을 공유하고 공감을 나누는 따뜻한 커뮤니티입니다.',
    keywords: ['편지', '사연', '감동', '공감', '마음', '진심'],
    authors: [{ name: 'Letter Team' }],
    creator: 'Letter',
    publisher: 'Letter',
    
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      siteName: 'Letter',
      title: 'Letter - 마음을 전하는 편지 플랫폼',
      description: '소중한 사람에게 진심을 담은 편지를 보내세요',
      images: [
        {
          url: '/og-default.png',
          width: 1200,
          height: 630,
          alt: 'Letter',
        },
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title: 'Letter',
      description: '마음을 전하는 편지 플랫폼',
      images: ['/og-default.png'],
      creator: '@letter_official',
    },
    
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    
    verification: {
      google: 'your-google-verification-code',
      other: {
        'naver-site-verification': 'your-naver-verification-code',
      },
    },
  };
}
```

---

## 🏠 페이지별 SEO 구현

### 1. 루트 레이아웃 (app/layout.tsx)

```typescript
// app/layout.tsx
import { Metadata } from 'next';
import { getDefaultMetadata } from '@/lib/seo';

export const metadata: Metadata = getDefaultMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX');
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

### 2. 메인 페이지 (app/page.tsx)

```typescript
// app/page.tsx
import { Metadata } from 'next';
import { fetchSEOMetadata, convertToNextMetadata, getDefaultMetadata } from '@/lib/seo';
import FeaturedStories from '@/components/FeaturedStories';
import StructuredData from '@/components/StructuredData';

export async function generateMetadata(): Promise<Metadata> {
  const seoData = await fetchSEOMetadata('/');
  
  if (seoData) {
    return convertToNextMetadata(seoData);
  }
  
  return getDefaultMetadata();
}

export default async function HomePage() {
  // Featured Stories 조회
  const stories = await getFeaturedStories();
  
  // 구조화 데이터
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Letter',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    description: '마음을 전하는 편지 플랫폼',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
  
  return (
    <>
      <StructuredData data={structuredData} />
      
      <main>
        <h1>Letter - 마음을 전하는 편지 플랫폼</h1>
        <FeaturedStories stories={stories} />
      </main>
    </>
  );
}

async function getFeaturedStories() {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  const response = await fetch(`${apiUrl}/api/letters/stories/featured`, {
    next: { revalidate: 300 }, // 5분 캐시
  });
  
  if (!response.ok) return [];
  
  const result = await response.json();
  return result.data;
}
```

---

### 3. 사연 목록 페이지 (app/stories/page.tsx)

```typescript
// app/stories/page.tsx
import { Metadata } from 'next';
import { fetchSEOMetadata, convertToNextMetadata } from '@/lib/seo';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';

export async function generateMetadata(): Promise<Metadata> {
  const seoData = await fetchSEOMetadata('/stories');
  
  if (seoData) {
    return convertToNextMetadata(seoData);
  }
  
  return {
    title: '사연 모음',
    description: '진심 어린 사연을 만나보세요',
  };
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string };
}) {
  const page = parseInt(searchParams.page || '1');
  const category = searchParams.category;
  
  const stories = await getStories(page, category);
  
  // 구조화 데이터
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '사연 모음',
    description: '진심 어린 사연 모음',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/stories`,
  };
  
  return (
    <>
      <StructuredData data={structuredData} />
      
      <main>
        <h1>사연 모음</h1>
        
        {/* 카테고리 필터 - 크롤러가 따라갈 수 있도록 Link 사용 */}
        <nav aria-label="카테고리">
          <Link href="/stories">전체</Link>
          <Link href="/stories?category=가족">가족</Link>
          <Link href="/stories?category=사랑">사랑</Link>
          <Link href="/stories?category=우정">우정</Link>
          <Link href="/stories?category=감사">감사</Link>
        </nav>
        
        {/* 사연 목록 */}
        <div className="stories-grid">
          {stories.map((story) => (
            <article key={story._id}>
              {/* ✅ 반드시 Link 사용 */}
              <Link href={`/letters/${story._id}`}>
                <h2>{story.title}</h2>
                <p>{story.plainContent?.substring(0, 100)}...</p>
                <div>
                  <span>{story.authorName}</span>
                  <span>{story.category}</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
        
        {/* 페이지네이션 - Link 사용 */}
        <nav aria-label="페이지네이션">
          {page > 1 && (
            <Link href={`/stories?page=${page - 1}`}>이전</Link>
          )}
          <Link href={`/stories?page=${page + 1}`}>다음</Link>
        </nav>
      </main>
    </>
  );
}

async function getStories(page: number, category?: string) {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
  });
  if (category) params.append('category', category);
  
  const response = await fetch(`${apiUrl}/api/letters/stories?${params}`, {
    next: { revalidate: 60 }, // 1분 캐시
  });
  
  if (!response.ok) return [];
  
  const result = await response.json();
  return result.data;
}

// ISR 설정
export const revalidate = 60; // 1분마다 재생성
```

---

### 4. 개별 사연 페이지 (app/letters/[id]/page.tsx)

```typescript
// app/letters/[id]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchSEOMetadata, convertToNextMetadata } from '@/lib/seo';
import StructuredData from '@/components/StructuredData';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;
  
  // 백엔드에서 SEO 메타데이터 조회
  const seoData = await fetchSEOMetadata(`/letters/${id}`, id);
  
  if (seoData) {
    return convertToNextMetadata(seoData);
  }
  
  // Fallback: Letter 직접 조회
  const letter = await getLetter(id);
  if (!letter) {
    return {
      title: '사연을 찾을 수 없습니다',
    };
  }
  
  return {
    title: letter.title,
    description: letter.plainContent?.substring(0, 160) || letter.content.substring(0, 160),
    openGraph: {
      title: letter.title,
      description: letter.plainContent?.substring(0, 160),
      images: [letter.ogImageUrl || '/og-default.png'],
      type: 'article',
    },
  };
}

export default async function LetterPage({ params }: Props) {
  const { id } = params;
  const letter = await getLetter(id);
  
  if (!letter) {
    notFound();
  }
  
  // 구조화 데이터 (백엔드에서 가져온 것 사용)
  const seoData = await fetchSEOMetadata(`/letters/${id}`, id);
  const structuredData = seoData?.structuredData || {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: letter.title,
    author: {
      '@type': 'Person',
      name: letter.authorName,
    },
    datePublished: letter.createdAt,
    image: letter.ogImageUrl,
  };
  
  return (
    <>
      <StructuredData data={structuredData} />
      
      <article>
        <header>
          <h1>{letter.title}</h1>
          <div>
            <span>작성자: {letter.authorName}</span>
            <span>카테고리: {letter.category}</span>
            <time dateTime={letter.createdAt}>
              {new Date(letter.createdAt).toLocaleDateString('ko-KR')}
            </time>
          </div>
        </header>
        
        <div
          className="letter-content"
          dangerouslySetInnerHTML={{ __html: letter.content }}
        />
        
        <footer>
          <div>
            <span>조회수: {letter.viewCount}</span>
            <span>좋아요: {letter.likeCount}</span>
          </div>
        </footer>
      </article>
    </>
  );
}

async function getLetter(id: string) {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  
  try {
    const response = await fetch(`${apiUrl}/api/letters/${id}`, {
      next: { revalidate: 300 }, // 5분 캐시
    });
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to fetch letter:', error);
    return null;
  }
}

// 정적 생성할 경로 (인기 사연만)
export async function generateStaticParams() {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  
  try {
    // 인기 사연 100개만 정적 생성
    const response = await fetch(`${apiUrl}/api/letters/stories?limit=100&sort=popular`);
    const result = await response.json();
    
    return result.data.map((letter: any) => ({
      id: letter._id,
    }));
  } catch (error) {
    return [];
  }
}

// ISR 설정
export const revalidate = 300; // 5분마다 재생성
export const dynamicParams = true; // 나머지는 동적 생성
```

---

## 🧩 공통 컴포넌트

### StructuredData 컴포넌트

```typescript
// components/StructuredData.tsx
interface Props {
  data: Record<string, any>;
}

export default function StructuredData({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}
```

### SEO-Friendly Link 컴포넌트

```typescript
// components/SEOLink.tsx
import Link from 'next/link';
import { ReactNode } from 'react';

interface Props {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
}

/**
 * SEO 최적화된 Link 컴포넌트
 * - 항상 <a> 태그로 렌더링
 * - prefetch 기본값 true
 */
export default function SEOLink({ href, children, className, prefetch = true }: Props) {
  return (
    <Link href={href} className={className} prefetch={prefetch}>
      {children}
    </Link>
  );
}
```

---

## 🚫 절대 하지 말아야 할 것

### ❌ JS 클릭 이벤트로 네비게이션

```typescript
// ❌ 크롤러가 링크를 따라갈 수 없음
<div onClick={() => router.push('/stories')}>
  사연 보기
</div>

<button onClick={handleClick}>
  더보기
</button>
```

### ✅ 올바른 방법

```typescript
// ✅ Link 컴포넌트 사용
import Link from 'next/link';

<Link href="/stories">
  <div className="clickable">사연 보기</div>
</Link>

<Link href="/more" className="btn">
  더보기
</Link>
```

---

## 📊 Sitemap 생성

### app/sitemap.ts

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://letter.com';
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  
  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/stories`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
  
  // 동적 페이지 - 사연
  try {
    const response = await fetch(`${apiUrl}/api/letters/stories?limit=1000`);
    const result = await response.json();
    
    const letterPages: MetadataRoute.Sitemap = result.data.map((letter: any) => ({
      url: `${baseUrl}/letters/${letter._id}`,
      lastModified: new Date(letter.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
    
    return [...staticPages, ...letterPages];
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    return staticPages;
  }
}
```

### app/robots.ts

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://letter.com';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/private/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

---

## 🎯 성능 최적화

### 이미지 최적화

```typescript
import Image from 'next/image';

// ✅ Next.js Image 컴포넌트 사용
<Image
  src={letter.ogImageUrl}
  alt={letter.title}
  width={1200}
  height={630}
  priority={false}
  loading="lazy"
/>
```

### 폰트 최적화

```typescript
// app/layout.tsx
import { Noto_Sans_KR } from 'next/font/google';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKR.className}>
      <body>{children}</body>
    </html>
  );
}
```

---

이 가이드를 따라 구현하면 Letter 프로젝트의 모든 페이지가 SEO 최적화되고, 검색 엔진에서 쉽게 발견될 수 있습니다!
