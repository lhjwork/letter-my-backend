# 📢 Admin 광고 관리 기능 구현 프롬프트

## 📋 개요

Letter Admin에서 광고 QR 시스템을 관리하기 위한 CRUD 기능을 구현합니다.
백엔드 API는 이미 구현되어 있으며, Admin 프론트엔드에서 해당 API를 연동합니다.

### 백엔드 API 베이스 URL
```
http://localhost:5001/api/ads
```

### 인증
모든 Admin API 요청에는 관리자 토큰이 필요합니다.
```typescript
headers: {
  Authorization: `Bearer ${adminToken}`,
  'Content-Type': 'application/json'
}
```

---

## 🗂️ 구현할 페이지

### 1. 광고 목록 페이지 (`/admin/ads`)
### 2. 광고 생성 페이지 (`/admin/ads/new`)
### 3. 광고 상세/수정 페이지 (`/admin/ads/[adId]`)
### 4. 광고 통계 페이지 (`/admin/ads/[adId]/stats`)

---

## 📄 1. 광고 목록 페이지

### 경로
```
/admin/ads
```

### 기능
- 광고 목록 테이블 표시
- 상태별 필터링 (전체, draft, active, paused, expired)
- 페이지네이션
- 광고 생성 버튼
- 각 광고 행에서 상세/수정/삭제 액션

### API 연동
```typescript
// 광고 목록 조회
GET /api/ads?status={status}&page={page}&limit={limit}

// Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### UI 컴포넌트
```tsx
// pages/ads/AdsListPage.tsx

interface Ad {
  _id: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'paused' | 'expired';
  advertiser: {
    name: string;
    logo?: string;
  };
  content: {
    headline: string;
    targetUrl: string;
  };
  campaign: {
    startDate: string;
    endDate: string;
  };
  stats: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  createdAt: string;
}

// 테이블 컬럼
const columns = [
  { key: 'name', label: '광고명' },
  { key: 'advertiser.name', label: '광고주' },
  { key: 'status', label: '상태' },
  { key: 'stats.impressions', label: '노출수' },
  { key: 'stats.clicks', label: '클릭수' },
  { key: 'stats.ctr', label: 'CTR(%)' },
  { key: 'campaign.endDate', label: '종료일' },
  { key: 'actions', label: '관리' },
];
```

### 상태 배지 스타일
```tsx
const statusBadge = {
  draft: { label: '초안', color: 'gray' },
  active: { label: '활성', color: 'green' },
  paused: { label: '일시중지', color: 'yellow' },
  expired: { label: '만료', color: 'red' },
};
```

---

## 📝 2. 광고 생성 페이지

### 경로
```
/admin/ads/new
```

### API 연동
```typescript
// 광고 생성
POST /api/ads

// Request Body
{
  "name": "봄 웨딩 프로모션",
  "slug": "spring-wedding-2024",  // 선택 (미입력시 name에서 자동 생성)
  "status": "draft",
  "advertiser": {
    "name": "플라워카페",
    "logo": "https://example.com/logo.png",
    "contactEmail": "contact@flowercafe.com",
    "contactPhone": "02-1234-5678"
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
    "endDate": "2024-06-30T23:59:59.000Z",
    "budget": 1000000,
    "targetImpressions": 10000,
    "targetClicks": 500
  }
}

// Response (201 Created)
{
  "success": true,
  "data": { "_id": "생성된광고ID", ... },
  "message": "광고가 생성되었습니다."
}
```

### 폼 필드 구조

#### 기본 정보 섹션
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | text | ✅ | 광고명 (내부 관리용) |
| slug | text | ❌ | URL 슬러그 (자동 생성 가능) |
| status | select | ❌ | 상태 (기본: draft) |

#### 광고주 정보 섹션
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| advertiser.name | text | ✅ | 광고주명 |
| advertiser.logo | url | ❌ | 로고 이미지 URL |
| advertiser.contactEmail | email | ❌ | 담당자 이메일 |
| advertiser.contactPhone | tel | ❌ | 담당자 연락처 |

#### 광고 콘텐츠 섹션
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| content.headline | text | ✅ | 헤드라인 (메인 문구) |
| content.description | textarea | ✅ | 설명 텍스트 |
| content.ctaText | text | ❌ | CTA 버튼 텍스트 (기본: "자세히 보기") |
| content.targetUrl | url | ✅ | 광고주 사이트 URL |
| content.backgroundImage | url | ❌ | 배경 이미지 URL |
| content.backgroundColor | color | ❌ | 배경 색상 (기본: #ffffff) |
| content.theme | select | ❌ | 테마 (wedding/birthday/congratulation/general) |

#### 캠페인 설정 섹션
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| campaign.name | text | ❌ | 캠페인명 |
| campaign.startDate | datetime | ✅ | 시작일시 |
| campaign.endDate | datetime | ✅ | 종료일시 |
| campaign.budget | number | ❌ | 예산 (원) |
| campaign.targetImpressions | number | ❌ | 목표 노출수 |
| campaign.targetClicks | number | ❌ | 목표 클릭수 |

### 폼 컴포넌트 예시
```tsx
// components/ads/AdForm.tsx

interface AdFormData {
  name: string;
  slug?: string;
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
    ctaText?: string;
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
}

const defaultValues: AdFormData = {
  name: '',
  status: 'draft',
  advertiser: { name: '' },
  content: {
    headline: '',
    description: '',
    ctaText: '자세히 보기',
    targetUrl: '',
    backgroundColor: '#ffffff',
    theme: 'general',
  },
  campaign: {
    startDate: '',
    endDate: '',
  },
};
```

### 테마 옵션
```tsx
const themeOptions = [
  { value: 'wedding', label: '결혼/웨딩', color: '#fff5f5' },
  { value: 'birthday', label: '생일', color: '#fffbeb' },
  { value: 'congratulation', label: '축하', color: '#eff6ff' },
  { value: 'general', label: '일반', color: '#f9fafb' },
];
```

---

## 📋 3. 광고 상세/수정 페이지

### 경로
```
/admin/ads/[adId]
```

### API 연동
```typescript
// 광고 상세 조회
GET /api/ads/detail/{adId}

// 광고 수정
PUT /api/ads/{adId}

// 광고 삭제
DELETE /api/ads/{adId}
```

### 기능
- 광고 상세 정보 표시
- 수정 폼 (AdForm 재사용)
- 삭제 버튼 (확인 모달)
- 통계 페이지 링크
- QR 코드 URL 복사 기능

### QR URL 생성
```tsx
// 광고 QR URL 생성 유틸리티
function generateAdQRUrl(adSlug: string, options?: {
  letterId?: string;
  campaign?: string;
}): string {
  const baseUrl = 'https://letter.community'; // 프로덕션 URL
  const url = new URL(`/ad/${adSlug}`, baseUrl);
  url.searchParams.set('utm_source', 'qr');
  url.searchParams.set('utm_medium', 'offline');
  
  if (options?.letterId) {
    url.searchParams.set('letter', options.letterId);
  }
  if (options?.campaign) {
    url.searchParams.set('utm_campaign', options.campaign);
  }
  
  return url.toString();
}

// 사용 예시
const qrUrl = generateAdQRUrl('spring-wedding-2024', {
  campaign: 'wedding_promo'
});
// https://letter.community/ad/spring-wedding-2024?utm_source=qr&utm_medium=offline&utm_campaign=wedding_promo
```

---

## 📊 4. 광고 통계 페이지

### 경로
```
/admin/ads/[adId]/stats
```

### API 연동
```typescript
// 광고 통계 조회
GET /api/ads/{adId}/stats?startDate={startDate}&endDate={endDate}

// Response
{
  "success": true,
  "data": {
    "ad": {
      "_id": "...",
      "name": "봄 웨딩 프로모션",
      "slug": "spring-wedding-2024",
      "status": "active"
    },
    "summary": {
      "impressions": 1250,
      "clicks": 89,
      "ctr": "7.12",
      "uniqueVisitors": 980,
      "avgDwellTime": 12
    },
    "daily": [
      { "date": "2024-03-01", "impressions": 45, "clicks": 3 },
      { "date": "2024-03-02", "impressions": 52, "clicks": 4 }
    ],
    "bySource": [
      { "_id": "qr", "count": 890 },
      { "_id": "direct", "count": 250 }
    ],
    "byDevice": [
      { "_id": "mobile", "count": 980 },
      { "_id": "desktop", "count": 220 }
    ],
    "period": {
      "start": "2024-02-15T00:00:00.000Z",
      "end": "2024-03-15T23:59:59.000Z"
    }
  }
}
```

### UI 컴포넌트

#### 요약 카드
```tsx
// 주요 지표 카드
<StatsCard title="총 노출수" value={summary.impressions} />
<StatsCard title="총 클릭수" value={summary.clicks} />
<StatsCard title="CTR" value={`${summary.ctr}%`} />
<StatsCard title="순 방문자" value={summary.uniqueVisitors} />
<StatsCard title="평균 체류시간" value={`${summary.avgDwellTime}초`} />
```

#### 차트
```tsx
// 일별 추이 차트 (Line Chart)
<DailyTrendChart data={daily} />

// 유입 경로 차트 (Pie Chart)
<SourcePieChart data={bySource} />

// 기기별 분포 차트 (Bar Chart)
<DeviceBarChart data={byDevice} />
```

#### 기간 필터
```tsx
// 기간 선택
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onChange={handleDateChange}
  presets={[
    { label: '오늘', days: 0 },
    { label: '최근 7일', days: 7 },
    { label: '최근 30일', days: 30 },
    { label: '최근 90일', days: 90 },
  ]}
/>
```

---

## 🔗 5. 편지-광고 연결 관리

### 광고 상세 페이지 내 섹션

#### 연결된 편지 목록
```tsx
// 연결된 편지 표시
interface LinkedLetter {
  letterId: string;
  letterType?: string;
  addedAt: string;
}

<LinkedLettersList
  letters={ad.linkedLetters}
  onUnlink={handleUnlinkLetter}
/>
```

#### 편지 연결 API
```typescript
// 편지 연결
POST /api/ads/{adId}/link-letter
Body: { "letterId": "letter123", "letterType": "wedding" }

// 편지 연결 해제
DELETE /api/ads/{adId}/unlink-letter/{letterId}
```

---

## 🎨 UI/UX 가이드라인

### 레이아웃
- 기존 Admin 레이아웃 패턴 따르기
- 사이드바에 "광고 관리" 메뉴 추가
- 반응형 디자인 적용

### 폼 유효성 검사
```tsx
const validationRules = {
  name: { required: '광고명을 입력해주세요.' },
  'advertiser.name': { required: '광고주명을 입력해주세요.' },
  'content.headline': { required: '헤드라인을 입력해주세요.' },
  'content.description': { required: '설명을 입력해주세요.' },
  'content.targetUrl': {
    required: '광고주 URL을 입력해주세요.',
    pattern: {
      value: /^https?:\/\/.+/,
      message: '올바른 URL 형식이 아닙니다.',
    },
  },
  'campaign.startDate': { required: '시작일을 선택해주세요.' },
  'campaign.endDate': { required: '종료일을 선택해주세요.' },
};
```

### 에러 처리
```tsx
// API 에러 처리
try {
  const response = await createAd(formData);
  toast.success('광고가 생성되었습니다.');
  navigate(`/admin/ads/${response.data._id}`);
} catch (error) {
  if (error.response?.status === 401) {
    toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
  } else {
    toast.error(error.response?.data?.message || '광고 생성에 실패했습니다.');
  }
}
```

### 로딩 상태
```tsx
// 스켈레톤 로딩
{isLoading ? (
  <TableSkeleton rows={10} columns={8} />
) : (
  <AdsTable data={ads} />
)}
```

---

## 📁 파일 구조 (권장)

```
src/
├── pages/
│   └── ads/
│       ├── AdsListPage.tsx      # 광고 목록
│       ├── AdCreatePage.tsx     # 광고 생성
│       ├── AdDetailPage.tsx     # 광고 상세/수정
│       └── AdStatsPage.tsx      # 광고 통계
├── components/
│   └── ads/
│       ├── AdForm.tsx           # 광고 폼 (생성/수정 공용)
│       ├── AdsTable.tsx         # 광고 목록 테이블
│       ├── AdStatusBadge.tsx    # 상태 배지
│       ├── AdPreview.tsx        # 광고 미리보기
│       ├── LinkedLettersList.tsx # 연결된 편지 목록
│       └── stats/
│           ├── StatsCard.tsx
│           ├── DailyTrendChart.tsx
│           ├── SourcePieChart.tsx
│           └── DeviceBarChart.tsx
├── hooks/
│   └── useAds.ts                # 광고 관련 커스텀 훅
├── services/
│   └── adService.ts             # 광고 API 서비스
└── types/
    └── ad.ts                    # 광고 타입 정의
```

---

## 🔧 API 서비스 예시

```typescript
// services/adService.ts

import api from './api'; // axios 인스턴스

export const adService = {
  // 목록 조회
  getAds: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/ads', { params }),

  // 상세 조회
  getAdById: (adId: string) =>
    api.get(`/ads/detail/${adId}`),

  // 생성
  createAd: (data: AdFormData) =>
    api.post('/ads', data),

  // 수정
  updateAd: (adId: string, data: Partial<AdFormData>) =>
    api.put(`/ads/${adId}`, data),

  // 삭제
  deleteAd: (adId: string) =>
    api.delete(`/ads/${adId}`),

  // 통계 조회
  getAdStats: (adId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/ads/${adId}/stats`, { params }),

  // 편지 연결
  linkLetter: (adId: string, letterId: string, letterType?: string) =>
    api.post(`/ads/${adId}/link-letter`, { letterId, letterType }),

  // 편지 연결 해제
  unlinkLetter: (adId: string, letterId: string) =>
    api.delete(`/ads/${adId}/unlink-letter/${letterId}`),
};
```

---

## ✅ 구현 체크리스트

### 페이지
- [ ] 광고 목록 페이지 (`/admin/ads`)
- [ ] 광고 생성 페이지 (`/admin/ads/new`)
- [ ] 광고 상세/수정 페이지 (`/admin/ads/[adId]`)
- [ ] 광고 통계 페이지 (`/admin/ads/[adId]/stats`)

### 컴포넌트
- [ ] AdForm (생성/수정 공용 폼)
- [ ] AdsTable (목록 테이블)
- [ ] AdStatusBadge (상태 배지)
- [ ] AdPreview (미리보기)
- [ ] 통계 차트 컴포넌트들

### 기능
- [ ] 광고 CRUD
- [ ] 상태별 필터링
- [ ] 페이지네이션
- [ ] 폼 유효성 검사
- [ ] 에러 처리
- [ ] 로딩 상태
- [ ] QR URL 생성/복사
- [ ] 편지-광고 연결 관리

### 라우팅
- [ ] 사이드바에 "광고 관리" 메뉴 추가
- [ ] 라우트 설정

---

## 📝 참고 문서

- 백엔드 API 문서: `docs/AD_API_DOCUMENTATION.md`
- 광고 모델 스키마: `src/models/Advertisement.ts`
- 광고 컨트롤러: `src/controllers/adController.ts`
