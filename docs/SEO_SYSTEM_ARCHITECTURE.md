# 📊 Letter 프로젝트 SEO 시스템 아키텍처

## 🎯 프로젝트 개요

Letter는 사연과 편지를 공유하는 감성 커뮤니티 플랫폼입니다. SEO 최적화를 통해 검색 엔진에서 사연을 쉽게 발견할 수 있도록 하고, 유기적 트래픽을 증가시키는 것이 목표입니다.

### 핵심 SEO 타겟 페이지
1. **메인 랜딩 페이지** (`/`) - 브랜드 인지도
2. **사연 목록 페이지** (`/stories`) - 카테고리별 사연 탐색
3. **개별 사연 페이지** (`/letters/{letterId}`) - 롱테일 키워드
4. **카테고리 페이지** (`/stories/category/{category}`) - 카테고리별 SEO
5. **작성자 페이지** (`/author/{authorName}`) - 작성자 브랜딩

---

## 🏗️ 현재 Letter 모델 분석

### 기존 OG 메타데이터 필드
```typescript
// Letter 모델에 이미 존재하는 SEO 관련 필드
interface ILetter {
  // 기본 정보
  title: string;
  content: string;
  plainContent?: string;
  authorName: string;
  category: LetterCategory;
  
  // 기존 OG 필드 (활용 가능)
  ogTitle?: string;
  ogPreviewText?: string;
  ogBgColor: string;
  ogIllustration: string;
  ogFontSize: number;
  ogImageType: OgImageType;
  ogImageUrl?: string;
  
  // SEO 지표
  viewCount: number;
  likeCount: number;
  isPublic: boolean;
}
```

**✅ 장점:**
- OG 메타데이터 기본 구조 이미 존재
- 개별 편지마다 커스터마이징 가능
- 이미지 자동 생성 시스템 구축 가능

**❌ 부족한 부분:**
- 검색 엔진용 메타 키워드 없음
- 구조화 데이터 (JSON-LD) 없음
- 관리자 중앙 관리 시스템 없음
- 동적 URL 패턴 관리 불가

---

## 💡 권장 아키텍처: 하이브리드 방식

### 설계 철학

**개별 콘텐츠 SEO (Letter 모델 활용) + 전역 SEO 관리 (새로운 SEOConfig 모델)**

```
우선순위:
1. Admin SEOConfig (전역 규칙) - 관리자가 직접 설정
2. Letter 자체 메타데이터 - 작성자/시스템이 생성
3. 동적 생성 로직 - 카테고리, 통계 기반
4. 기본값 (Fallback)
```

이 방식의 장점:
- 기존 Letter 모델의 OG 필드 재활용
- 관리자가 중요한 페이지만 직접 관리
- 수만 개의 사연도 자동으로 SEO 최적화
- 점진적 마이그레이션 가능

---

## 📦 새로운 SEOConfig 모델 설계

### 모델 스키마

```typescript
// src/models/SEOConfig.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISEOConfig extends Document {
  // URL 패턴
  urlPattern: string;           // "/", "/stories", "/letters/{letterId}"
  patternType: "exact" | "dynamic";
  
  // 기본 메타 태그
  metaTitle?: string;           // <title> 태그
  metaDescription?: string;     // <meta name="description">
  metaKeywords?: string[];      // <meta name="keywords">
  
  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;              // "website", "article"
  
  // Twitter Card
  twitterCard?: "summary" | "summary_large_image";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  
  // 구조화 데이터 (JSON-LD)
  structuredData?: Record<string, any>;
  
  // Canonical URL
  canonicalUrl?: string;
  
  // 로봇 제어
  robots?: {
    index: boolean;
    follow: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
  };
  
  // 우선순위 및 활성화
  priority: number;             // 0-100, 높을수록 우선
  isActive: boolean;
  
  // 메타
  createdBy?: mongoose.Types.ObjectId;
  notes?: string;               // 관리자 메모
  createdAt: Date;
  updatedAt: Date;
}

const SEOConfigSchema = new Schema<ISEOConfig>(
  {
    urlPattern: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    patternType: {
      type: String,
      enum: ["exact", "dynamic"],
      required: true,
      index: true,
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    metaKeywords: [String],
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    ogType: {
      type: String,
      default: "website",
    },
    twitterCard: {
      type: String,
      enum: ["summary", "summary_large_image"],
      default: "summary_large_image",
    },
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: String,
    structuredData: Schema.Types.Mixed,
    canonicalUrl: String,
    robots: {
      index: { type: Boolean, default: true },
      follow: { type: Boolean, default: true },
      noarchive: Boolean,
      nosnippet: Boolean,
    },
    priority: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// 복합 인덱스
SEOConfigSchema.index({ urlPattern: 1, priority: -1 });
SEOConfigSchema.index({ patternType: 1, isActive: 1 });

export default mongoose.model<ISEOConfig>("SEOConfig", SEOConfigSchema);
```

---

## 🔧 Letter 모델 확장

### SEO 필드 추가 (선택적)

```typescript
// src/models/Letter.ts에 추가할 필드

interface ILetter extends Document {
  // ... 기존 필드 ...
  
  // SEO 확장 필드 (선택적)
  seo?: {
    metaKeywords?: string[];      // 검색 키워드
    canonicalUrl?: string;        // 중복 콘텐츠 방지
    noindex?: boolean;            // 검색 제외 (민감한 내용)
    structuredData?: Record<string, any>; // 개별 사연용 JSON-LD
  };
}
```

**마이그레이션 전략:**
- 기존 Letter는 그대로 유지
- 새로운 사연부터 seo 필드 활용
- 기존 사연은 동적 생성 로직으로 커버

---

## 🎨 SEO 조회 로직 (우선순위 시스템)

### 서비스 레이어 구현

```typescript
// src/services/seoService.ts
import SEOConfig from "../models/SEOConfig";
import Letter from "../models/Letter";

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

class SEOService {
  /**
   * URL에 맞는 SEO 메타데이터 조회
   * 우선순위: Admin SEOConfig > Letter 자체 > 동적 생성 > 기본값
   */
  async getSEOMetadata(url: string, letterId?: string): Promise<SEOMetadata> {
    // 1. Admin SEOConfig 조회 (최우선)
    const adminConfig = await this.getAdminSEOConfig(url);
    if (adminConfig) {
      return this.formatAdminConfig(adminConfig, url);
    }
    
    // 2. Letter 자체 메타데이터 (개별 사연)
    if (letterId) {
      const letterMeta = await this.getLetterSEOMetadata(letterId);
      if (letterMeta) {
        return letterMeta;
      }
    }
    
    // 3. 동적 생성 로직
    const dynamicMeta = await this.generateDynamicSEO(url);
    if (dynamicMeta) {
      return dynamicMeta;
    }
    
    // 4. 기본값
    return this.getDefaultSEO(url);
  }
  
  /**
   * Admin SEOConfig 조회
   */
  private async getAdminSEOConfig(url: string): Promise<ISEOConfig | null> {
    // 정확한 URL 매칭
    let config = await SEOConfig.findOne({
      urlPattern: url,
      patternType: "exact",
      isActive: true,
    }).sort({ priority: -1 });
    
    if (config) return config;
    
    // 동적 패턴 매칭
    const dynamicConfigs = await SEOConfig.find({
      patternType: "dynamic",
      isActive: true,
    }).sort({ priority: -1 });
    
    for (const cfg of dynamicConfigs) {
      if (this.matchPattern(cfg.urlPattern, url)) {
        return cfg;
      }
    }
    
    return null;
  }
  
  /**
   * Letter 자체 메타데이터 조회
   */
  private async getLetterSEOMetadata(letterId: string): Promise<SEOMetadata | null> {
    const letter = await Letter.findById(letterId);
    if (!letter || !letter.isPublic) return null;
    
    return {
      title: letter.ogTitle || letter.title,
      description: letter.ogPreviewText || this.truncate(letter.plainContent || letter.content, 160),
      keywords: this.generateKeywords(letter),
      ogTitle: letter.ogTitle || letter.title,
      ogDescription: letter.ogPreviewText || this.truncate(letter.plainContent || letter.content, 160),
      ogImage: letter.ogImageUrl || this.getDefaultOgImage(),
      ogType: "article",
      twitterCard: "summary_large_image",
      twitterTitle: letter.ogTitle || letter.title,
      twitterDescription: letter.ogPreviewText || this.truncate(letter.plainContent || letter.content, 160),
      twitterImage: letter.ogImageUrl || this.getDefaultOgImage(),
      canonicalUrl: `${process.env.FRONTEND_URL}/letters/${letterId}`,
      robots: {
        index: !letter.seo?.noindex,
        follow: true,
      },
      structuredData: this.generateLetterStructuredData(letter),
    };
  }
  
  /**
   * 동적 SEO 생성 (카테고리, 통계 기반)
   */
  private async generateDynamicSEO(url: string): Promise<SEOMetadata | null> {
    // /stories/category/{category}
    const categoryMatch = url.match(/^\/stories\/category\/(.+)$/);
    if (categoryMatch) {
      const category = decodeURIComponent(categoryMatch[1]);
      return this.generateCategorySEO(category);
    }
    
    // /stories
    if (url === "/stories") {
      return this.generateStoriesListSEO();
    }
    
    return null;
  }
  
  /**
   * 카테고리 페이지 SEO 생성
   */
  private async generateCategorySEO(category: string): Promise<SEOMetadata> {
    const count = await Letter.countDocuments({
      type: "story",
      category,
      isPublic: true,
    });
    
    const categoryNames: Record<string, string> = {
      "가족": "가족",
      "사랑": "사랑",
      "우정": "우정",
      "성장": "성장",
      "위로": "위로",
      "추억": "추억",
      "감사": "감사",
      "기타": "기타",
    };
    
    const categoryName = categoryNames[category] || category;
    
    return {
      title: `${categoryName} 사연 모음 - Letter`,
      description: `${categoryName}에 관한 진심 어린 사연 ${count}개를 만나보세요. 감동적인 이야기와 공감을 나누는 공간입니다.`,
      keywords: [categoryName, "사연", "편지", "감동", "공감", "이야기"],
      ogTitle: `${categoryName} 사연 모음`,
      ogDescription: `${categoryName}에 관한 진심 어린 사연 ${count}개`,
      ogImage: this.getDefaultOgImage(),
      ogType: "website",
      twitterCard: "summary_large_image",
      twitterTitle: `${categoryName} 사연 모음`,
      twitterDescription: `${categoryName}에 관한 진심 어린 사연 ${count}개`,
      twitterImage: this.getDefaultOgImage(),
      canonicalUrl: `${process.env.FRONTEND_URL}/stories/category/${encodeURIComponent(category)}`,
      robots: { index: true, follow: true },
    };
  }
  
  /**
   * 사연 목록 페이지 SEO
   */
  private async generateStoriesListSEO(): Promise<SEOMetadata> {
    const totalCount = await Letter.countDocuments({
      type: "story",
      isPublic: true,
    });
    
    return {
      title: "사연 모음 - 진심을 담은 이야기들 | Letter",
      description: `${totalCount}개의 진심 어린 사연을 만나보세요. 가족, 사랑, 우정, 감사의 마음을 담은 감동적인 이야기들입니다.`,
      keywords: ["사연", "편지", "감동", "이야기", "공감", "진심"],
      ogTitle: "사연 모음 - Letter",
      ogDescription: `${totalCount}개의 진심 어린 사연`,
      ogImage: this.getDefaultOgImage(),
      ogType: "website",
      twitterCard: "summary_large_image",
      twitterTitle: "사연 모음 - Letter",
      twitterDescription: `${totalCount}개의 진심 어린 사연`,
      twitterImage: this.getDefaultOgImage(),
      canonicalUrl: `${process.env.FRONTEND_URL}/stories`,
      robots: { index: true, follow: true },
    };
  }
  
  /**
   * 기본 SEO (Fallback)
   */
  private getDefaultSEO(url: string): SEOMetadata {
    return {
      title: "Letter - 마음을 전하는 편지 플랫폼",
      description: "소중한 사람에게 진심을 담은 편지를 보내세요. 감동적인 사연을 공유하고 공감을 나누는 따뜻한 커뮤니티입니다.",
      keywords: ["편지", "사연", "감동", "공감", "마음", "진심"],
      ogTitle: "Letter - 마음을 전하는 편지 플랫폼",
      ogDescription: "소중한 사람에게 진심을 담은 편지를 보내세요",
      ogImage: this.getDefaultOgImage(),
      ogType: "website",
      twitterCard: "summary_large_image",
      twitterTitle: "Letter",
      twitterDescription: "마음을 전하는 편지 플랫폼",
      twitterImage: this.getDefaultOgImage(),
      canonicalUrl: `${process.env.FRONTEND_URL}${url}`,
      robots: { index: true, follow: true },
    };
  }
  
  /**
   * Letter용 구조화 데이터 생성
   */
  private generateLetterStructuredData(letter: any): Record<string, any> {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: letter.title,
      description: this.truncate(letter.plainContent || letter.content, 160),
      author: {
        "@type": "Person",
        name: letter.authorName,
      },
      datePublished: letter.createdAt.toISOString(),
      dateModified: letter.updatedAt.toISOString(),
      image: letter.ogImageUrl || this.getDefaultOgImage(),
      publisher: {
        "@type": "Organization",
        name: "Letter",
        logo: {
          "@type": "ImageObject",
          url: `${process.env.FRONTEND_URL}/logo.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${process.env.FRONTEND_URL}/letters/${letter._id}`,
      },
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/ViewAction",
          userInteractionCount: letter.viewCount,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/LikeAction",
          userInteractionCount: letter.likeCount,
        },
      ],
    };
  }
  
  // 유틸리티 메서드
  private matchPattern(pattern: string, url: string): boolean {
    const regex = new RegExp("^" + pattern.replace(/\{[^}]+\}/g, "[^/]+") + "$");
    return regex.test(url);
  }
  
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }
  
  private generateKeywords(letter: any): string[] {
    const keywords = [letter.category, "사연", "편지"];
    if (letter.aiMetadata?.tags) {
      keywords.push(...letter.aiMetadata.tags);
    }
    return keywords;
  }
  
  private getDefaultOgImage(): string {
    return `${process.env.FRONTEND_URL}/og-default.png`;
  }
  
  private formatAdminConfig(config: ISEOConfig, url: string): SEOMetadata {
    return {
      title: config.metaTitle || this.getDefaultSEO(url).title,
      description: config.metaDescription || this.getDefaultSEO(url).description,
      keywords: config.metaKeywords || [],
      ogTitle: config.ogTitle || config.metaTitle || this.getDefaultSEO(url).ogTitle,
      ogDescription: config.ogDescription || config.metaDescription || this.getDefaultSEO(url).ogDescription,
      ogImage: config.ogImage || this.getDefaultOgImage(),
      ogType: config.ogType || "website",
      twitterCard: config.twitterCard || "summary_large_image",
      twitterTitle: config.twitterTitle || config.ogTitle || config.metaTitle || this.getDefaultSEO(url).twitterTitle,
      twitterDescription: config.twitterDescription || config.ogDescription || config.metaDescription || this.getDefaultSEO(url).twitterDescription,
      twitterImage: config.twitterImage || config.ogImage || this.getDefaultOgImage(),
      canonicalUrl: config.canonicalUrl || `${process.env.FRONTEND_URL}${url}`,
      robots: config.robots || { index: true, follow: true },
      structuredData: config.structuredData,
    };
  }
}

export default new SEOService();
```

이 문서는 계속됩니다. 다음 섹션을 작성하겠습니다.
