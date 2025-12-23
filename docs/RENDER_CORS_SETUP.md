# Render CORS 설정 가이드

## 🚨 문제

Render에 배포된 백엔드에서 CORS 오류가 발생하는 경우

## 🔧 해결 방법

### 1. 코드 수정 (완료됨)

- `src/app.ts`에서 `https://letter-community.vercel.app` 도메인을 허용 목록에 추가
- CORS 로깅 추가로 디버깅 가능

### 2. Render 환경변수 설정

Render 대시보드에서 다음 환경변수들을 설정해주세요:

#### 필수 환경변수

```
FRONTEND_URL=https://letter-community.vercel.app
NODE_ENV=production
```

#### 선택적 환경변수 (추가 도메인이 있는 경우)

```
ALLOWED_ORIGINS=https://letter-community.vercel.app,https://admin.letter-community.vercel.app
```

### 3. Render 환경변수 설정 방법

1. **Render 대시보드 접속**
   - https://dashboard.render.com 로그인

2. **서비스 선택**
   - `letter-my-backend` 서비스 클릭

3. **Environment 탭 이동**
   - 좌측 메뉴에서 "Environment" 클릭

4. **환경변수 추가**

   ```
   Key: FRONTEND_URL
   Value: https://letter-community.vercel.app

   Key: NODE_ENV
   Value: production
   ```

5. **저장 및 재배포**
   - "Save Changes" 클릭
   - 자동으로 재배포됨

### 4. 확인 방법

#### 서버 로그 확인

Render 대시보드 > Logs 탭에서 다음과 같은 로그 확인:

```
🌐 CORS Origin 요청: https://letter-community.vercel.app
🔧 현재 환경: production
📋 허용된 Origins: [..., https://letter-community.vercel.app]
✅ 허용된 Origin: https://letter-community.vercel.app
```

#### 브라우저에서 테스트

1. https://letter-community.vercel.app 접속
2. 개발자 도구 > Network 탭 열기
3. API 요청 시도
4. CORS 오류가 사라졌는지 확인

### 5. 추가 도메인 허용 (필요시)

만약 Admin 프론트엔드나 다른 도메인도 사용한다면:

```
ALLOWED_ORIGINS=https://letter-community.vercel.app,https://admin-letter-community.vercel.app,https://test.letter-community.vercel.app
```

### 6. 문제 해결

#### CORS 오류가 계속 발생하는 경우:

1. Render 로그에서 실제 요청 Origin 확인
2. 대소문자, 프로토콜(http/https), 포트 번호 정확히 확인
3. 환경변수 저장 후 재배포 확인

#### 일시적 해결 방법 (개발용):

프로덕션에서 임시로 모든 Origin 허용 (보안상 권장하지 않음):

```javascript
// 임시 - 모든 Origin 허용
origin: true;
```

## ✅ 완료 체크리스트

- [ ] 코드에서 프로덕션 도메인 추가
- [ ] Render 환경변수 설정
- [ ] 재배포 완료
- [ ] 브라우저에서 CORS 오류 해결 확인
- [ ] 서버 로그에서 허용된 Origin 확인

## 🔍 디버깅 팁

- Render 로그에서 `🌐 CORS Origin 요청` 메시지 확인
- 실제 요청되는 Origin과 허용 목록 비교
- 환경변수가 올바르게 설정되었는지 확인
