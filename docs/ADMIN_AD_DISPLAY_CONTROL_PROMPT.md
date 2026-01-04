# 📊 Admin 광고 노출 제어 기능 구현 프롬프트

## 📋 개요

Letter Admin에서 광고의 노출 여부, 노출 위치, 우선순위, 스케줄 등을 세밀하게 제어할 수 있는 기능을 구현합니다.

### 백엔드 API
- 노출 제어 API는 이미 구현되어 있음
- API 문서: `docs/AD_DISPLAY_CONTROL_API.md` 참조

### 구현 위치
- Admin 프로젝트: `~/Desktop/projects/letter-admin`
- 기존 광고 관리 페이지에 노출 제어 섹션 추가

---

## 🎯 구현할 기능

### 1. 광고 목록에 노출 상태 표시
### 2. 광고 상세 페이지에 노출 제어 섹션 추가
### 3. 노출 제어 설정 폼
### 4. 실시간 노출 상태 미리보기

---

## 📄 1. 광고 목록 페이지 업데이트

### 기존 테이블에 노출 상태 컬럼 추가

```tsx
// pages/ads/AdsListPage.tsx

const columns = [
  { key: 'name', label: '광고명' },
  { key: 'advertiser.name', label: '광고주' },
  { key: 'status', label: '상태' },
  { key: 'displayStatus', label: '노출 상태' }, // 새로 추가
  { key: 'displayControl.priority', label: '우선순위' }, // 새로 추가
  { key: 'stats.impressions', label: '노출수' },
  { key: 'stats.clicks', label: '클릭수' },
  { key: 'actions', label: '관리' },
];
```

### 노출 상태 컴포넌트

```tsx
// components/ads/DisplayStatusBadge.tsx

interface DisplayStatusBadgeProps {
  ad: {
    status: string;
    displayControl: {
      isVisible: boolean;
      placements: string[];
      priority: number;
    };
    campaign: {
      startDate: string;
      endDate: string;
    };
  };
}

export default function DisplayStatusBadge({ ad }: DisplayStatusBadgeProps) {
  const getDisplayStatus = () => {
    const now = new Date();
    const startDate = new Date(ad.campaign.startDate);
    const endDate = new Date(ad.campaign.endDate);
    
    // 1. 기본 상태 확인
    if (ad.status !== 'active') {
      return { status: 'inactive', label: '비활성', color: 'gray' };
    }
    
    if (!ad.displayControl.isVisible) {
      return { status: 'hidden', label: '숨김', color: 'red' };
    }
    
    // 2. 캠페인 기간 확인
    if (now < startDate) {
      return { status: 'scheduled', label: '예약됨', color: 'blue' };
    }
    
    if (now > endDate) {
      return { status: 'expired', label: '만료됨', color: 'red' };
    }
    
    // 3. 노출 위치 확인
    if (ad.displayControl.placements.length === 0) {
      return { status: 'no-placement', label: '위치 미설정', color: 'yellow' };
    }
    
    return { status: 'active', label: '노출 중', color: 'green' };
  };
  
  const { status, label, color } = getDisplayStatus();
  
  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {label}
    </span>
  );
}
```

### 우선순위 표시

```tsx
// components/ads/PriorityBadge.tsx

interface PriorityBadgeProps {
  priority: number;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getPriorityInfo = (priority: number) => {
    if (priority >= 90) return { label: '최우선', color: 'red' };
    if (priority >= 70) return { label: '높음', color: 'orange' };
    if (priority >= 50) return { label: '보통', color: 'blue' };
    if (priority >= 30) return { label: '낮음', color: 'gray' };
    return { label: '최하위', color: 'gray' };
  };
  
  const { label, color } = getPriorityInfo(priority);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{priority}</span>
      <span className={`px-2 py-1 rounded text-xs ${
        color === 'red' ? 'bg-red-100 text-red-800' :
        color === 'orange' ? 'bg-orange-100 text-orange-800' :
        color === 'blue' ? 'bg-blue-100 text-blue-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {label}
      </span>
    </div>
  );
}
```

---

## 📋 2. 광고 상세 페이지 노출 제어 섹션

### 노출 제어 탭 추가

```tsx
// pages/ads/AdDetailPage.tsx

const tabs = [
  { id: 'basic', label: '기본 정보' },
  { id: 'content', label: '콘텐츠' },
  { id: 'campaign', label: '캠페인' },
  { id: 'display', label: '노출 제어' }, // 새로 추가
  { id: 'stats', label: '통계' },
];

// 탭 컨텐츠
{activeTab === 'display' && (
  <DisplayControlSection 
    ad={ad} 
    onUpdate={handleDisplayControlUpdate}
  />
)}
```

### 노출 제어 섹션 컴포넌트

```tsx
// components/ads/DisplayControlSection.tsx

import { useState } from 'react';
import { adService } from '@/services/adService';

interface DisplayControlData {
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
}

interface Props {
  ad: any;
  onUpdate: (data: DisplayControlData) => void;
}

export default function DisplayControlSection({ ad, onUpdate }: Props) {
  const [formData, setFormData] = useState<DisplayControlData>(
    ad.displayControl || {
      isVisible: true,
      placements: [],
      priority: 0,
      targetAudience: { gender: 'all' },
    }
  );
  const [loading, setLoading] = useState(false);

  const placementOptions = [
    { value: 'landing', label: '랜딩 페이지', description: '광고 전용 페이지' },
    { value: 'banner', label: '배너', description: '페이지 상단 배너' },
    { value: 'sidebar', label: '사이드바', description: '페이지 사이드바' },
    { value: 'footer', label: '푸터', description: '페이지 하단' },
    { value: 'popup', label: '팝업', description: '모달 팝업' },
  ];

  const dayOptions = [
    { value: 0, label: '일' },
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
    { value: 6, label: '토' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adService.updateDisplayControl(ad._id, formData);
      onUpdate(formData);
      toast.success('노출 설정이 업데이트되었습니다.');
    } catch (error) {
      toast.error('노출 설정 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 기본 노출 설정 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">기본 노출 설정</h3>
        
        <div className="space-y-4">
          {/* 노출 여부 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isVisible"
              checked={formData.isVisible}
              onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isVisible" className="font-medium">
              광고 노출 활성화
            </label>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              우선순위 (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-sm text-gray-500 mt-1">
              높을수록 우선 노출됩니다. (90-100: 최우선, 70-89: 높음, 50-69: 보통)
            </p>
          </div>
        </div>
      </div>

      {/* 노출 위치 설정 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">노출 위치</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {placementOptions.map((option) => (
            <div key={option.value} className="flex items-start gap-3">
              <input
                type="checkbox"
                id={`placement-${option.value}`}
                checked={formData.placements.includes(option.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({
                      ...formData,
                      placements: [...formData.placements, option.value]
                    });
                  } else {
                    setFormData({
                      ...formData,
                      placements: formData.placements.filter(p => p !== option.value)
                    });
                  }
                }}
                className="w-4 h-4 mt-1"
              />
              <div>
                <label htmlFor={`placement-${option.value}`} className="font-medium">
                  {option.label}
                </label>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 노출 한도 설정 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">노출 한도</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              일일 최대 노출 수
            </label>
            <input
              type="number"
              min="0"
              value={formData.maxDailyImpressions || ''}
              onChange={(e) => setFormData({
                ...formData,
                maxDailyImpressions: e.target.value ? parseInt(e.target.value) : undefined
              })}
              placeholder="제한 없음"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              총 최대 노출 수
            </label>
            <input
              type="number"
              min="0"
              value={formData.maxTotalImpressions || ''}
              onChange={(e) => setFormData({
                ...formData,
                maxTotalImpressions: e.target.value ? parseInt(e.target.value) : undefined
              })}
              placeholder="제한 없음"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* 타겟 오디언스 설정 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">타겟 오디언스</h3>
        
        <div className="space-y-4">
          {/* 연령대 */}
          <div>
            <label className="block text-sm font-medium mb-2">연령대</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                max="100"
                value={formData.targetAudience?.ageRange?.min || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  targetAudience: {
                    ...formData.targetAudience,
                    ageRange: {
                      ...formData.targetAudience?.ageRange,
                      min: e.target.value ? parseInt(e.target.value) : 0
                    }
                  }
                })}
                placeholder="최소"
                className="w-20 px-3 py-2 border rounded-md"
              />
              <span>~</span>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.targetAudience?.ageRange?.max || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  targetAudience: {
                    ...formData.targetAudience,
                    ageRange: {
                      ...formData.targetAudience?.ageRange,
                      max: e.target.value ? parseInt(e.target.value) : 100
                    }
                  }
                })}
                placeholder="최대"
                className="w-20 px-3 py-2 border rounded-md"
              />
              <span>세</span>
            </div>
          </div>

          {/* 성별 */}
          <div>
            <label className="block text-sm font-medium mb-2">성별</label>
            <select
              value={formData.targetAudience?.gender || 'all'}
              onChange={(e) => setFormData({
                ...formData,
                targetAudience: {
                  ...formData.targetAudience,
                  gender: e.target.value as 'male' | 'female' | 'all'
                }
              })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="all">전체</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>

          {/* 지역 */}
          <div>
            <label className="block text-sm font-medium mb-2">타겟 지역</label>
            <input
              type="text"
              value={formData.targetAudience?.regions?.join(', ') || ''}
              onChange={(e) => setFormData({
                ...formData,
                targetAudience: {
                  ...formData.targetAudience,
                  regions: e.target.value.split(',').map(r => r.trim()).filter(r => r)
                }
              })}
              placeholder="서울, 경기, 인천 (쉼표로 구분)"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* 시간 스케줄 설정 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">시간 스케줄</h3>
        
        <div className="space-y-4">
          {/* 시간대 */}
          <div>
            <label className="block text-sm font-medium mb-2">노출 시간대</label>
            <div className="flex items-center gap-4">
              <input
                type="time"
                value={formData.schedule?.startTime || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  schedule: {
                    ...formData.schedule,
                    startTime: e.target.value
                  }
                })}
                className="px-3 py-2 border rounded-md"
              />
              <span>~</span>
              <input
                type="time"
                value={formData.schedule?.endTime || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  schedule: {
                    ...formData.schedule,
                    endTime: e.target.value
                  }
                })}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              비워두면 24시간 노출됩니다.
            </p>
          </div>

          {/* 요일 */}
          <div>
            <label className="block text-sm font-medium mb-2">노출 요일</label>
            <div className="flex gap-2">
              {dayOptions.map((day) => (
                <label key={day.value} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={formData.schedule?.daysOfWeek?.includes(day.value) || false}
                    onChange={(e) => {
                      const currentDays = formData.schedule?.daysOfWeek || [];
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          schedule: {
                            ...formData.schedule,
                            daysOfWeek: [...currentDays, day.value]
                          }
                        });
                      } else {
                        setFormData({
                          ...formData,
                          schedule: {
                            ...formData.schedule,
                            daysOfWeek: currentDays.filter(d => d !== day.value)
                          }
                        });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              선택하지 않으면 매일 노출됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '노출 설정 저장'}
        </button>
      </div>
    </form>
  );
}
```

---

## 📊 3. 실시간 노출 상태 미리보기

### 노출 상태 미리보기 컴포넌트

```tsx
// components/ads/DisplayPreview.tsx

interface DisplayPreviewProps {
  ad: any;
}

export default function DisplayPreview({ ad }: DisplayPreviewProps) {
  const [currentStatus, setCurrentStatus] = useState<any>(null);

  useEffect(() => {
    const checkDisplayStatus = () => {
      const now = new Date();
      const status = {
        isActive: ad.status === 'active',
        isVisible: ad.displayControl?.isVisible || false,
        isInCampaignPeriod: now >= new Date(ad.campaign.startDate) && now <= new Date(ad.campaign.endDate),
        hasPlacement: ad.displayControl?.placements?.length > 0,
        isInTimeRange: checkTimeRange(ad.displayControl?.schedule),
        isInDayRange: checkDayRange(ad.displayControl?.schedule),
      };
      
      setCurrentStatus(status);
    };

    checkDisplayStatus();
    const interval = setInterval(checkDisplayStatus, 60000); // 1분마다 체크

    return () => clearInterval(interval);
  }, [ad]);

  const checkTimeRange = (schedule?: any) => {
    if (!schedule?.startTime || !schedule?.endTime) return true;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
  };

  const checkDayRange = (schedule?: any) => {
    if (!schedule?.daysOfWeek?.length) return true;
    
    const currentDay = new Date().getDay();
    return schedule.daysOfWeek.includes(currentDay);
  };

  if (!currentStatus) return null;

  const isDisplayable = Object.values(currentStatus).every(Boolean);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <span>실시간 노출 상태</span>
        <span className={`w-3 h-3 rounded-full ${isDisplayable ? 'bg-green-500' : 'bg-red-500'}`} />
      </h4>
      
      <div className="space-y-2 text-sm">
        <StatusItem 
          label="광고 상태" 
          status={currentStatus.isActive} 
          value={ad.status}
        />
        <StatusItem 
          label="노출 설정" 
          status={currentStatus.isVisible} 
          value={currentStatus.isVisible ? '활성' : '비활성'}
        />
        <StatusItem 
          label="캠페인 기간" 
          status={currentStatus.isInCampaignPeriod} 
          value={currentStatus.isInCampaignPeriod ? '진행 중' : '기간 외'}
        />
        <StatusItem 
          label="노출 위치" 
          status={currentStatus.hasPlacement} 
          value={currentStatus.hasPlacement ? `${ad.displayControl?.placements?.length}개 설정` : '미설정'}
        />
        <StatusItem 
          label="시간대" 
          status={currentStatus.isInTimeRange} 
          value={currentStatus.isInTimeRange ? '허용 시간' : '제한 시간'}
        />
        <StatusItem 
          label="요일" 
          status={currentStatus.isInDayRange} 
          value={currentStatus.isInDayRange ? '허용 요일' : '제한 요일'}
        />
      </div>
      
      <div className={`mt-3 p-2 rounded text-center font-medium ${
        isDisplayable 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isDisplayable ? '✅ 현재 노출 가능' : '❌ 현재 노출 불가'}
      </div>
    </div>
  );
}

function StatusItem({ label, status, value }: { label: string; status: boolean; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}:</span>
      <span className={`font-medium ${status ? 'text-green-600' : 'text-red-600'}`}>
        {value}
      </span>
    </div>
  );
}
```

---

## 🔧 4. API 서비스 업데이트

### 노출 제어 API 추가

```typescript
// services/adService.ts

export const adService = {
  // 기존 메서드들...

  // 노출 제어 설정 업데이트
  updateDisplayControl: (adId: string, displayControl: any) =>
    api.put(`/ads/${adId}/display-control`, displayControl),

  // 노출 가능한 광고 목록 조회 (테스트용)
  getDisplayableAds: (params?: { placement?: string; limit?: number; theme?: string }) =>
    api.get('/ads/displayable', { params }),
};
```

---

## 📁 파일 구조 업데이트

```
src/
├── pages/
│   └── ads/
│       ├── AdsListPage.tsx          # 노출 상태 컬럼 추가
│       └── AdDetailPage.tsx         # 노출 제어 탭 추가
├── components/
│   └── ads/
│       ├── DisplayStatusBadge.tsx   # 노출 상태 배지
│       ├── PriorityBadge.tsx        # 우선순위 배지
│       ├── DisplayControlSection.tsx # 노출 제어 폼
│       └── DisplayPreview.tsx       # 실시간 상태 미리보기
└── services/
    └── adService.ts                 # API 서비스 업데이트
```

---

## ✅ 구현 체크리스트

### 광고 목록 페이지
- [ ] 노출 상태 컬럼 추가
- [ ] DisplayStatusBadge 컴포넌트
- [ ] PriorityBadge 컴포넌트
- [ ] 노출 상태별 필터링 (선택)

### 광고 상세 페이지
- [ ] 노출 제어 탭 추가
- [ ] DisplayControlSection 컴포넌트
- [ ] DisplayPreview 컴포넌트

### 노출 제어 폼
- [ ] 기본 노출 설정 (isVisible, priority)
- [ ] 노출 위치 설정 (placements)
- [ ] 노출 한도 설정 (maxDailyImpressions, maxTotalImpressions)
- [ ] 타겟 오디언스 설정 (ageRange, gender, regions)
- [ ] 시간 스케줄 설정 (startTime, endTime, daysOfWeek)

### API 연동
- [ ] updateDisplayControl API 연동
- [ ] 폼 유효성 검사
- [ ] 에러 처리
- [ ] 성공 메시지

### 실시간 미리보기
- [ ] 현재 노출 상태 체크
- [ ] 1분마다 상태 업데이트
- [ ] 각 조건별 상태 표시

---

## 🎯 사용 시나리오

### 1. 평일 오전 9시-6시만 배너 노출

```json
{
  "isVisible": true,
  "placements": ["banner"],
  "priority": 70,
  "schedule": {
    "startTime": "09:00",
    "endTime": "18:00",
    "daysOfWeek": [1, 2, 3, 4, 5]
  }
}
```

### 2. 20-30대 여성 타겟 최우선 광고

```json
{
  "isVisible": true,
  "placements": ["banner", "sidebar"],
  "priority": 95,
  "targetAudience": {
    "ageRange": { "min": 20, "max": 39 },
    "gender": "female"
  }
}
```

### 3. 일일 1000회 제한 팝업 광고

```json
{
  "isVisible": true,
  "placements": ["popup"],
  "priority": 50,
  "maxDailyImpressions": 1000
}
```

---

## 📝 참고 문서

- 노출 제어 API: `docs/AD_DISPLAY_CONTROL_API.md`
- 기본 광고 관리: `docs/ADMIN_AD_MANAGEMENT_PROMPT.md`
- 프론트엔드 노출: `docs/FRONTEND_AD_DISPLAY_PROMPT.md`