# 🎠 관리자 캐러셀 광고 관리 가이드

## 📋 개요

관리자 패널에서 이미지 중심의 캐러셀 광고를 생성, 관리, 분석하는 완전한 가이드입니다. 
기존 텍스트 기반 광고를 캐러셀 형태로 개선하여 광고 효과를 극대화합니다.

### 🎯 주요 기능
- **캐러셀 광고 생성**: 고해상도 이미지 업로드 및 설정
- **노출 제어**: 위치별, 시간대별 노출 관리
- **실시간 통계**: 캐러셀 전용 성과 지표 모니터링
- **A/B 테스트**: 다양한 캐러셀 설정 비교 분석

---

## 🚀 구현 단계

### 1단계: 캐러셀 광고 생성 폼

#### `components/ads/CarouselAdForm.tsx`

```tsx
import React, { useState } from 'react';
import { Upload, Eye, Settings, Calendar } from 'lucide-react';

interface CarouselAdFormData {
  // 기본 정보
  name: string;
  advertiser: {
    name: string;
    logo: string;
    contactEmail: string;
    contactPhone: string;
  };
  
  // 캐러셀 콘텐츠
  content: {
    headline: string;
    description: string;
    ctaText: string;
    targetUrl: string;
    theme: 'wedding' | 'birthday' | 'congratulation' | 'general';
    
    // 캐러셀 전용 필드
    carouselImage: string;
    carouselImageMobile: string;
    carouselPriority: number;
    carouselAutoPlay: boolean;
    carouselDuration: number;
    
    // 시각적 개선
    overlayOpacity: number;
    textColor: string;
    textShadow: boolean;
    
    // 반응형 지원
    mobileHeadline: string;
    mobileDescription: string;
  };
  
  // 캠페인 설정
  campaign: {
    name: string;
    startDate: string;
    endDate: string;
    budget: number;
    targetImpressions: number;
    targetClicks: number;
  };
  
  // 노출 제어
  displayControl: {
    isVisible: boolean;
    placements: string[];
    priority: number;
    carouselEnabled: boolean;
    carouselPlacements: string[];
    carouselSchedule: {
      startHour: number;
      endHour: number;
      timezone: string;
    };
  };
}

export const CarouselAdForm: React.FC = () => {
  const [formData, setFormData] = useState<CarouselAdFormData>({
    // 초기값 설정
  });
  
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 폼 섹션 */}
        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">기본 정보</h3>
            {/* 폼 필드들 */}
          </div>
          
          {/* 캐러셀 이미지 업로드 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">캐러셀 이미지</h3>
            {/* 이미지 업로드 컴포넌트 */}
          </div>
          
          {/* 캐러셀 설정 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">캐러셀 설정</h3>
            {/* 캐러셀 옵션들 */}
          </div>
        </div>
        
        {/* 미리보기 섹션 */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">미리보기</h3>
            {/* 캐러셀 미리보기 컴포넌트 */}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 2단계: 캐러셀 통계 대시보드

#### `components/ads/CarouselStatsDashboard.tsx`

```tsx
import React from 'react';
import { BarChart, LineChart, PieChart } from 'recharts';

export const CarouselStatsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">캐러셀 노출수</h3>
          <p className="text-2xl font-bold text-blue-600">45,230</p>
          <p className="text-sm text-green-600">+12.5% vs 지난주</p>
        </div>
        {/* 더 많은 지표 카드들 */}
      </div>
      
      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 캐러셀 성과 차트 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">캐러셀 성과 추이</h3>
          {/* LineChart 컴포넌트 */}
        </div>
        
        {/* 사용자 상호작용 분석 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">사용자 상호작용</h3>
          {/* PieChart 컴포넌트 */}
        </div>
      </div>
    </div>
  );
};
```
### 3단계: 이미지 업로드 컴포넌트

#### `components/ads/ImageUpload.tsx`

```tsx
import React, { useState, useCallback } from 'react';
import { Upload, X, Eye } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  recommendedSize: string;
  aspectRatio: string;
  maxSize?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  recommendedSize,
  aspectRatio,
  maxSize = "5MB"
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(`파일 크기가 ${maxSize}를 초과합니다.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'carousel');

      const response = await fetch('/api/admin/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        onChange(data.url);
      } else {
        throw new Error('업로드 실패');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        <span className="text-gray-500 ml-2">({recommendedSize}, {aspectRatio})</span>
      </label>
      
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="업로드된 이미지"
            className="w-full h-48 object-cover rounded-lg border"
          />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
          >
            <X size={16} />
          </button>
          <button
            onClick={() => window.open(value, '_blank')}
            className="absolute top-2 left-2 bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600"
          >
            <Eye size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          {uploading ? (
            <div className="space-y-2">
              <div className="animate-spin mx-auto w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              <p className="text-sm text-gray-600">업로드 중...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto w-12 h-12 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">
                  이미지를 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-xs text-gray-500">
                  권장: {recommendedSize} ({aspectRatio}), 최대 {maxSize}
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id={`upload-${label}`}
              />
              <label
                htmlFor={`upload-${label}`}
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600"
              >
                파일 선택
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### 4단계: 캐러셀 미리보기 컴포넌트

#### `components/ads/CarouselPreview.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

interface CarouselPreviewProps {
  adData: any;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  onDeviceChange: (device: 'desktop' | 'mobile' | 'tablet') => void;
}

export const CarouselPreview: React.FC<CarouselPreviewProps> = ({
  adData,
  deviceType,
  onDeviceChange
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const deviceSizes = {
    desktop: 'w-full max-w-2xl',
    tablet: 'w-full max-w-md',
    mobile: 'w-full max-w-xs'
  };

  const deviceIcons = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone
  };

  return (
    <div className="space-y-4">
      {/* 디바이스 선택 */}
      <div className="flex justify-center space-x-2">
        {Object.entries(deviceIcons).map(([device, Icon]) => (
          <button
            key={device}
            onClick={() => onDeviceChange(device as any)}
            className={`p-2 rounded-lg ${
              deviceType === device
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {/* 미리보기 */}
      <div className="flex justify-center">
        <div className={`${deviceSizes[deviceType]} transition-all duration-300`}>
          <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
            <img
              src={deviceType === 'mobile' 
                ? adData.content?.carouselImageMobile 
                : adData.content?.carouselImage
              }
              alt="캐러셀 미리보기"
              className="w-full h-full object-cover"
            />
            
            {/* 오버레이 */}
            <div 
              className="absolute inset-0 bg-black"
              style={{ opacity: adData.content?.overlayOpacity || 0.3 }}
            />
            
            {/* 텍스트 콘텐츠 */}
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <div style={{ color: adData.content?.textColor || 'white' }}>
                <h3 className={`text-lg font-bold mb-2 ${
                  adData.content?.textShadow ? 'drop-shadow-lg' : ''
                }`}>
                  {deviceType === 'mobile' && adData.content?.mobileHeadline
                    ? adData.content.mobileHeadline
                    : adData.content?.headline || '헤드라인을 입력하세요'
                  }
                </h3>
                <p className={`text-sm mb-4 ${
                  adData.content?.textShadow ? 'drop-shadow-md' : ''
                }`}>
                  {deviceType === 'mobile' && adData.content?.mobileDescription
                    ? adData.content.mobileDescription
                    : adData.content?.description || '설명을 입력하세요'
                  }
                </p>
                <button className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium">
                  {adData.content?.ctaText || '자세히 보기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 미리보기 정보 */}
      <div className="text-center text-sm text-gray-600">
        <p>미리보기 - {deviceType === 'desktop' ? '데스크톱' : deviceType === 'mobile' ? '모바일' : '태블릿'}</p>
        <p>실제 캐러셀에서는 자동재생 및 네비게이션이 동작합니다</p>
      </div>
    </div>
  );
};
```

---

## 📊 API 연동 가이드

### 캐러셀 광고 생성 API

```typescript
// services/adminAdService.ts
export const createCarouselAd = async (adData: CarouselAdFormData) => {
  const response = await fetch('/api/ads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    },
    body: JSON.stringify(adData)
  });

  if (!response.ok) {
    throw new Error('광고 생성에 실패했습니다');
  }

  return response.json();
};

// 캐러셀 광고 목록 조회
export const getCarouselAds = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.status) searchParams.append('status', params.status);

  const response = await fetch(`/api/ads?${searchParams}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    }
  });

  return response.json();
};

// 캐러셀 통계 조회
export const getCarouselStats = async (adId: string, dateRange?: {
  startDate: string;
  endDate: string;
}) => {
  const searchParams = new URLSearchParams();
  if (dateRange?.startDate) searchParams.append('startDate', dateRange.startDate);
  if (dateRange?.endDate) searchParams.append('endDate', dateRange.endDate);

  const response = await fetch(`/api/ads/${adId}/stats?${searchParams}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    }
  });

  return response.json();
};
```

---

## 🎨 UI/UX 가이드라인

### 디자인 시스템

```css
/* 캐러셀 관리자 전용 스타일 */
.carousel-admin {
  --primary-color: #3b82f6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-500: #6b7280;
  --gray-900: #111827;
}

.carousel-form-section {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4;
}

.carousel-preview-container {
  @apply bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300;
}

.carousel-stats-card {
  @apply bg-white rounded-lg shadow p-6 border-l-4;
}

.carousel-stats-card.positive {
  @apply border-l-green-500;
}

.carousel-stats-card.negative {
  @apply border-l-red-500;
}

.carousel-stats-card.neutral {
  @apply border-l-blue-500;
}
```

### 반응형 레이아웃

```tsx
// 관리자 페이지 레이아웃
const AdminLayout: React.FC = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* 사이드바 */}
        <aside className="w-64 bg-white shadow-sm">
          <nav className="p-4 space-y-2">
            <a href="/admin/ads" className="block px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
              광고 관리
            </a>
            <a href="/admin/ads/carousel" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
              캐러셀 광고
            </a>
            <a href="/admin/ads/stats" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
              통계 분석
            </a>
          </nav>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
```

---

## 🧪 테스트 및 검증

### 캐러셀 광고 검증 체크리스트

- [ ] **이미지 업로드**: 권장 크기, 파일 형식, 용량 제한 확인
- [ ] **미리보기 기능**: 데스크톱/모바일 미리보기 정확성
- [ ] **노출 설정**: 위치별, 시간대별 노출 제어 동작
- [ ] **통계 추적**: 실시간 통계 업데이트 확인
- [ ] **권한 관리**: 관리자 권한별 접근 제어
- [ ] **데이터 검증**: 필수 필드, 형식 검증
- [ ] **에러 처리**: 네트워크 오류, 서버 오류 대응

### 성능 테스트

```typescript
// 캐러셀 광고 성능 테스트
describe('Carousel Ad Performance', () => {
  test('이미지 업로드 성능', async () => {
    const startTime = performance.now();
    
    // 5MB 이미지 업로드 테스트
    const result = await uploadCarouselImage(mockImageFile);
    
    const endTime = performance.now();
    const uploadTime = endTime - startTime;
    
    expect(uploadTime).toBeLessThan(10000); // 10초 이내
    expect(result.success).toBe(true);
  });

  test('통계 조회 성능', async () => {
    const startTime = performance.now();
    
    const stats = await getCarouselStats('test-ad-id', {
      startDate: '2026-01-01',
      endDate: '2026-01-31'
    });
    
    const endTime = performance.now();
    const queryTime = endTime - startTime;
    
    expect(queryTime).toBeLessThan(2000); // 2초 이내
    expect(stats.success).toBe(true);
  });
});
```

---

## 📈 성과 분석 및 최적화

### 주요 KPI 모니터링

1. **캐러셀 성과 지표**
   - 캐러셀 CTR vs 일반 광고 CTR
   - 평균 시청 시간
   - 슬라이드 완주율
   - 사용자 상호작용률

2. **운영 효율성**
   - 광고 생성 시간
   - 이미지 업로드 성공률
   - 관리자 작업 완료 시간

3. **기술적 성능**
   - 페이지 로딩 속도
   - 이미지 최적화율
   - API 응답 시간

### A/B 테스트 가이드

```typescript
// A/B 테스트 설정 예시
const carouselABTest = {
  testName: 'carousel_autoplay_duration',
  variants: [
    { name: 'fast', duration: 3000 },
    { name: 'normal', duration: 5000 },
    { name: 'slow', duration: 7000 }
  ],
  trafficSplit: [33, 34, 33],
  metrics: ['ctr', 'viewTime', 'slideCompletionRate'],
  duration: '2 weeks'
};
```

---

이 가이드를 통해 관리자는 효과적인 캐러셀 광고를 생성하고 관리할 수 있으며, 
실시간 성과 분석을 통해 광고 효과를 지속적으로 개선할 수 있습니다.