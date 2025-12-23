# 📝 HTML 콘텐츠 지원 구현 완료

## 🎯 개요

프론트엔드 Tiptap 에디터에서 작성된 HTML 형식의 편지 내용을 백엔드에서 안전하게 처리하고 저장할 수 있도록 구현했습니다.

## ✅ 구현된 기능

### 1. 데이터베이스 스키마 확장

- **Letter 모델 업데이트**
  - `contentType`: "text" | "html" (기본값: "html")
  - `plainContent`: 검색 및 미리보기용 일반 텍스트

### 2. HTML 처리 유틸리티

- **`src/utils/htmlProcessor.ts`**
  - `sanitizeHtmlContent()`: HTML 보안 처리
  - `extractPlainText()`: HTML에서 텍스트 추출
  - `generatePreviewText()`: 미리보기 텍스트 생성
  - `isHtmlContent()`: HTML 콘텐츠 감지
  - `textToHtml()`: 텍스트를 HTML로 변환

### 3. 보안 강화

- **허용된 HTML 태그**: p, br, strong, em, u, span, ul, ol, li, blockquote, mark, h1-h6
- **DOMPurify 적용**: XSS 공격 방지
- **콘텐츠 크기 제한**: 최대 50KB
- **위험한 태그 차단**: script, object, embed, form, input 등

### 4. API 엔드포인트 개선

- **편지 생성 API** (`POST /api/letters/create`)
  - HTML 콘텐츠 보안 처리
  - 자동 plainContent 생성
  - 미리보기 텍스트 자동 생성

- **사연 생성 API** (`POST /api/letters/story`)
  - 동일한 HTML 처리 적용

### 5. 검색 기능 개선

- **plainContent 필드 사용**: HTML 태그 제외하고 검색
- **성능 최적화**: 일반 텍스트에서만 검색 수행

### 6. 미들웨어 추가

- **`contentSizeLimit`**: 콘텐츠 크기 제한 (50KB)
- **`validateHtmlContent`**: 위험한 HTML 태그 사전 차단

## 🔧 사용 방법

### 편지 생성 (HTML 콘텐츠)

```javascript
POST /api/letters/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "HTML 편지 제목",
  "content": "<p><strong>굵은 글씨</strong>와 <em>기울임</em></p><p><span style=\"color: red;\">빨간색 텍스트</span></p>",
  "type": "friend",
  "category": "기타"
}
```

### 응답 형식

```javascript
{
  "success": true,
  "data": {
    "_id": "편지ID",
    "title": "편지 제목",
    "content": "<p><strong>굵은 글씨</strong>와 <em>기울임</em></p>", // HTML 형식
    "contentType": "html",
    "plainContent": "굵은 글씨와 기울임", // 검색용 텍스트
    "ogPreviewText": "굵은 글씨와 기울임...",
    // ... 기타 필드
  }
}
```

## 🗄️ 데이터 마이그레이션

### 기존 데이터 마이그레이션 실행

```bash
# 개발 환경
pnpm run migrate:content-type

# 프로덕션 환경
npm run migrate:content-type
```

### 마이그레이션 내용

- 기존 텍스트 콘텐츠를 HTML 형식으로 변환
- `plainContent` 필드 자동 생성
- `contentType` 필드 설정
- 누락된 `ogPreviewText` 자동 생성

## 🔒 보안 고려사항

### 허용된 HTML 태그

```javascript
const allowedTags = ["p", "br", "strong", "em", "u", "span", "ul", "ol", "li", "blockquote", "mark", "h1", "h2", "h3", "h4", "h5", "h6"];
```

### 허용된 속성

- `span`, `p`: `style` 속성 (색상 등)
- 나머지 태그: 속성 없음

### 차단되는 요소

- JavaScript 코드 (`<script>`)
- 폼 요소 (`<form>`, `<input>`)
- 외부 리소스 (`<object>`, `<embed>`, `<iframe>`)
- 이벤트 핸들러 (`onclick`, `onload` 등)

## 📊 성능 최적화

### 검색 성능

- `plainContent` 필드에 인덱스 적용 권장
- HTML 태그 제외하고 검색하여 정확도 향상

### 저장 공간

- HTML 콘텐츠와 일반 텍스트 모두 저장
- 검색 성능과 저장 공간의 균형

## 🧪 테스트 시나리오

### 1. HTML 콘텐츠 저장

```javascript
const testContent = `
<p>안녕하세요!</p>
<p><strong>굵은 글씨</strong>와 <em>기울임</em></p>
<p><span style="color: red;">빨간색 텍스트</span></p>
<ul>
  <li>목록 항목 1</li>
  <li>목록 항목 2</li>
</ul>
`;
```

### 2. 보안 테스트

```javascript
// 악성 스크립트 - 자동으로 제거됨
const maliciousContent = `
<p>안전한 내용</p>
<script>alert('XSS');</script>
<p onclick="alert('click')">위험한 클릭</p>
`;
```

### 3. 검색 테스트

```javascript
// HTML 태그 제외하고 검색
GET /api/letters/stories?search=굵은글씨
// plainContent 필드에서 검색됨
```

## 📋 체크리스트

### ✅ 구현 완료

- [x] Letter 모델에 contentType, plainContent 필드 추가
- [x] HTML 처리 유틸리티 함수 구현
- [x] 편지 생성 API에서 HTML 콘텐츠 처리
- [x] 편지 조회 API에서 HTML 콘텐츠 반환
- [x] 기존 데이터 마이그레이션 스크립트 작성
- [x] HTML 보안 처리 (DOMPurify) 적용
- [x] 검색 기능에서 plainContent 사용
- [x] 콘텐츠 크기 제한 미들웨어 추가

### 🔄 배포 후 작업

- [ ] 프로덕션 환경에서 마이그레이션 실행
- [ ] HTML 형식 편지 생성 테스트
- [ ] 서식이 포함된 편지 조회 테스트
- [ ] XSS 공격 방어 테스트
- [ ] 기존 텍스트 편지 호환성 테스트
- [ ] 검색 기능 정상 동작 테스트

## 🚀 배포 가이드

### 1. 코드 배포

```bash
git add .
git commit -m "feat: HTML 콘텐츠 지원 구현"
git push
```

### 2. 마이그레이션 실행 (프로덕션)

```bash
# Render 서버에서 실행
npm run migrate:content-type
```

### 3. 확인 사항

- 기존 편지들이 정상적으로 표시되는지 확인
- 새로운 HTML 편지가 올바르게 저장되는지 확인
- 검색 기능이 정상 작동하는지 확인

## 🔗 관련 파일

- `src/models/Letter.ts` - 데이터 모델
- `src/utils/htmlProcessor.ts` - HTML 처리 유틸리티
- `src/services/letterCreateService.ts` - 편지 생성 서비스
- `src/services/letterService.ts` - 편지 관련 서비스
- `src/middleware/contentValidation.ts` - 콘텐츠 검증 미들웨어
- `scripts/migrateContentType.ts` - 데이터 마이그레이션 스크립트
