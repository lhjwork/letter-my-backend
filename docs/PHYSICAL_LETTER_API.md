# 🏠 실물 편지 신청 API 구현 완료

## 🎯 개요

프론트엔드에서 실물 편지 신청 요청을 처리할 수 있는 완전한 백엔드 API 시스템을 구현했습니다.

## ✅ 구현된 기능

### 1. 데이터베이스 스키마 확장

- **Letter 모델 업데이트**
  - `physicalRequested`: 실물 편지 신청 여부
  - `physicalRequestDate`: 신청 날짜
  - `physicalStatus`: 처리 상태 (none, requested, processing, writing, sent, delivered, cancelled)
  - `shippingAddress`: 배송 주소 정보
  - `physicalNotes`: 관리자 메모

### 2. 실물 편지 신청 API

- **POST `/api/letters/:letterId/physical-request`**
  - 실물 편지 신청 처리
  - 주소 정보 검증 및 저장
  - 중복 신청 방지

### 3. 상태 조회 API

- **GET `/api/letters/:letterId/physical-status`**
  - 실물 편지 신청 상태 조회
  - 배송 정보 확인

### 4. 관리자 관리 API

- **GET `/api/admin/physical-requests`**
  - 실물 편지 신청 목록 조회
  - 상태별 필터링 및 페이지네이션

- **PATCH `/api/admin/physical-requests/:letterId`**
  - 실물 편지 상태 업데이트
  - 관리자 메모 추가

## 🔧 API 사용 방법

### 실물 편지 신청

```javascript
POST /api/letters/694b75482a481c18da78bda2/physical-request
Content-Type: application/json

{
  "address": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "zipCode": "12345",
    "address1": "서울시 강남구 테헤란로 123",
    "address2": "101동 202호"
  }
}
```

### 성공 응답

```javascript
{
  "success": true,
  "message": "실물 편지 신청이 완료되었습니다.",
  "data": {
    "letterId": "694b75482a481c18da78bda2",
    "physicalStatus": "requested",
    "requestDate": "2024-12-24T10:30:00.000Z",
    "shippingAddress": {
      "name": "홍길동",
      "phone": "010-1234-5678",
      "address": "(12345) 서울시 강남구 테헤란로 123 101동 202호"
    }
  }
}
```

### 상태 조회

```javascript
GET /api/letters/694b75482a481c18da78bda2/physical-status

// 응답
{
  "success": true,
  "data": {
    "physicalRequested": true,
    "status": "requested",
    "requestDate": "2024-12-24T10:30:00.000Z",
    "shippingAddress": {
      "name": "홍길동",
      "phone": "010-1234-5678",
      "zipCode": "12345",
      "address1": "서울시 강남구 테헤란로 123",
      "address2": "101동 202호",
      "requestedAt": "2024-12-24T10:30:00.000Z"
    }
  }
}
```

## 🔒 보안 및 검증

### 입력 데이터 검증

- **필수 필드**: name, phone, zipCode, address1
- **연락처 형식**: 한국 휴대폰 번호 (010-1234-5678)
- **우편번호 형식**: 5자리 숫자
- **주소 길이**: 5-200자 이내

### 중복 신청 방지

```javascript
// 이미 신청된 편지에 재신청 시
{
  "success": false,
  "message": "이미 실물 편지가 신청된 편지입니다. 현재 상태: requested",
  "errorType": "ALREADY_REQUESTED"
}
```

### 에러 처리

- `INVALID_LETTER_ID`: 올바르지 않은 편지 ID
- `LETTER_NOT_FOUND`: 편지를 찾을 수 없음
- `ALREADY_REQUESTED`: 이미 신청된 편지
- `VALIDATION_ERROR`: 입력 데이터 검증 실패
- `MISSING_ADDRESS`: 주소 정보 누락

## 📊 실물 편지 상태 관리

### 상태 흐름

1. **none**: 신청 전 상태
2. **requested**: 신청 완료
3. **processing**: 처리 중
4. **writing**: 편지 작성 중
5. **sent**: 발송 완료
6. **delivered**: 배송 완료
7. **cancelled**: 취소됨

### 관리자 기능

```javascript
// 상태 업데이트
PATCH /api/admin/physical-requests/694b75482a481c18da78bda2
Authorization: Bearer <admin-token>

{
  "status": "writing",
  "notes": "편지 작성 시작"
}
```

## 🗄️ 데이터베이스 인덱스

### 권장 인덱스

```javascript
// 실물 편지 신청 조회 최적화
db.letters.createIndex({ physicalRequested: 1, physicalStatus: 1, physicalRequestDate: -1 });

// 편지 ID 조회 최적화 (기존)
db.letters.createIndex({ _id: 1 });
```

## 🧪 테스트 시나리오

### 1. 정상 신청 플로우

- ✅ 유효한 주소 정보로 신청
- ✅ 신청 완료 응답 확인
- ✅ 상태 조회로 신청 정보 확인

### 2. 중복 신청 방지

- ✅ 이미 신청된 편지에 재신청 시도
- ✅ 409 Conflict 응답 확인

### 3. 입력 데이터 검증

- ✅ 필수 필드 누락 시 400 에러
- ✅ 잘못된 연락처 형식 시 400 에러
- ✅ 잘못된 우편번호 형식 시 400 에러

### 4. 존재하지 않는 편지

- ✅ 잘못된 편지 ID로 신청 시도
- ✅ 404 Not Found 응답 확인

## 📋 체크리스트

### ✅ 구현 완료

- [x] Letter 모델에 실물 편지 관련 필드 추가
- [x] PhysicalLetterService 구현
- [x] PhysicalLetterController 구현
- [x] POST /api/letters/:letterId/physical-request API
- [x] GET /api/letters/:letterId/physical-status API
- [x] 관리자용 API (목록 조회, 상태 업데이트)
- [x] 입력 데이터 검증 로직
- [x] 중복 신청 방지 로직
- [x] 에러 처리 및 응답 표준화
- [x] TypeScript 타입 정의

### 🔄 배포 후 작업

- [ ] 프론트엔드에서 API 테스트
- [ ] 실물 편지 신청 플로우 테스트
- [ ] 관리자 대시보드에서 신청 목록 확인
- [ ] 상태 업데이트 기능 테스트

## 🚀 배포 가이드

### 1. 코드 배포

```bash
git add .
git commit -m "feat: 실물 편지 신청 API 구현"
git push
```

### 2. 확인 사항

- Render 자동 배포 완료 확인
- API 엔드포인트 정상 작동 확인
- 프론트엔드 연동 테스트

## 🔗 관련 파일

- `src/models/Letter.ts` - 데이터 모델 (실물 편지 필드 추가)
- `src/services/physicalLetterService.ts` - 실물 편지 비즈니스 로직
- `src/controllers/physicalLetterController.ts` - API 컨트롤러
- `src/routes/letters.ts` - 편지 관련 라우트 (실물 편지 API 추가)
- `src/routes/adminRoutes.ts` - 관리자 라우트 (실물 편지 관리 추가)

## 📞 문의 및 지원

실물 편지 신청 API 관련 문제가 발생하면 서버 로그에서 다음 메시지들을 확인하세요:

- `🏠 실물 편지 신청 요청:` - 신청 요청 로그
- `🏠 새로운 실물 편지 신청` - 관리자 알림 로그
- `❌ 실물 편지 신청 실패:` - 에러 로그
