# OG 이미지 기능 빠른 시작 가이드

## 구현 완료 항목 ✅

### 백엔드 구조
```
src/
├── models/
│   └── Letter.ts              # Letter 모델 (OG 이미지 필드 포함)
├── controllers/
│   ├── letterController.ts    # 편지 CRUD
│   └── ogController.ts        # OG 이미지 관리
├── services/
│   └── letterService.ts       # 편지 비즈니스 로직
├── routes/
│   ├── letters.ts             # 편지 라우트
│   ├── og.ts                  # OG 이미지 라우트
│   └── index.ts               # 라우트 통합
├── middleware/
│   ├── letterValidation.ts    # 편지 검증
│   └── ogValidation.ts        # OG 이미지 검증
└── app.ts                     # Static 파일 서빙 설정
```

## API 엔드포인트

### 1. 편지 관리
- `POST /api/letters` - 편지 생성 (인증 필요)
- `GET /api/letters/me` - 내 편지 목록 (인증 필요)
- `GET /api/letters/:id` - 편지 조회 (공개)
- `GET /api/letters` - 모든 편지 조회 (공개, 페이지네이션)
- `PATCH /api/letters/:id` - 편지 수정 (인증 필요)
- `DELETE /api/letters/:id` - 편지 삭제 (인증 필요)

### 2. OG 이미지 관리
- `POST /api/og/upload` - 커스텀 OG 이미지 업로드
- `PATCH /api/og/auto-generate` - 자동 생성 OG 이미지 URL 저장
- `GET /api/og/:letterId` - OG 이미지 URL 조회

## 테스트 방법

### 1. 서버 실행
```bash
pnpm dev
```

### 2. 편지 생성 (Postman/Thunder Client)
```http
POST http://localhost:5001/api/letters
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "content": "안녕하세요! 이것은 테스트 편지입니다.",
  "ogPreviewMessage": "테스트 편지 미리보기"
}
```

### 3. 커스텀 OG 이미지 업로드
```http
POST http://localhost:5001/api/og/upload
Content-Type: application/json

{
  "letterId": "생성된_편지_ID",
  "file": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "ogPreviewMessage": "커스텀 메시지"
}
```

### 4. OG 이미지 URL 조회
```http
GET http://localhost:5001/api/og/생성된_편지_ID
```

### 5. 편지 조회 (OG 메타태그용)
```http
GET http://localhost:5001/api/letters/생성된_편지_ID
```

## 프론트엔드 연동 체크리스트

### Next.js에서 구현해야 할 것들

#### 1. OG 이미지 자동 생성 API Route
```typescript
// app/api/og/route.ts
import { ImageResponse } from '@vercel/og';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const letterId = searchParams.get('letterId');
  
  // 백엔드에서 letter 정보 fetch
  const res = await fetch(`${process.env.API_URL}/api/letters/${letterId}`);
  const { data: letter } = await res.json();
  
  // Satori로 이미지 생성
  return new ImageResponse(
    (
      <div style={{ /* 스타일 */ }}>
        {letter.ogPreviewMessage}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

#### 2. 미리보기용 임시 렌더 API
```typescript
// app/api/og-preview/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message');
  const bgColor = searchParams.get('bgColor');
  
  return new ImageResponse(/* ... */);
}
```

#### 3. 커스텀 편집 UI
```typescript
// app/letter/[letterId]/custom-og/page.tsx
'use client';

export default function CustomOgPage() {
  const [message, setMessage] = useState('');
  const [bgColor, setBgColor] = useState('#ffffff');
  
  const handleSave = async () => {
    // 미리보기 이미지를 base64로 변환
    const response = await fetch(`/api/og-preview?message=${message}&bgColor=${bgColor}`);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    
    // 백엔드에 업로드
    await fetch(`${API_URL}/api/og/upload`, {
      method: 'POST',
      body: JSON.stringify({ letterId, file: base64, ogPreviewMessage: message })
    });
  };
  
  return (/* UI */);
}
```

#### 4. 공유 페이지 OG 메타태그
```typescript
// app/letter/[letterId]/page.tsx
export async function generateMetadata({ params }) {
  const res = await fetch(`${API_URL}/api/letters/${params.letterId}`);
  const { data: letter } = await res.json();
  
  return {
    openGraph: {
      images: [{ url: letter.ogImageUrl }],
    },
  };
}
```

## 환경 변수 설정

### 백엔드 (.env)
```env
BASE_URL=http://localhost:5001
```

### 프론트엔드 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

## 다음 단계

1. ✅ 백엔드 API 구현 완료
2. ⏳ Next.js에서 Satori 기반 OG 이미지 생성 구현
3. ⏳ 커스텀 편집 UI 구현
4. ⏳ 공유 페이지에 OG 메타태그 적용
5. ⏳ 프로덕션 환경에서 S3 연동 (선택사항)

## 참고 문서
- [OG_IMAGE_API_DOCUMENTATION.md](./OG_IMAGE_API_DOCUMENTATION.md) - 상세 API 문서
- [@vercel/og 문서](https://vercel.com/docs/functions/edge-functions/og-image-generation)
- [Satori 문서](https://github.com/vercel/satori)
