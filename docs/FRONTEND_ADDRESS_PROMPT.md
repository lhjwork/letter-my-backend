# 프론트엔드 배송지 관리 기능 구현 프롬프트

## 개요

백엔드에 배송지(Address) 관리 API가 구현되어 있습니다. 프론트엔드에서 배송지를 관리하고 편지 발송 시 빠르게 선택할 수 있는 기능을 구현해주세요.

---

## API 엔드포인트

Base URL: `http://localhost:5001/api`

### 배송지 관리 API

| Method | Endpoint                      | 설명                        |
| ------ | ----------------------------- | --------------------------- |
| GET    | `/addresses`                  | 배송지 목록 조회 (주소록)   |
| GET    | `/addresses/recent?limit=20`  | 최근 배송지 목록 조회       |
| GET    | `/addresses/:id`              | 배송지 상세 조회            |
| POST   | `/addresses`                  | 배송지 추가                 |
| PUT    | `/addresses/:id`              | 배송지 수정                 |
| DELETE | `/addresses/:id`              | 배송지 삭제                 |
| PUT    | `/addresses/:id/default`      | 기본 배송지 설정            |
| POST   | `/addresses/:id/save-to-book` | 최근 배송지를 주소록에 저장 |

### 인증

모든 API는 Bearer Token 인증이 필요합니다.

```
Authorization: Bearer <token>
```

---

## 데이터 타입

### Address 타입

```typescript
interface Address {
  _id: string;
  userId: string;
  addressName: string; // 배송지명 (집, 회사 등) - 최대 20자
  recipientName: string; // 수령인 - 최대 50자
  zipCode: string; // 우편번호
  address: string; // 기본주소
  addressDetail?: string; // 상세주소 - 최대 100자
  phone: string; // 휴대전화
  tel?: string; // 연락처 (선택)
  isDefault: boolean; // 기본 배송지 여부
  isFromRecent: boolean; // 최근 배송지 여부
  lastUsedAt?: string; // 마지막 사용일
  createdAt: string;
  updatedAt: string;
}

// 배송지 생성/수정 요청
interface AddressInput {
  addressName: string;
  recipientName: string;
  zipCode: string;
  address: string;
  addressDetail?: string;
  phone: string;
  tel?: string;
  isDefault?: boolean;
}
```

---

## 구현해야 할 기능

### 1. 배송지 목록 페이지 (마이페이지 > 배송지 관리)

**경로**: `/mypage/addresses`

**기능**:

- 저장된 배송지 목록 표시
- 기본 배송지 표시 (별표 또는 뱃지)
- 배송지 추가/수정/삭제
- 기본 배송지 설정

**UI 구성**:

```
┌─────────────────────────────────────────────────┐
│ 배송지 관리                        [+ 배송지 추가] │
├─────────────────────────────────────────────────┤
│ ⭐ 집 (기본 배송지)                              │
│    이한진 | 010-9657-1355                       │
│    (50573) 경남 양산시 신기강변로 78-1 301호      │
│                              [수정] [삭제]       │
├─────────────────────────────────────────────────┤
│ 회사                                            │
│    이한진 | 010-1234-5678                       │
│    (06234) 서울시 강남구 테헤란로 123            │
│                    [기본 설정] [수정] [삭제]     │
└─────────────────────────────────────────────────┘
```

### 2. 배송지 추가/수정 모달

**기능**:

- 배송지명, 수령인, 우편번호, 주소, 상세주소, 휴대전화, 연락처 입력
- 우편번호 검색 (다음 주소 API 연동)
- 기본 배송지 설정 체크박스
- 유효성 검사

**다음 주소 API 연동**:

```typescript
// 다음 주소 검색 API 사용
declare global {
  interface Window {
    daum: any;
  }
}

const openPostcode = () => {
  new window.daum.Postcode({
    oncomplete: (data: any) => {
      setZipCode(data.zonecode);
      setAddress(data.roadAddress || data.jibunAddress);
    },
  }).open();
};
```

**Script 추가** (index.html 또는 \_document.tsx):

```html
<script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
```

### 3. 배송지 선택 모달 (편지 작성 시)

**기능**:

- 탭: "배송주소록" | "최근배송지"
- 배송주소록: 저장된 주소 목록
- 최근배송지: 최근 사용한 주소 (최대 20개)
- 주소 선택 시 폼에 자동 입력
- 최근 배송지를 주소록에 저장하는 기능

**UI 구성**:

```
┌─────────────────────────────────────────────────┐
│ 배송지 확인                                  ✕  │
├─────────────────────────────────────────────────┤
│    [배송주소록]        [최근배송지]              │
├─────────────────────────────────────────────────┤
│ * 배송 주소록은 마이페이지 > 배송주소록 관리에서   │
│   수정할 수 있습니다.                           │
├─────────────────────────────────────────────────┤
│ 배송지명 │ 수령인 │ 주소              │ 연락처   │
├─────────────────────────────────────────────────┤
│ 이한진   │ 이한진 │ (50573)           │ 010-... │
│          │        │ 경남 양산시...     │ 010-... │
│          │        │ 301호             │         │
└─────────────────────────────────────────────────┘
│                                        [닫기]   │
└─────────────────────────────────────────────────┘
```

### 4. 편지 작성 폼 - 배송지 정보 섹션

**배송 방식**: 일반 우편 (고정)

**기능**:

- 기본 배송지 체크박스
- 우편번호 검색 버튼
- 배송지 선택 버튼 (모달 열기)
- 기본 배송지로 등록 체크박스
- 주소록에 배송지 저장 체크박스

**UI 구성**:

```
┌─────────────────────────────────────────────────┐
│ 배송지 정보                    □ 주문자 정보와 동일│
├─────────────────────────────────────────────────┤
│              □ 기본 배송지                       │
│ ┌──────────┐ [우편번호 검색] [배송지선택]        │
│ │          │ □ 기본 배송지로 등록  □ 주소록에 저장│
├─────────────────────────────────────────────────┤
│ * 배송지 주소                                    │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ * 수취인 이름  ┌─────────────────────────────┐  │
│                │                             │  │
│                └─────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│ * 수취인 휴대전화  ┌─────────────────────────┐  │
│                    │                         │  │
│                    └─────────────────────────┘  │
├─────────────────────────────────────────────────┤
│ * 수취인 연락처    ┌─────────────────────────┐  │
│                    │                         │  │
│                    └─────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## API 호출 예시 (React Query + Axios)

### API 클라이언트

```typescript
// api/address.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 배송지 목록 조회
export const getAddresses = () => api.get("/addresses");

// 최근 배송지 조회
export const getRecentAddresses = (limit = 20) => api.get(`/addresses/recent?limit=${limit}`);

// 배송지 추가
export const createAddress = (data: AddressInput) => api.post("/addresses", data);

// 배송지 수정
export const updateAddress = (id: string, data: AddressInput) => api.put(`/addresses/${id}`, data);

// 배송지 삭제
export const deleteAddress = (id: string) => api.delete(`/addresses/${id}`);

// 기본 배송지 설정
export const setDefaultAddress = (id: string) => api.put(`/addresses/${id}/default`);

// 최근 배송지를 주소록에 저장
export const saveRecentToBook = (id: string, addressName?: string) => api.post(`/addresses/${id}/save-to-book`, { addressName });
```

### React Query Hooks

```typescript
// hooks/useAddress.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as addressApi from "@/api/address";

export const useAddresses = () => {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: () => addressApi.getAddresses().then((res) => res.data.data),
  });
};

export const useRecentAddresses = (limit = 20) => {
  return useQuery({
    queryKey: ["addresses", "recent", limit],
    queryFn: () => addressApi.getRecentAddresses(limit).then((res) => res.data.data),
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addressApi.createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddressInput }) => addressApi.updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addressApi.deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

export const useSetDefaultAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addressApi.setDefaultAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};
```

---

## 컴포넌트 구조 제안

```
src/
├── components/
│   └── address/
│       ├── AddressForm.tsx          # 배송지 입력 폼
│       ├── AddressCard.tsx          # 배송지 카드 (목록 아이템)
│       ├── AddressSelectModal.tsx   # 배송지 선택 모달
│       ├── AddressFormModal.tsx     # 배송지 추가/수정 모달
│       └── PostcodeSearch.tsx       # 우편번호 검색 버튼
├── pages/
│   └── mypage/
│       └── addresses.tsx            # 배송지 관리 페이지
├── hooks/
│   └── useAddress.ts                # 배송지 관련 React Query hooks
└── api/
    └── address.ts                   # 배송지 API 클라이언트
```

---

## 유효성 검사 규칙

| 필드     | 규칙                       |
| -------- | -------------------------- |
| 배송지명 | 필수, 최대 20자            |
| 수령인   | 필수, 최대 50자            |
| 우편번호 | 필수                       |
| 주소     | 필수                       |
| 상세주소 | 선택, 최대 100자           |
| 휴대전화 | 필수, 숫자와 하이픈만 허용 |
| 연락처   | 선택, 숫자와 하이픈만 허용 |

---

## 참고 사항

1. **다음 주소 API**: 무료로 사용 가능, 별도 API 키 불필요
2. **최근 배송지**: 서버에서 자동으로 최대 20개까지 관리
3. **기본 배송지**: 사용자당 1개만 설정 가능
4. **인증**: 모든 API는 로그인 필수

---

## Swagger 문서

API 상세 스펙은 Swagger에서 확인할 수 있습니다:
`http://localhost:5001/api-docs`
