# Test API - MVC Pattern Example

이 문서는 **Test** 리소스를 관리하는 완전한 MVC 패턴 예제 API입니다.

## 📊 데이터 구조

```typescript
{
  _id: string;
  title: string; // 3-100자
  description: string; // 10자 이상
  status: "pending" | "in-progress" | "completed";
  priority: number; // 1-5
  createdBy: string; // 사용자 이메일
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔄 전체 MVC 흐름

```
Client Request
    ↓
📍 ROUTE (/api/tests)
    → URL 매칭 및 미들웨어 체인 실행
    ↓
🔐 MIDDLEWARE (Validation/Authentication)
    → 데이터 검증 및 인증 확인
    ↓
🎮 CONTROLLER (testController)
    → HTTP 요청 처리
    → Service 호출
    ↓
💼 SERVICE (testService)
    → 비즈니스 로직 실행
    → Model 호출
    ↓
📊 MODEL (Test)
    → MongoDB와 통신
    → 데이터 CRUD
    ↓
💾 MongoDB Database
    ← 데이터 반환
    ↓
💼 SERVICE
    ← 비즈니스 로직 적용
    ↓
🎮 CONTROLLER
    ← HTTP 응답 생성
    ↓
Client Response
```

---

## 📡 API 엔드포인트

### 공개 엔드포인트 (인증 불필요)

#### 1. 전체 통계 조회

```http
GET /api/tests/statistics
```

**응답:**

```json
{
  "success": true,
  "data": {
    "total": 10,
    "pending": 3,
    "inProgress": 4,
    "completed": 3,
    "highPriority": 2
  }
}
```

#### 2. 모든 테스트 조회 (페이지네이션)

```http
GET /api/tests?page=1&limit=10
```

**응답:**

```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "_id": "675fa8b3c2d1e4f5a6b7c8d9",
        "title": "첫 번째 테스트",
        "description": "이것은 테스트 설명입니다",
        "status": "pending",
        "priority": 3,
        "createdBy": "user@example.com",
        "createdAt": "2025-12-04T10:30:00.000Z",
        "updatedAt": "2025-12-04T10:30:00.000Z"
      }
    ],
    "total": 10,
    "page": 1,
    "totalPages": 1
  }
}
```

#### 3. 상태별 테스트 조회

```http
GET /api/tests/status/:status
```

**예시:**

```http
GET /api/tests/status/pending
GET /api/tests/status/in-progress
GET /api/tests/status/completed
```

#### 4. 우선순위별 테스트 조회

```http
GET /api/tests/priority?min=4
```

**응답:** 우선순위 4 이상인 테스트들 반환

#### 5. ID로 테스트 조회

```http
GET /api/tests/:id
```

---

### 보호된 엔드포인트 (인증 필요)

모든 보호된 엔드포인트는 Authorization 헤더에 JWT 토큰이 필요합니다:

```
Authorization: Bearer <your_jwt_token>
```

#### 6. 테스트 생성

```http
POST /api/tests
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "새로운 테스트",
  "description": "이것은 테스트 설명입니다. 최소 10자 이상이어야 합니다.",
  "priority": 4,
  "status": "pending"
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "_id": "675fa8b3c2d1e4f5a6b7c8d9",
    "title": "새로운 테스트",
    "description": "이것은 테스트 설명입니다. 최소 10자 이상이어야 합니다.",
    "status": "pending",
    "priority": 4,
    "createdBy": "user@example.com",
    "createdAt": "2025-12-04T10:30:00.000Z",
    "updatedAt": "2025-12-04T10:30:00.000Z"
  },
  "message": "Test created successfully"
}
```

#### 7. 내가 만든 테스트 목록 조회

```http
GET /api/tests/my/list
Authorization: Bearer <token>
```

#### 8. 내 테스트 통계 조회

```http
GET /api/tests/my/statistics
Authorization: Bearer <token>
```

**응답:**

```json
{
  "success": true,
  "data": {
    "total": 5,
    "pending": 2,
    "inProgress": 2,
    "completed": 1
  }
}
```

#### 9. 테스트 업데이트

```http
PUT /api/tests/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "업데이트된 제목",
  "description": "업데이트된 설명입니다",
  "priority": 5,
  "status": "in-progress"
}
```

#### 10. 테스트 상태 변경

```http
PATCH /api/tests/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

**비즈니스 규칙:** 완료된 테스트는 다시 pending으로 변경할 수 없습니다.

#### 11. 테스트 삭제

```http
DELETE /api/tests/:id
Authorization: Bearer <token>
```

---

## 🔍 상세 MVC 레이어별 설명

### 📊 MODEL Layer (`src/models/Test.ts`)

**역할:**

- MongoDB 스키마 정의
- 데이터 유효성 검증
- 데이터베이스 인덱스 설정
- Static 메서드 제공

**주요 코드:**

```typescript
const TestSchema = new Schema({
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100,
  },
  status: {
    type: String,
    enum: ["pending", "in-progress", "completed"],
    default: "pending",
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
});

// Static 메서드
TestSchema.statics.findByStatus = function (status: string) {
  return this.find({ status }).sort({ priority: -1 });
};
```

### 💼 SERVICE Layer (`src/services/testService.ts`)

**역할:**

- 비즈니스 로직 처리
- 복잡한 쿼리 조합
- 데이터 변환 및 가공
- 트랜잭션 관리

**주요 메서드:**

```typescript
class TestService {
  // 테스트 생성 (중복 체크 포함)
  async createTest(data) {
    // 비즈니스 로직: 같은 사용자가 같은 제목 금지
    const existingTest = await Test.findOne({
      title: data.title,
      createdBy: data.createdBy,
    });

    if (existingTest) {
      throw new Error("You already have a test with this title");
    }

    return Test.create(data);
  }

  // 상태 변경 (비즈니스 규칙 적용)
  async changeStatus(testId, newStatus) {
    const test = await Test.findById(testId);

    // 비즈니스 규칙: completed -> pending 불가
    if (test.status === "completed" && newStatus === "pending") {
      throw new Error("Cannot change completed test back to pending");
    }

    test.status = newStatus;
    return test.save();
  }
}
```

### 🎮 CONTROLLER Layer (`src/controllers/testController.ts`)

**역할:**

- HTTP 요청/응답 처리
- 요청 데이터 추출
- Service 호출
- 응답 포맷팅
- 에러 처리

**주요 메서드:**

```typescript
class TestController {
  async createTest(req, res, next) {
    try {
      // 1. 인증 확인
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // 2. 요청 데이터 추출
      const { title, description, priority } = req.body;

      // 3. Service 호출
      const test = await testService.createTest({
        title,
        description,
        priority,
        createdBy: req.user.email,
      });

      // 4. 성공 응답
      res.status(201).json({
        success: true,
        data: test,
        message: "Test created successfully",
      });
    } catch (error) {
      // 5. 에러 처리
      if (error.message === "You already have a test with this title") {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}
```

### 🛣️ ROUTE Layer (`src/routes/tests.ts`)

**역할:**

- URL 경로 정의
- HTTP 메서드 매칭
- 미들웨어 체인 구성
- 접근 권한 설정

**주요 라우트:**

```typescript
// 공개: 누구나 조회 가능
router.get("/", testController.getAllTests);

// 보호: 인증 필요, 검증 필요
router.post(
  "/",
  authenticate, // 1. 인증 확인
  createTestValidation, // 2. 데이터 검증
  testController.createTest // 3. 컨트롤러 실행
);
```

### 🔐 MIDDLEWARE Layer

**Validation (`src/middleware/testValidation.ts`):**

```typescript
export const createTestValidation = [
  body("title").trim().notEmpty().isLength({ min: 3, max: 100 }),
  body("description").trim().isLength({ min: 10 }),
  body("priority").optional().isInt({ min: 1, max: 5 }),
  validate,
];
```

**Authentication (`src/middleware/auth.ts`):**

```typescript
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.substring(7);
  const decoded = verifyToken(token);
  req.user = decoded;
  next();
};
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 테스트 생성 전체 흐름

```
1. 클라이언트가 POST /api/tests 요청
   {
     "title": "버그 수정",
     "description": "로그인 페이지 버그 수정 필요",
     "priority": 5
   }

2. [ROUTE] URL 매칭: POST /api/tests
   → authenticate 미들웨어 실행
   → createTestValidation 미들웨어 실행

3. [MIDDLEWARE] 인증 검증
   → JWT 토큰 확인
   → req.user에 사용자 정보 저장

4. [MIDDLEWARE] 데이터 검증
   → title: 3자 이상 ✅
   → description: 10자 이상 ✅
   → priority: 1-5 사이 ✅

5. [CONTROLLER] testController.createTest 실행
   → req.body에서 데이터 추출
   → req.user.email을 createdBy로 사용

6. [SERVICE] testService.createTest 호출
   → 중복 제목 체크 (비즈니스 로직)
   → 중복 없음 확인

7. [MODEL] Test.create() 실행
   → MongoDB에 데이터 삽입
   → _id 자동 생성
   → timestamps 자동 추가

8. [SERVICE] 생성된 test 반환

9. [CONTROLLER] HTTP 201 응답 생성
   {
     "success": true,
     "data": { ... },
     "message": "Test created successfully"
   }

10. 클라이언트가 응답 받음
```

### 시나리오 2: 상태 변경 실패 (비즈니스 규칙)

```
1. 테스트 상태: completed

2. 클라이언트가 PATCH /api/tests/:id/status 요청
   { "status": "pending" }

3. [SERVICE] changeStatus에서 비즈니스 규칙 체크
   → test.status === "completed"
   → newStatus === "pending"
   → ❌ 규칙 위반 감지

4. [SERVICE] Error 발생
   "Cannot change completed test back to pending"

5. [CONTROLLER] catch 블록에서 에러 처리
   → 400 Bad Request 응답
   { "message": "Cannot change completed test back to pending" }
```

---

## 💡 학습 포인트

### 1. 관심사의 분리

- **Model**: 데이터만
- **Service**: 비즈니스 로직만
- **Controller**: HTTP 처리만
- **Route**: URL 매칭만

### 2. 재사용성

```typescript
// testService.findByStatus는 여러 곳에서 사용 가능
- Controller에서 직접 호출
- 다른 Service에서 호출
- 통계 계산에 활용
```

### 3. 유지보수성

```
비즈니스 규칙 변경 → Service만 수정
API 응답 형식 변경 → Controller만 수정
DB 스키마 변경 → Model만 수정
```

### 4. 테스트 용이성

```typescript
// 각 레이어를 독립적으로 테스트
test('createTest: 중복 제목 체크', async () => {
  const service = new TestService();
  await expect(
    service.createTest({ title: "duplicate", ... })
  ).rejects.toThrow("You already have a test with this title");
});
```

---

## 🚀 실행 방법

### 1. 서버 시작

```bash
pnpm dev
```

### 2. 테스트 생성 (Postman/curl)

```bash
# 먼저 OAuth 로그인으로 토큰 획득
curl -X POST http://localhost:5000/api/users/oauth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"kakao","providerId":"123","email":"test@test.com","name":"테스터"}'

# 받은 토큰으로 테스트 생성
curl -X POST http://localhost:5000/api/tests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "첫 번째 테스트",
    "description": "MVC 패턴 테스트입니다",
    "priority": 4
  }'

# 생성된 테스트 조회
curl http://localhost:5000/api/tests
```

### 3. 전체 통계 확인

```bash
curl http://localhost:5000/api/tests/statistics
```

---

이 **Test API**는 실제로 작동하는 완전한 MVC 패턴 예제입니다. User API와 동일한 구조로 구현되어 있어 패턴을 쉽게 이해할 수 있습니다! 🎓
