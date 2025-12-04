# Letter-My Backend

Express + TypeScript + MongoDB 기반의 사용자 인증 백엔드 API

## 🚀 주요 기능

- ✅ **MVC 패턴** 아키텍처 (Model-View-Controller)
- ✅ **OAuth 소셜 로그인** 지원 (Instagram, Naver, Kakao)
- ✅ **JWT 토큰** 기반 인증
- ✅ **NextAuth.js** 연동 지원
- ✅ **TypeScript** 타입 안정성
- ✅ **MongoDB + Mongoose** ODM
- ✅ **Express Validator** 요청 검증
- ✅ **Bcrypt** 비밀번호 암호화

## 📁 프로젝트 구조

```
src/
├── models/          # Model Layer (데이터 스키마)
│   └── User.ts      # User 모델 (OAuth 계정 지원)
├── services/        # Service Layer (비즈니스 로직)
│   └── userService.ts
├── controllers/     # Controller Layer (요청/응답 처리)
│   └── userController.ts
├── middleware/      # 미들웨어
│   ├── auth.ts      # JWT 인증
│   ├── validation.ts # 요청 검증
│   └── errorHandler.ts
├── routes/          # API 라우트
│   ├── index.ts
│   └── users.ts
└── config/          # 설정
    └── database.ts
```

## 🛠️ 설치 및 실행

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

필수 환경 변수:

```env
MONGODB_URI=mongodb://localhost:27017/letter-my-backend
JWT_SECRET=your-secret-key
INSTAGRAM_CLIENT_ID=your_instagram_client_id
NAVER_CLIENT_ID=your_naver_client_id
KAKAO_CLIENT_ID=your_kakao_client_id
```

### 3. 서버 실행

```bash
# 개발 모드
pnpm dev

# 프로덕션 빌드
pnpm build
pnpm start
```

## 📡 API 엔드포인트

### 인증 API

- `POST /api/users/register` - 일반 회원가입
- `POST /api/users/login` - 일반 로그인
- `POST /api/users/oauth/login` - OAuth 로그인 (Instagram/Naver/Kakao)

### 사용자 API (인증 필요)

- `GET /api/users/me` - 내 정보 조회
- `PUT /api/users/me` - 내 정보 수정
- `PUT /api/users/me/password` - 비밀번호 변경
- `DELETE /api/users/me` - 계정 삭제
- `POST /api/users/me/oauth/link` - OAuth 계정 연결
- `DELETE /api/users/me/oauth/:provider` - OAuth 계정 해제
- `GET /api/users` - 모든 사용자 조회
- `GET /api/users/:id` - 특정 사용자 조회

자세한 API 문서는 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)를 참고하세요.

## 🔗 NextAuth.js 연동

프론트엔드에서 NextAuth.js를 사용할 경우:

```typescript
// NextAuth 콜백에서 백엔드 API 호출
async signIn({ user, account, profile }) {
  const response = await fetch('http://localhost:5000/api/users/oauth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: account.provider, // instagram, naver, kakao
      providerId: account.providerAccountId,
      email: user.email,
      name: user.name,
      image: user.image,
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
    }),
  });

  const data = await response.json();
  user.backendToken = data.data.token; // JWT 토큰 저장
  return true;
}
```

## 🧪 테스트

```bash
# Postman, Thunder Client 또는 curl 사용
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","name":"테스트"}'
```

## 📚 기술 스택

- **Runtime**: Node.js
- **Framework**: Express 5
- **Language**: TypeScript
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT, bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS

## 📖 참고 문서

- [API Documentation](./API_DOCUMENTATION.md)
- [NextAuth.js](https://next-auth.js.org/)
- [Instagram OAuth](https://developers.facebook.com/docs/instagram)
- [Naver OAuth](https://developers.naver.com/docs/login)
- [Kakao OAuth](https://developers.kakao.com/docs/latest/ko/kakaologin)

---

## 프로젝트 라인엔딩 정책 (Line Ending Policy)

아래 지침은 팀 전체가 동일한 라인엔딩 규칙을 사용하여 불필요한 diff와 빌드 문제를 방지하기 위한 최소 권장 설정입니다.

- **원칙**: 소스 코드는 저장소에서 LF (\n)로 통일합니다. Windows 전용 스크립트(예: PowerShell)는 예외로 CRLF를 허용할 수 있습니다.
- **관리파일**: `.gitattributes` 파일을 통해 저장소 차원의 규칙을 설정합니다. 이 저장소는 이미 `.gitattributes`를 포함합니다.

**개발자 권장 로컬 Git 설정**

- Windows (권장): 커밋 시 CRLF를 LF로 변환하려면 아래를 실행하세요(working tree는 플랫폼 기본대로 유지):

```powershell
git config --global core.autocrlf input
```

- 또는 Windows에서 체크아웃 시 자동으로 CRLF를 사용하려면(기본값):

```powershell
git config --global core.autocrlf true
```

**저장소에 적용할 때(한 번만 실행)**

`.gitattributes`를 추가하거나 변경한 뒤, 모든 파일의 라인엔딩을 정규화하려면 프로젝트 루트에서 아래를 실행하세요:

```powershell
# 1) .gitattributes가 변경된 경우 추가
git add .gitattributes

# 2) 모든 파일 재정규화
git add --renormalize .

# 3) 변경사항 커밋
git commit -m "chore: normalize line endings and add .gitattributes"
```

**node_modules 예외**

`node_modules/` 폴더는 버전 관리 대상에서 제외되어야 하므로 `.gitignore`에 포함되어 있습니다. 만약 `node_modules`가 레포에 추적되고 있다면 아래로 캐시에서만 제거하세요(로컬 파일은 유지):

```powershell
git rm -r --cached node_modules
git add .gitignore
git commit -m "chore: remove node_modules from repo and add to .gitignore"
```

**비고**

- `.gitattributes`가 우선권을 갖습니다. 팀은 위 정책을 따르고, 중요한 변경(예: `.gitattributes` 수정)은 커밋 전에 팀과 공유하세요.
- 라인엔딩 관련 변경 커밋은 많은 파일이 변경된 것처럼 보일 수 있으니 PR/커밋 메시지에 목적을 명확히 표기하세요.

---

파일에 대해 수정하거나 팀 안내 문구를 다듬어 드리길 원하면 말씀해 주세요.
