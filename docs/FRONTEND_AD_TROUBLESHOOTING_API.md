# 🔧 Frontend 광고 노출 문제 해결 API 가이드

## 📋 문제 상황

Admin에서 광고를 등록했지만 Frontend에서 노출되지 않는 경우의 원인과 해결방법을 제시합니다.

---

## 🔍 광고 노출 실패 원인 분석

### 1. **광고 상태 문제**
- `status`가 `active`가 아님
- `displayControl.isVisible`이 `false`

### 2. **캠페인 기간 문제**
- 현재 시간이 `campaign.startDate` 이전
- 현재 시간이 `campaign.endDate` 이후

### 3. **노출 위치 설정 문제**
- `displayControl.placements` 배열이 비어있음
- 요청한 `placement`가 설정된 위치에 포함되지 않음

### 4. **노출 한도 초과**
- `displayControl.maxTotalImpressions` 초과
- `displayControl.maxDailyImpressions` 초과

### 5. **시간/요일 스케줄 제한**
- 현재 시간이 `displayControl.schedule.startTime ~ endTime` 범위 밖
- 현재 요일이 `displayControl.schedule.daysOfWeek`에 포함되지 않음

---

## 🛠️ 디버깅 API

### 1. 광고 상태 확인 API

```
GET /api/ads/debug/:adSlug
```

#### Response

```json
{
  "success": true,
  "data": {
    "ad": {
      "_id": "6789abc123def456",
      "name": "마비스 광고",
      "slug": "마비스-광고",
      "status": "active"
    },
    "displayStatus": {
      "isDisplayable": false,
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
          "passed": false,
          "value": "Campaign not started yet",
          "startDate": "2026-01-05T00:04:00.000Z",
          "endDate": "2026-01-22T00:04:00.000Z",
          "currentTime": "2026-01-04T15:30:00.000Z"
        },
        {
          "check": "placements",
          "passed": true,
          "value": ["landing", "banner"]
        }
      ]
    }
  }
}
```

### 2. 노출 가능한 광고 목록 조회 (디버그 모드)

```
GET /api/ads/displayable?debug=true&placement=banner
```

#### Response

```json
{
  "success": true,
  "data": {
    "displayableAds": [
      {
        "_id": "6789abc123def456",
        "name": "활성 광고",
        "slug": "active-ad"
      }
    ],
    "filteredOutAds": [
      {
        "_id": "6789abc123def457",
        "name": "마비스 광고",
        "slug": "마비스-광고",
        "reason": "Campaign period not active"
      }
    ],
    "totalAdsInDB": 5,
    "activeAds": 3,
    "visibleAds": 2,
    "displayableAds": 1
  }
}
```

---

## 🌐 Frontend 구현 가이드

### 1. 광고 조회 시 에러 처리

```typescript
// lib/api/ads.ts

export async function getAdBySlug(adSlug: string, placement?: string) {
  try {
    const url = new URL(`${API_BASE_URL}/api/ads/${adSlug}`);
    if (placement) {
      url.searchParams.set('placement', placement);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      console.warn(`광고 조회 실패 (${adSlug}):`, data.message);
      return null;
    }

    return data.success ? data.data : null;
  } catch (error) {
    console.error('광고 조회 에러:', error);
    return null;
  }
}

// 디버그 모드로 광고 상태 확인
export async function debugAdStatus(adSlug: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ads/debug/${adSlug}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('광고 디버그 정보:', data.data);
      return data.data;
    }
  } catch (error) {
    console.error('광고 디버그 에러:', error);
  }
  return null;
}
```

### 2. 광고 목록 조회 (Fallback 포함)

```typescript
// lib/api/ads.ts

export async function getDisplayableAds(options?: {
  placement?: string;
  limit?: number;
  theme?: string;
}) {
  try {
    const url = new URL(`${API_BASE_URL}/api/ads/displayable`);
    
    if (options?.placement) url.searchParams.set('placement', options.placement);
    if (options?.limit) url.searchParams.set('limit', options.limit.toString());
    if (options?.theme) url.searchParams.set('theme', options.theme);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      console.warn('광고 목록 조회 실패:', data.message);
      return [];
    }

    return data.success ? data.data : [];
  } catch (error) {
    console.error('광고 목록 조회 에러:', error);
    return [];
  }
}

// 디버그 모드로 광고 목록 상태 확인
export async function debugDisplayableAds(placement?: string) {
  try {
    const url = new URL(`${API_BASE_URL}/api/ads/displayable`);
    url.searchParams.set('debug', 'true');
    if (placement) url.searchParams.set('placement', placement);

    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.success) {
      console.log('광고 목록 디버그 정보:', data.data);
      return data.data;
    }
  } catch (error) {
    console.error('광고 목록 디버그 에러:', error);
  }
  return null;
}
```

### 3. 광고 컴포넌트 (에러 처리 포함)

```tsx
// components/ads/AdBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import { getDisplayableAds, debugDisplayableAds } from '@/lib/api/ads';

interface Props {
  placement: string;
  limit?: number;
  theme?: string;
  showDebugInfo?: boolean; // 개발 환경에서만 true
}

export default function AdBanner({ placement, limit = 1, theme, showDebugInfo }: Props) {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    async function fetchAds() {
      try {
        // 광고 목록 조회
        const adList = await getDisplayableAds({ placement, limit, theme });
        setAds(adList);

        // 개발 환경에서 디버그 정보 조회
        if (showDebugInfo && process.env.NODE_ENV === 'development') {
          const debug = await debugDisplayableAds(placement);
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

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-24 rounded-lg" />;
  }

  // 디버그 정보 표시 (개발 환경)
  if (showDebugInfo && debugInfo) {
    return (
      <div className="border-2 border-yellow-400 p-4 rounded-lg bg-yellow-50">
        <h3 className="font-bold text-yellow-800 mb-2">🐛 광고 디버그 정보</h3>
        <div className="text-sm space-y-1">
          <p>전체 광고: {debugInfo.totalAdsInDB}개</p>
          <p>활성 광고: {debugInfo.activeAds}개</p>
          <p>노출 가능 광고: {debugInfo.displayableAds}개</p>
          <p>필터링된 광고: {debugInfo.filteredOutAds?.length || 0}개</p>
        </div>
        
        {debugInfo.filteredOutAds?.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-yellow-700">필터링된 광고 보기</summary>
            <ul className="mt-1 text-xs">
              {debugInfo.filteredOutAds.map((ad: any) => (
                <li key={ad._id} className="text-red-600">
                  {ad.name}: {ad.reason}
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
        <div className="border border-gray-300 p-4 rounded-lg bg-gray-50">
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
    <div className="space-y-4">
      {ads.map((ad) => (
        <div key={ad._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <h3 className="font-semibold">{ad.content.headline}</h3>
          <p className="text-gray-600 text-sm">{ad.content.description}</p>
          <a
            href={ad.content.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {ad.content.ctaText}
          </a>
          <p className="text-xs text-gray-400 mt-2">광고 · {ad.advertiser.name}</p>
        </div>
      ))}
    </div>
  );
}
```

### 4. 페이지에서 사용 예시

```tsx
// app/page.tsx

import AdBanner from '@/components/ads/AdBanner';

export default function HomePage() {
  return (
    <div>
      <h1>메인 페이지</h1>
      
      {/* 배너 광고 */}
      <AdBanner 
        placement="banner" 
        limit={1}
        showDebugInfo={process.env.NODE_ENV === 'development'}
      />
      
      {/* 사이드바 광고 */}
      <AdBanner 
        placement="sidebar" 
        limit={3}
        showDebugInfo={process.env.NODE_ENV === 'development'}
      />
    </div>
  );
}
```

---

## 🧪 테스트 방법

### 1. 브라우저 콘솔에서 직접 테스트

```javascript
// 1. 특정 광고 조회 테스트
fetch('http://localhost:5001/api/ads/마비스-광고')
  .then(res => res.json())
  .then(console.log);

// 2. 노출 가능한 광고 목록 조회
fetch('http://localhost:5001/api/ads/displayable?placement=banner')
  .then(res => res.json())
  .then(console.log);

// 3. 디버그 모드로 광고 상태 확인
fetch('http://localhost:5001/api/ads/debug/마비스-광고')
  .then(res => res.json())
  .then(console.log);
```

### 2. 광고 노출 체크리스트

```typescript
// utils/adDebugger.ts

export const adDebugger = {
  async checkAdStatus(adSlug: string) {
    console.log(`🔍 광고 상태 확인: ${adSlug}`);
    
    try {
      // 1. 기본 광고 조회
      const ad = await fetch(`/api/ads/${adSlug}`).then(res => res.json());
      console.log('1. 기본 조회:', ad.success ? '✅ 성공' : '❌ 실패', ad.message);
      
      // 2. 디버그 정보 조회
      const debug = await fetch(`/api/ads/debug/${adSlug}`).then(res => res.json());
      if (debug.success) {
        console.log('2. 디버그 정보:');
        debug.data.displayStatus.reasons.forEach((reason: any) => {
          const status = reason.passed ? '✅' : '❌';
          console.log(`   ${status} ${reason.check}: ${reason.value}`);
        });
      }
      
      // 3. 노출 가능한 광고 목록에서 확인
      const displayable = await fetch('/api/ads/displayable?debug=true').then(res => res.json());
      if (displayable.success) {
        const found = displayable.data.displayableAds.find((a: any) => a.slug === adSlug);
        console.log('3. 노출 목록 포함:', found ? '✅ 포함됨' : '❌ 제외됨');
        
        if (!found) {
          const filtered = displayable.data.filteredOutAds.find((a: any) => a.slug === adSlug);
          if (filtered) {
            console.log(`   제외 이유: ${filtered.reason}`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ 디버깅 중 에러:', error);
    }
  }
};

// 사용법: adDebugger.checkAdStatus('마비스-광고');
```

---

## ⚠️ 일반적인 해결방법

### 1. **Admin에서 확인할 사항**

```typescript
// Admin에서 광고 생성 시 필수 설정
const adData = {
  name: "마비스 광고",
  status: "active", // ⭐ 반드시 active로 설정
  displayControl: {
    isVisible: true, // ⭐ 반드시 true로 설정
    placements: ["banner", "sidebar"], // ⭐ 노출할 위치 설정
    priority: 50
  },
  campaign: {
    startDate: "2026-01-04T00:00:00.000Z", // ⭐ 현재 시간 이후로 설정
    endDate: "2026-12-31T23:59:59.000Z"    // ⭐ 충분히 미래로 설정
  }
};
```

### 2. **Frontend에서 확인할 사항**

```typescript
// 올바른 placement 값 사용
const validPlacements = ['landing', 'banner', 'sidebar', 'footer', 'popup'];

// API 호출 시 에러 처리
try {
  const ads = await getDisplayableAds({ placement: 'banner' });
  if (ads.length === 0) {
    console.warn('노출할 광고가 없습니다. Admin에서 광고 설정을 확인하세요.');
  }
} catch (error) {
  console.error('광고 조회 실패:', error);
}
```

---

## 📝 문제 해결 순서

1. **Admin에서 광고 상태 확인**
   - status가 'active'인지 확인
   - displayControl.isVisible이 true인지 확인
   - placements 배열에 값이 있는지 확인

2. **캠페인 기간 확인**
   - startDate가 현재 시간 이전인지 확인
   - endDate가 현재 시간 이후인지 확인

3. **Frontend API 호출 확인**
   - 올바른 placement 값 사용
   - API 응답 에러 처리
   - 네트워크 연결 상태 확인

4. **디버그 API 활용**
   - `/api/ads/debug/:adSlug`로 상세 상태 확인
   - `/api/ads/displayable?debug=true`로 전체 현황 파악

이 가이드를 따라하면 광고 노출 문제를 해결할 수 있습니다!