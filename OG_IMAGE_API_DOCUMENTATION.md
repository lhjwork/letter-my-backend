# OG 이미지 API 문서

## 개요
편지 서비스에서 공유 시 노출되는 OG 이미지(짧은 엽서 형태)를 자동 생성 및 사용자 커스텀 생성 가능하도록 구현한 API입니다.

## 데이터 구조

### Letter Model
```typescript
{
  _id: ObjectId,
  userId: String,
  content: String,
  ogPreviewMessage: String,  // 사용자 또는 자동 생성 메시지
  ogImageType: "auto" | "custom",
  ogImageUrl: String,  // S3 또는 CDN 주소
  createdAt: Date,
  updatedAt: Date
}
```

## API 엔드포인트

### 1. 편지 생성
**POST** `/api/letters`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "편지 내용",
  "ogPreviewMessage": "미리보기 메시지 (선택사항)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "letter_id",
    "userId": "user_id",
    "content": "편지 내용",
    "ogPreviewMessage": "미리보기 메시지",
    "ogImageType": "auto",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Letter created successfully"
}
```

---

### 2. 커스텀 OG 이미지 업로드
**POST** `/api/og/upload`

**Request Body:**
```json
{
  "letterId": "letter_id",
  "file": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "ogPreviewMessage": "커스텀 메시지 (선택사항)",
  "style": "{\"bgColor\":\"#FF5733\",\"illustrationType\":\"flower\"}"
}
```

**Process:**
1. PNG 파일을 base64로 인코딩하여 전송
2. 서버에서 `/public/og-custom/` 폴더에 저장
3. Letter document의 `ogImageUrl`, `ogImageType=custom`, `ogPreviewMessage` 업데이트
4. 생성된 URL 반환

**Response:**
```json
{
  "success": true,
  "ogImageUrl": "http://localhost:5001/og-custom/letter_id-1234567890.png",
  "data": {
    "_id": "letter_id",
    "userId": "user_id",
    "content": "편지 내용",
    "ogPreviewMessage": "커스텀 메시지",
    "ogImageType": "custom",
    "ogImageUrl": "http://localhost:5001/og-custom/letter_id-1234567890.png",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3. 자동 생성 OG 이미지 URL 저장
**PATCH** `/api/og/auto-generate`

**Request Body:**
```json
{
  "letterId": "letter_id",
  "ogImageUrl": "https://letter.com/api/og?letterId=xxx"
}
```

**Process:**
- Letter document의 `ogImageType="auto"` 및 `ogImageUrl` 업데이트

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "letter_id",
    "userId": "user_id",
    "content": "편지 내용",
    "ogPreviewMessage": "미리보기 메시지",
    "ogImageType": "auto",
    "ogImageUrl": "https://letter.com/api/og?letterId=xxx",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. OG 이미지 URL 조회
**GET** `/api/og/:letterId`

**Response:**
```json
{
  "success": true,
  "ogImageUrl": "http://localhost:5001/og-custom/letter_id-1234567890.png",
  "ogImageType": "custom",
  "ogPreviewMessage": "미리보기 메시지"
}
```

---

### 5. 편지 조회 (OG 메타태그용)
**GET** `/api/letters/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "letter_id",
    "userId": "user_id",
    "content": "편지 내용",
    "ogPreviewMessage": "미리보기 메시지",
    "ogImageType": "custom",
    "ogImageUrl": "http://localhost:5001/og-custom/letter_id-1234567890.png",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 사용 시나리오

### 시나리오 1: 자동 OG 이미지 생성
1. 사용자가 편지 작성 → `POST /api/letters`
2. Next.js에서 `/api/og?letterId=xxx` 호출하여 이미지 생성
3. 생성된 URL을 백엔드에 저장 → `PATCH /api/og/auto-generate`
4. 공유 시 해당 URL을 OG 메타태그에 사용

### 시나리오 2: 커스텀 OG 이미지 생성
1. 사용자가 편지 작성 → `POST /api/letters`
2. 사용자가 커스텀 편집 페이지 접속 → `/letter/:letterId/custom-og`
3. Next.js에서 `/api/og-preview` 호출하여 실시간 미리보기
4. 저장 버튼 클릭 → PNG를 base64로 변환 → `POST /api/og/upload`
5. 공유 시 커스텀 이미지 URL을 OG 메타태그에 사용

---

## 환경 변수

`.env` 파일에 다음 변수 추가:
```env
BASE_URL=http://localhost:5001
```

프로덕션 환경에서는:
```env
BASE_URL=https://api.yourdomain.com
```

---

## 파일 저장 구조
```
project-root/
├── public/
│   └── og-custom/
│       ├── letter_id_1-1234567890.png
│       ├── letter_id_2-1234567891.png
│       └── ...
```

---

## 프론트엔드 연동 예시

### Next.js 공유 페이지 (SSR)
```typescript
// app/letter/[letterId]/page.tsx
export async function generateMetadata({ params }: { params: { letterId: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/letters/${params.letterId}`);
  const { data: letter } = await res.json();

  return {
    title: "당신에게 도착한 엽서",
    description: letter.ogPreviewMessage,
    openGraph: {
      title: "당신에게 도착한 엽서",
      description: letter.ogPreviewMessage,
      images: [
        {
          url: letter.ogImageUrl || `${process.env.NEXT_PUBLIC_API_URL}/api/og?letterId=${params.letterId}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}
```

---

## 주의사항

1. **이미지 생성은 Next.js에서 처리**: 백엔드는 이미지 저장/관리만 담당
2. **파일 크기 제한**: 현재 10MB로 설정 (필요시 조정 가능)
3. **보안**: 프로덕션 환경에서는 S3 등 클라우드 스토리지 사용 권장
4. **인증**: 편지 생성/수정/삭제는 인증 필요, OG 이미지 조회는 공개
