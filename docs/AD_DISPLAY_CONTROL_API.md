# 📊 광고 노출 제어 API 문서

## 📋 개요

Admin에서 광고의 노출 여부, 노출 위치, 우선순위, 스케줄 등을 세밀하게 제어할 수 있는 API입니다.

### 백엔드 API 베이스 URL
```
http://localhost:5001/api/ads
```

---

## 🎯 노출 제어 기능

### 1. 노출 가시성 제어
- **isVisible**: 광고 노출 ON/OFF
- **status**: 광고 상태 (draft/active/paused/expired)

### 2. 노출 위치 제어
- **placements**: 광고가 노출될 위치 배열
  - `landing`: 광고 랜딩 페이지
  - `banner`: 배너 광고
  - `sidebar`: 사이드바 광고
  - `footer`: 푸터 광고
  - `popup`: 팝업 광고

### 3. 우선순위 제어
- **priority**: 0-100 범위의 우선순위 (높을수록 우선 노출)

### 4. 노출 한도 제어
- **maxDailyImpressions**: 일일 최대 노출 수
- **maxTotalImpressions**: 총 최대 노출 수

### 5. 타겟 오디언스 제어
- **ageRange**: 연령대 타겟팅
- **gender**: 성별 타겟팅
- **regions**: 지역 타겟팅

### 6. 시간 스케줄 제어
- **startTime/endTime**: 노출 시간대
- **daysOfWeek**: 노출 요일 (0=일요일, 1=월요일, ...)

---

## 🌐 공개 API

### 1. 노출 가능한 광고 목록 조회

특정 위치에 노출할 수 있는 광고 목록을 우선순위 순으로 반환합니다.

```
GET /api/ads/displayable
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| placement | string | ❌ | 노출 위치 필터 |
| limit | number | ❌ | 최대 반환 개수 (기본: 10) |
| theme | string | ❌ | 테마 필터 |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
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
        "description": "결혼을 축하합니다!",
        "ctaText": "혜택 받으러 가기",
        "targetUrl": "https://flowercafe.com/promo",
        "theme": "wedding"
      },
      "displayControl": {
        "isVisible": true,
        "placements": ["banner", "sidebar"],
        "priority": 80
      },
      "stats": {
        "impressions": 1250,
        "clicks": 89,
        "ctr": 7.12
      }
    }
  ],
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

#### 사용 예시

```typescript
// 배너 위치에 노출할 광고 3개 조회
const response = await fetch('/api/ads/displayable?placement=banner&limit=3');
const { data: ads } = await response.json();

// 웨딩 테마 광고만 조회
const response = await fetch('/api/ads/displayable?theme=wedding&limit=5');
```

---

### 2. 광고 정보 조회 (노출 제어 적용)

기존 광고 조회 API에 노출 제어 로직이 적용됩니다.

```
GET /api/ads/:adSlug?placement={placement}
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| placement | string | ❌ | 노출 위치 (노출 가능 여부 확인용) |

#### 노출 제어 로직

1. **기본 상태 확인**: `status === "active"` && `displayControl.isVisible === true`
2. **캠페인 기간 확인**: 현재 시간이 `startDate ~ endDate` 범위 내
3. **노출 위치 확인**: `placement`가 `displayControl.placements`에 포함
4. **노출 한도 확인**: 일일/총 노출 한도 초과 여부
5. **시간 스케줄 확인**: 현재 시간이 설정된 시간대 내
6. **요일 스케줄 확인**: 현재 요일이 설정된 요일에 포함

#### Response

노출 불가능한 경우 404 반환:

```json
{
  "success": false,
  "message": "광고를 찾을 수 없습니다.",
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

---

## 🔐 Admin API

### 1. 광고 노출 제어 설정 업데이트

```
PUT /api/ads/:adId/display-control
```

#### Headers

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "isVisible": true,
  "placements": ["banner", "sidebar", "footer"],
  "priority": 85,
  "maxDailyImpressions": 1000,
  "maxTotalImpressions": 50000,
  "targetAudience": {
    "ageRange": {
      "min": 25,
      "max": 45
    },
    "gender": "all",
    "regions": ["서울", "경기", "인천"]
  },
  "schedule": {
    "startTime": "09:00",
    "endTime": "22:00",
    "daysOfWeek": [1, 2, 3, 4, 5]
  }
}
```

#### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| isVisible | boolean | ❌ | 노출 여부 (기본: true) |
| placements | string[] | ❌ | 노출 위치 배열 |
| priority | number | ❌ | 우선순위 0-100 (기본: 0) |
| maxDailyImpressions | number | ❌ | 일일 최대 노출 수 |
| maxTotalImpressions | number | ❌ | 총 최대 노출 수 |
| targetAudience.ageRange | object | ❌ | 연령대 타겟팅 |
| targetAudience.gender | string | ❌ | 성별 타겟팅 (male/female/all) |
| targetAudience.regions | string[] | ❌ | 지역 타겟팅 |
| schedule.startTime | string | ❌ | 노출 시작 시간 (HH:mm) |
| schedule.endTime | string | ❌ | 노출 종료 시간 (HH:mm) |
| schedule.daysOfWeek | number[] | ❌ | 노출 요일 (0=일요일) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "6789abc123def456",
    "name": "봄 웨딩 프로모션",
    "displayControl": {
      "isVisible": true,
      "placements": ["banner", "sidebar", "footer"],
      "priority": 85,
      "maxDailyImpressions": 1000,
      "maxTotalImpressions": 50000,
      "targetAudience": {
        "ageRange": { "min": 25, "max": 45 },
        "gender": "all",
        "regions": ["서울", "경기", "인천"]
      },
      "schedule": {
        "startTime": "09:00",
        "endTime": "22:00",
        "daysOfWeek": [1, 2, 3, 4, 5]
      }
    },
    ...
  },
  "message": "노출 설정이 업데이트되었습니다.",
  "meta": {
    "timestamp": "2024-03-15T10:30:00.000Z"
  }
}
```

---

### 2. 광고 목록 조회 (노출 상태 포함)

기존 광고 목록 API에 노출 제어 정보가 포함됩니다.

```
GET /api/ads
```

#### Response 예시

```json
{
  "success": true,
  "data": [
    {
      "_id": "6789abc123def456",
      "name": "봄 웨딩 프로모션",
      "status": "active",
      "displayControl": {
        "isVisible": true,
        "placements": ["banner", "sidebar"],
        "priority": 80,
        "maxDailyImpressions": 1000
      },
      "stats": {
        "impressions": 1250,
        "clicks": 89
      },
      "isCurrentlyDisplayable": true
    }
  ]
}
```

---

## 📊 노출 위치 (Placement) 정의

| 값 | 설명 | 사용 위치 |
|----|------|----------|
| `landing` | 광고 랜딩 페이지 | `/ad/[adSlug]` |
| `banner` | 배너 광고 | 편지 페이지, 메인 페이지 상단 |
| `sidebar` | 사이드바 광고 | 편지 목록, 상세 페이지 사이드바 |
| `footer` | 푸터 광고 | 모든 페이지 하단 |
| `popup` | 팝업 광고 | 모달, 팝업 형태 |

---

## 🎯 우선순위 시스템

### 우선순위 점수 (0-100)

| 점수 범위 | 설명 | 용도 |
|----------|------|------|
| 90-100 | 최우선 | 긴급 프로모션, VIP 광고주 |
| 70-89 | 높음 | 프리미엄 광고, 시즌 이벤트 |
| 50-69 | 보통 | 일반 광고 |
| 30-49 | 낮음 | 필러 광고 |
| 0-29 | 최하위 | 테스트 광고 |

### 정렬 순서

1. **우선순위 점수** (내림차순)
2. **생성일** (최신순)

---

## 🕐 시간 스케줄 예시

### 평일 오전 9시-오후 6시만 노출

```json
{
  "schedule": {
    "startTime": "09:00",
    "endTime": "18:00",
    "daysOfWeek": [1, 2, 3, 4, 5]
  }
}
```

### 주말만 노출

```json
{
  "schedule": {
    "daysOfWeek": [0, 6]
  }
}
```

### 24시간 노출 (시간 제한 없음)

```json
{
  "schedule": {
    "daysOfWeek": [0, 1, 2, 3, 4, 5, 6]
  }
}
```

---

## 🎯 타겟 오디언스 예시

### 20-30대 여성 타겟

```json
{
  "targetAudience": {
    "ageRange": { "min": 20, "max": 39 },
    "gender": "female"
  }
}
```

### 수도권 거주자 타겟

```json
{
  "targetAudience": {
    "regions": ["서울", "경기", "인천"]
  }
}
```

---

## ⚠️ 주의사항

### 1. 노출 제어 우선순위

1. **status**: `active`가 아니면 무조건 비노출
2. **isVisible**: `false`면 무조건 비노출
3. **캠페인 기간**: 기간 외에는 비노출
4. **노출 위치**: 허용된 위치가 아니면 비노출
5. **노출 한도**: 한도 초과 시 비노출
6. **시간 스케줄**: 허용된 시간/요일이 아니면 비노출

### 2. 성능 고려사항

- 노출 가능한 광고 조회 시 DB 쿼리 최적화 필요
- 일일 노출 수 체크는 캐시 활용 권장
- 우선순위 정렬은 인덱스 활용

### 3. 기본값

```json
{
  "displayControl": {
    "isVisible": true,
    "placements": [],
    "priority": 0,
    "targetAudience": {
      "gender": "all"
    }
  }
}
```

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-03-15 | 1.0.0 | 노출 제어 API 최초 작성 |