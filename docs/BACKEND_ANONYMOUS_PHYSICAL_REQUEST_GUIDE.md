# 🔓 백엔드 - 로그인 없이 실물 편지 신청 가능하도록 변경

## 📋 요구사항

- 로그인하지 않은 사용자도 URL 경로로 실물 편지를 신청할 수 있어야 함
- 중복 사용자 확인은 백엔드에서 처리 (phone 또는 sessionId 기반)
- 기존 로그인 사용자의 신청 흐름은 유지
- 버전 업그레이드 시 쉽게 적용할 수 있도록 구조화

## 🔄 변경 사항

### 1. **데이터 모델 수정 (Letter.ts)**

기존 `recipientAddresses` 구조에 익명 사용자 정보 추가:

```typescript
// 수신자 주소 인터페이스 확장
export interface IRecipientAddress {
  // 기존 필드
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
  addedAt: Date;

  // 실물 편지 신청 관련 필드
  isPhysicalRequested?: boolean;
  physicalRequestDate?: Date;
  physicalStatus?: "none" | "requested" | "approved" | "rejected" | "writing" | "sent" | "delivered";
  requestId?: string;

  // 신청자 정보 (로그인 여부 상관없이)
  requesterId?: string; // userId (로그인 사용자) 또는 sessionId (익명 사용자)
  requesterType?: "authenticated" | "anonymous"; // 신청자 타입

  // 중복 확인용
  isDuplicate?: boolean; // 중복 신청 여부
  duplicateOf?: string; // 원본 requestId (중복인 경우)

  // 기존 필드 (하위 호환성)
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}
```

### 2. **API 엔드포인트 수정**

#### **POST /api/letters/{letterId}/physical-request**

로그인 없이 신청 가능하도록 변경:

```typescript
// 요청 본문 (로그인 여부 상관없이 동일)
{
  "address": {
    "name": "string",
    "phone": "string",
    "zipCode": "string",
    "address1": "string",
    "address2": "string (optional)",
    "memo": "string (optional)"
  },
  "sessionId": "string (클라이언트에서 생성)"  // 익명 사용자 식별용
}

// 응답
{
  "success": true,
  "data": {
    "requestId": "abc123...",
    "isDuplicate": false,  // 중복 여부
    "duplicateOf": null,   // 중복인 경우 원본 requestId
    "trackingInfo": {
      "requestId": "abc123...",
      "statusCheckUrl": "/api/letters/physical-requests/abc123.../status",
      "message": "신청이 완료되었습니다."
    }
  }
}
```

#### **GET /api/letters/physical-requests/{requestId}/status**

로그인 없이 상태 조회 가능 (기존 유지):

```typescript
// 응답
{
  "success": true,
  "data": {
    "requestId": "abc123...",
    "letterId": "letter456",
    "letterTitle": "편지 제목",
    "status": "writing",
    "isDuplicate": false,
    "requesterInfo": {
      "name": "홍길동",
      "phone": "010-****-5678",  // 마스킹
      "address": "(12345) 서울시..."
    },
    "statusHistory": {
      "requested": "2025-12-30T10:00:00Z",
      "approved": "2025-12-30T14:00:00Z",
      "writing": "2025-12-31T09:00:00Z",
      "sent": null,
      "delivered": null
    },
    "createdAt": "2025-12-30T10:00:00Z"
  }
}
```

### 3. **중복 확인 로직 구현**

```typescript
// recipientLetterService.ts에 추가

/**
 * 중복 신청 확인
 * @param letterId - 편지 ID
 * @param phone - 전화번호
 * @param sessionId - 세션 ID (익명 사용자)
 * @param userId - 사용자 ID (로그인 사용자)
 */
async checkDuplicate(
  letterId: string,
  phone: string,
  sessionId?: string,
  userId?: string
): Promise<{ isDuplicate: boolean; duplicateOf?: string }> {
  console.log(`🔍 [DEBUG] Checking duplicate - letterId: ${letterId}, phone: ${phone}`);

  // 1. 같은 편지에 같은 전화번호로 신청한 기록 확인
  const existingByPhone = await Letter.findOne({
    _id: letterId,
    "recipientAddresses.phone": this.normalizePhoneNumber(phone),
    "recipientAddresses.isPhysicalRequested": true,
    "recipientAddresses.physicalStatus": { $ne: "rejected" }
  }).lean();

  if (existingByPhone) {
    const duplicate = existingByPhone.recipientAddresses.find(
      addr => addr.phone === this.normalizePhoneNumber(phone) && addr.isPhysicalRequested
    );

    console.log(`⚠️ [DEBUG] Duplicate found by phone: ${duplicate?.requestId}`);

    return {
      isDuplicate: true,
      duplicateOf: duplicate?.requestId
    };
  }

  // 2. 로그인 사용자인 경우 userId로도 확인
  if (userId) {
    const existingByUserId = await Letter.findOne({
      _id: letterId,
      "recipientAddresses.requesterId": userId,
      "recipientAddresses.requesterType": "authenticated",
      "recipientAddresses.isPhysicalRequested": true,
      "recipientAddresses.physicalStatus": { $ne: "rejected" }
    }).lean();

    if (existingByUserId) {
      const duplicate = existingByUserId.recipientAddresses.find(
        addr => addr.requesterId === userId && addr.requesterType === "authenticated"
      );

      console.log(`⚠️ [DEBUG] Duplicate found by userId: ${duplicate?.requestId}`);

      return {
        isDuplicate: true,
        duplicateOf: duplicate?.requestId
      };
    }
  }

  // 3. 익명 사용자인 경우 sessionId로도 확인
  if (sessionId) {
    const existingBySessionId = await Letter.findOne({
      _id: letterId,
      "recipientAddresses.requesterId": sessionId,
      "recipientAddresses.requesterType": "anonymous",
      "recipientAddresses.isPhysicalRequested": true,
      "recipientAddresses.physicalStatus": { $ne: "rejected" }
    }).lean();

    if (existingBySessionId) {
      const duplicate = existingBySessionId.recipientAddresses.find(
        addr => addr.requesterId === sessionId && addr.requesterType === "anonymous"
      );

      console.log(`⚠️ [DEBUG] Duplicate found by sessionId: ${duplicate?.requestId}`);

      return {
        isDuplicate: true,
        duplicateOf: duplicate?.requestId
      };
    }
  }

  console.log(`✅ [DEBUG] No duplicate found`);

  return {
    isDuplicate: false
  };
}
```

### 4. **신청 처리 로직 수정**

```typescript
// recipientLetterService.ts의 requestPhysicalLetter 메서드 수정

async requestPhysicalLetter(
  letterId: string,
  sessionId: string,
  userAgent: string,
  ipAddress: string,
  requestData: IPhysicalRequestData,
  userId?: string  // 로그인 사용자 ID (선택사항)
): Promise<IPhysicalRequestResult> {
  console.log(`🔍 [DEBUG] Physical letter request for letterId: ${letterId}`);
  console.log(`📋 [DEBUG] Request data:`, requestData);
  console.log(`🔑 [DEBUG] Session ID: ${sessionId}, User ID: ${userId}`);

  // 입력 데이터 검증
  if (!requestData) {
    throw new Error("요청 데이터가 없습니다.");
  }

  const addressData = (requestData as any).address || requestData;
  const { name, phone, zipCode, address1, address2, memo } = addressData;

  // 필수 필드 검증
  if (!name || typeof name !== "string") {
    throw new Error("받는 분 성함은 필수입니다.");
  }
  if (!phone || typeof phone !== "string") {
    throw new Error("전화번호는 필수입니다.");
  }
  if (!zipCode || typeof zipCode !== "string") {
    throw new Error("우편번호는 필수입니다.");
  }
  if (!address1 || typeof address1 !== "string") {
    throw new Error("주소는 필수입니다.");
  }

  // ObjectId 유효성 검사
  if (!mongoose.Types.ObjectId.isValid(letterId)) {
    throw new Error("올바르지 않은 편지 ID입니다.");
  }

  // 편지 존재 여부 확인
  const letter = await Letter.findById(letterId);
  if (!letter) {
    throw new Error("편지를 찾을 수 없습니다.");
  }

  // 중복 확인
  const { isDuplicate, duplicateOf } = await this.checkDuplicate(
    letterId,
    phone,
    sessionId,
    userId
  );

  if (isDuplicate) {
    console.log(`⚠️ [DEBUG] Duplicate request detected: ${duplicateOf}`);

    // 중복 신청이지만 요청 ID는 반환 (사용자가 상태 조회 가능하도록)
    return {
      requestId: duplicateOf!,
      letterId: letter._id.toString(),
      recipientInfo: {
        name: name.trim(),
        phone: this.normalizePhoneNumber(phone),
        zipCode: zipCode.trim(),
        address1: address1.trim(),
        address2: address2?.trim() || "",
        memo: memo?.trim() || "",
        addedAt: new Date(),
        isPhysicalRequested: true,
        physicalRequestDate: new Date(),
        physicalStatus: "requested",
        sessionId,
        userAgent,
        ipAddress: this.hashIP(ipAddress),
        requestId: duplicateOf!,
        isDuplicate: true,
        duplicateOf
      } as any,
      needsApproval: !letter.authorSettings.autoApprove,
      status: "requested",
      isDuplicate: true,
      duplicateOf
    };
  }

  // 고유 요청 ID 생성
  const requestId = this.generateUniqueId();

  // 신청자 타입 결정
  const requesterType = userId ? "authenticated" : "anonymous";
  const requesterId = userId || sessionId;

  // 새로운 수신자 주소 및 실물 편지 신청 정보 생성
  const newRecipientAddress: Partial<IRecipientAddress> = {
    name: name.trim(),
    phone: this.normalizePhoneNumber(phone),
    zipCode: zipCode.trim(),
    address1: address1.trim(),
    address2: address2?.trim() || "",
    memo: memo?.trim() || "",
    addedAt: new Date(),
    // 실물 편지 신청 정보
    isPhysicalRequested: true,
    physicalRequestDate: new Date(),
    physicalStatus: letter.authorSettings.autoApprove ? "approved" : "requested",
    sessionId,
    userAgent,
    ipAddress: this.hashIP(ipAddress),
    requestId,
    // 신청자 정보
    requesterId,
    requesterType: requesterType as any,
    isDuplicate: false
  };

  // Letter에 수신자 주소 추가
  letter.recipientAddresses.push(newRecipientAddress as any);

  // 통계 업데이트
  letter.physicalLetterStats.totalRequests += 1;
  if (letter.authorSettings.autoApprove) {
    letter.physicalLetterStats.approvedRequests += 1;
  } else {
    letter.physicalLetterStats.pendingRequests += 1;
  }

  await letter.save();

  console.log(`✅ [DEBUG] Physical letter request saved with ID: ${requestId}`);

  return {
    requestId,
    letterId: letter._id.toString(),
    recipientInfo: newRecipientAddress as IRecipientAddress,
    needsApproval: !letter.authorSettings.autoApprove,
    status: newRecipientAddress.physicalStatus!,
    isDuplicate: false
  };
}
```

### 5. **라우트 수정 (letters.ts)**

```typescript
/**
 * @route   POST /api/letters/:letterId/physical-request
 * @desc    실물 편지 신청 (로그인 없이 가능)
 * @access  Public
 */
router.post("/:letterId/physical-request", physicalLetterRequestValidation, recipientLetterController.requestPhysicalLetter);

/**
 * @route   GET /api/letters/physical-requests/:requestId/status
 * @desc    개별 신청 상태 조회 (로그인 없이 가능)
 * @access  Public
 */
router.get("/physical-requests/:requestId/status", recipientLetterController.getRequestStatusByRequestId);
```

### 6. **컨트롤러 수정 (recipientLetterController.ts)**

```typescript
/**
 * 실물 편지 신청 (로그인 없이 가능)
 * POST /api/letters/:letterId/physical-request
 */
async requestPhysicalLetter(req: Request, res: Response): Promise<void> {
  try {
    const { letterId } = req.params;
    const requestData: IPhysicalRequestData = req.body;

    console.log(`🔍 [DEBUG] Physical letter request for letterId: ${letterId}`);
    console.log(`📋 [DEBUG] Request data:`, requestData);

    // 세션 ID 생성 또는 가져오기
    let sessionId = (req.session as any)?.id;
    if (!sessionId) {
      sessionId = recipientLetterService.generateSessionId();
      if (req.session) {
        (req.session as any).id = sessionId;
      }
    }

    console.log(`🔑 [DEBUG] Session ID: ${sessionId}`);

    // 요청자 정보 수집
    const userAgent = req.get("User-Agent") || "";
    const ipAddress = req.ip || req.connection.remoteAddress || "";

    // 로그인 사용자 ID (있으면)
    const userId = (req as any).user?.userId;

    const result = await recipientLetterService.requestPhysicalLetter(
      letterId,
      sessionId,
      userAgent,
      ipAddress,
      requestData,
      userId  // 로그인 사용자 ID 전달
    );

    console.log(`✅ [DEBUG] Physical letter request result:`, result);

    // 중복 신청인 경우 다른 메시지
    const message = result.isDuplicate
      ? "이미 이 편지에 대해 신청하셨습니다. 기존 신청 상태를 확인해주세요."
      : result.needsApproval
      ? "실물 편지 신청이 완료되었습니다. 편지 작성자의 승인을 기다려주세요."
      : "실물 편지 신청이 자동 승인되었습니다.";

    res.status(201).json({
      success: true,
      message,
      data: {
        ...result,
        trackingInfo: {
          requestId: result.requestId,
          statusCheckUrl: `/api/letters/physical-requests/${result.requestId}/status`,
          message: "이 요청 ID로 언제든지 배송 상태를 확인할 수 있습니다."
        }
      }
    });
  } catch (error: any) {
    console.error("❌ [DEBUG] 실물 편지 신청 실패:", error);
    res.status(400).json({
      success: false,
      error: error.message || "실물 편지 신청에 실패했습니다."
    });
  }
}
```

## 🔒 보안 고려사항

### 1. **Rate Limiting**

```typescript
// 미들웨어에서 IP 기반 Rate Limiting 적용
import rateLimit from "express-rate-limit";

const physicalRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // IP당 15분에 5개 요청만 허용
  message: "너무 많은 신청을 했습니다. 나중에 다시 시도해주세요.",
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/:letterId/physical-request", physicalRequestLimiter, ...);
```

### 2. **입력값 검증 및 Sanitization**

```typescript
// 전화번호 정규화 및 검증
private normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");

  // 한국 전화번호 형식 검증
  if (!/^01[0-9]\d{7,8}$/.test(cleaned)) {
    throw new Error("올바른 휴대폰 번호 형식이 아닙니다.");
  }

  return cleaned.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
}

// 주소 검증
private validateAddress(address: string): void {
  if (address.length < 5 || address.length > 200) {
    throw new Error("주소는 5자 이상 200자 이하여야 합니다.");
  }

  // XSS 방지
  if (/<|>|script|iframe/.test(address)) {
    throw new Error("유효하지 않은 주소입니다.");
  }
}
```

### 3. **개인정보 보호**

```typescript
// 상태 조회 시 전화번호 마스킹
private maskPhoneNumber(phone: string): string {
  // 010-1234-5678 → 010-****-5678
  return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, "$1-****-$4");
}

// 응답에서 민감한 정보 제거
const safeResponse = {
  ...request,
  requesterInfo: {
    name: request.requesterInfo.name,
    phone: this.maskPhoneNumber(request.requesterInfo.phone),
    address: request.requesterInfo.address
  }
};
```

## 📊 버전 업그레이드 시 적용 방법

### **체크리스트**

- [ ] 데이터 모델 마이그레이션 (기존 데이터 호환성 확인)
- [ ] 중복 확인 로직 업데이트 필요시
- [ ] API 엔드포인트 버전 관리 (v1, v2 등)
- [ ] Rate Limiting 설정 조정
- [ ] 테스트 케이스 작성 및 실행
- [ ] 환경 변수 업데이트

### **환경 변수**

```bash
# .env
API_VERSION=v1
DUPLICATE_CHECK_METHOD=phone  # phone, userId, sessionId
RATE_LIMIT_WINDOW_MS=900000   # 15분
RATE_LIMIT_MAX_REQUESTS=5
PHONE_MASKING_ENABLED=true
```

## 🧪 테스트 시나리오

### **1. 익명 사용자 신청**

```bash
POST /api/letters/695332c77db1b33af1bdab2b/physical-request
Body: {
  "address": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "zipCode": "12345",
    "address1": "서울시 강남구",
    "address2": "테헤란로 123",
    "memo": "빠른 배송 부탁드립니다"
  },
  "sessionId": "abc123xyz"
}

Response: {
  "success": true,
  "data": {
    "requestId": "req_abc123",
    "isDuplicate": false,
    "trackingInfo": {...}
  }
}
```

### **2. 중복 신청 감지**

```bash
# 같은 전화번호로 다시 신청
POST /api/letters/695332c77db1b33af1bdab2b/physical-request
Body: {
  "address": {
    "name": "홍길동",
    "phone": "010-1234-5678",  # 같은 번호
    ...
  }
}

Response: {
  "success": true,
  "data": {
    "requestId": "req_abc123",  # 기존 요청 ID 반환
    "isDuplicate": true,
    "duplicateOf": "req_abc123"
  }
}
```

### **3. 상태 조회**

```bash
GET /api/letters/physical-requests/req_abc123/status

Response: {
  "success": true,
  "data": {
    "requestId": "req_abc123",
    "status": "writing",
    "requesterInfo": {
      "name": "홍길동",
      "phone": "010-****-5678",  # 마스킹됨
      "address": "(12345) 서울시 강남구 테헤란로 123"
    }
  }
}
```

이 구조로 구현하면 프론트엔드의 로그인 없는 신청 방식과 완벽하게 연동되며, 버전 업그레이드 시에도 쉽게 적용할 수 있습니다! 🚀
