# 🚀 프론트엔드 실물 편지 추적 시스템 업데이트

## 📋 변경 사항 요약

기존 **세션 기반 추적**에서 **RequestId 기반 추적**으로 변경되어 더 안정적이고 사용자 친화적인 시스템이 되었습니다.

## 🔄 주요 변경점

### 1. **실물 편지 신청 응답 구조 변경**

**기존 응답:**

```json
{
  "success": true,
  "message": "실물 편지 신청이 완료되었습니다.",
  "data": {
    "requestId": "abc123...",
    "letterId": "letter123",
    "needsApproval": true,
    "status": "requested"
  }
}
```

**새로운 응답:**

```json
{
  "success": true,
  "message": "실물 편지 신청이 완료되었습니다. 편지 작성자의 승인을 기다려주세요.",
  "data": {
    "requestId": "abc123...",
    "letterId": "letter123",
    "needsApproval": true,
    "status": "requested",
    "trackingInfo": {
      "requestId": "abc123...",
      "statusCheckUrl": "/api/letters/physical-requests/abc123.../status",
      "message": "이 요청 ID로 언제든지 배송 상태를 확인할 수 있습니다."
    }
  }
}
```

### 2. **상태 조회 API 변경**

**기존 (세션 기반):**

```javascript
// ❌ 세션에 의존하여 불안정
GET / api / letters / { letterId } / physical - status / user;
```

**새로운 (RequestId 기반):**

```javascript
// ✅ RequestId로 안정적 추적
GET / api / letters / physical - requests / { requestId } / status;
```

## 🎯 프론트엔드 구현 요구사항

### 1. **실물 편지 신청 처리 업데이트**

```javascript
// 실물 편지 신청 함수 업데이트
const requestPhysicalLetter = async (letterId, addressData) => {
  try {
    const response = await fetch(`/api/letters/${letterId}/physical-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: addressData }),
    });

    const result = await response.json();

    if (result.success) {
      // 🔑 중요: requestId를 로컬 스토리지에 저장
      const requestId = result.data.trackingInfo.requestId;
      localStorage.setItem(`physicalRequest_${letterId}`, requestId);

      // 사용자에게 추적 정보 제공
      showTrackingInfo(result.data.trackingInfo);

      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("실물 편지 신청 실패:", error);
    throw error;
  }
};

// 추적 정보 표시 함수
const showTrackingInfo = (trackingInfo) => {
  // UI에 추적 정보 표시
  alert(`신청이 완료되었습니다!\n추적 ID: ${trackingInfo.requestId}\n\n${trackingInfo.message}`);

  // 또는 모달/토스트로 표시
  showModal({
    title: "실물 편지 신청 완료",
    content: `
      <p>신청이 성공적으로 완료되었습니다!</p>
      <p><strong>추적 ID:</strong> ${trackingInfo.requestId}</p>
      <p>이 ID로 언제든지 배송 상태를 확인할 수 있습니다.</p>
    `,
    buttons: [
      { text: "확인", action: "close" },
      { text: "상태 확인", action: () => checkDeliveryStatus(trackingInfo.requestId) },
    ],
  });
};
```

### 2. **배송 상태 조회 시스템 구현**

```javascript
// 새로운 배송 상태 조회 함수
const checkDeliveryStatus = async (requestId) => {
  try {
    const response = await fetch(`/api/letters/physical-requests/${requestId}/status`);
    const result = await response.json();

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("배송 상태 조회 실패:", error);
    throw error;
  }
};

// 편지별 저장된 requestId로 상태 조회
const checkLetterDeliveryStatus = async (letterId) => {
  const requestId = localStorage.getItem(`physicalRequest_${letterId}`);

  if (!requestId) {
    throw new Error("이 편지에 대한 실물 편지 신청 내역이 없습니다.");
  }

  return await checkDeliveryStatus(requestId);
};
```

### 3. **상태 조회 응답 데이터 구조**

```typescript
interface DeliveryStatusResponse {
  requestId: string;
  letterId: string;
  letterTitle: string;
  letterAuthor: string;
  status: "requested" | "approved" | "rejected" | "writing" | "sent" | "delivered";
  requestedAt: string;
  recipientInfo: {
    name: string;
    phone: string;
    address: string;
  };
  statusHistory: {
    requested: string;
    approved: string | null;
    writing: string | null;
    sent: string | null;
    delivered: string | null;
  };
  trackingInfo: {
    canTrack: boolean;
    estimatedDelivery: string | null; // YYYY-MM-DD 형식
  };
}
```

### 4. **UI 컴포넌트 업데이트**

```javascript
// 배송 상태 표시 컴포넌트
const DeliveryStatusComponent = ({ letterId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const statusData = await checkLetterDeliveryStatus(letterId);
      setStatus(statusData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [letterId]);

  if (loading) return <div>배송 상태 확인 중...</div>;
  if (error) return <div className="error">❌ {error}</div>;
  if (!status) return null;

  return (
    <div className="delivery-status">
      <h3>📦 실물 편지 배송 상태</h3>

      {/* 상태 진행바 */}
      <div className="status-progress">
        <div className={`step ${status.statusHistory.requested ? "completed" : ""}`}>신청완료</div>
        <div className={`step ${status.statusHistory.approved ? "completed" : ""}`}>승인완료</div>
        <div className={`step ${status.statusHistory.writing ? "completed" : ""}`}>작성중</div>
        <div className={`step ${status.statusHistory.sent ? "completed" : ""}`}>발송완료</div>
        <div className={`step ${status.statusHistory.delivered ? "completed" : ""}`}>배송완료</div>
      </div>

      {/* 현재 상태 */}
      <div className="current-status">
        <p>
          <strong>현재 상태:</strong> {getStatusText(status.status)}
        </p>
        <p>
          <strong>수신자:</strong> {status.recipientInfo.name}
        </p>
        <p>
          <strong>주소:</strong> {status.recipientInfo.address}
        </p>

        {status.trackingInfo.estimatedDelivery && (
          <p>
            <strong>예상 배송일:</strong> {status.trackingInfo.estimatedDelivery}
          </p>
        )}
      </div>

      {/* 추적 ID */}
      <div className="tracking-id">
        <p>
          <strong>추적 ID:</strong> {status.requestId}
        </p>
        <button onClick={() => copyToClipboard(status.requestId)}>📋 복사</button>
      </div>
    </div>
  );
};

// 상태 텍스트 변환 함수
const getStatusText = (status) => {
  const statusMap = {
    requested: "승인 대기중",
    approved: "승인 완료",
    rejected: "승인 거절",
    writing: "편지 작성중",
    sent: "발송 완료",
    delivered: "배송 완료",
  };
  return statusMap[status] || status;
};
```

### 5. **편지 상세 페이지 통합**

```javascript
// 편지 상세 페이지에서 실물 편지 섹션
const LetterDetailPage = ({ letterId }) => {
  const [hasPhysicalRequest, setHasPhysicalRequest] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에서 해당 편지의 실물 편지 신청 여부 확인
    const requestId = localStorage.getItem(`physicalRequest_${letterId}`);
    setHasPhysicalRequest(!!requestId);
  }, [letterId]);

  return (
    <div className="letter-detail">
      {/* 기존 편지 내용 */}
      <div className="letter-content">{/* ... 편지 내용 ... */}</div>

      {/* 실물 편지 섹션 */}
      <div className="physical-letter-section">
        {hasPhysicalRequest ? (
          // 이미 신청한 경우 - 상태 조회
          <DeliveryStatusComponent letterId={letterId} />
        ) : (
          // 아직 신청하지 않은 경우 - 신청 버튼
          <PhysicalLetterRequestForm letterId={letterId} />
        )}
      </div>
    </div>
  );
};
```

### 6. **에러 처리 개선**

```javascript
// 에러 처리 함수
const handleApiError = (error, response) => {
  switch (response?.code) {
    case "REQUEST_NOT_FOUND":
      return "신청을 찾을 수 없습니다. 추적 ID를 확인해주세요.";
    case "LETTER_NOT_FOUND":
      return "편지를 찾을 수 없습니다.";
    case "NO_PHYSICAL_REQUESTS":
      return "이 편지에 대한 실물 편지 신청 내역이 없습니다.";
    default:
      return error.message || "알 수 없는 오류가 발생했습니다.";
  }
};
```

## 🎯 구현 체크리스트

### ✅ 필수 구현 사항

- [ ] 실물 편지 신청 시 requestId 로컬 스토리지 저장
- [ ] 새로운 상태 조회 API 연동
- [ ] 배송 상태 표시 UI 컴포넌트
- [ ] 상태 진행바/타임라인 UI
- [ ] 추적 ID 복사 기능
- [ ] 에러 처리 개선

### ✅ 선택적 구현 사항

- [ ] 상태 변경 알림 (푸시/이메일)
- [ ] 배송 예상일 캘린더 표시
- [ ] 상태 히스토리 상세 보기
- [ ] QR 코드로 추적 ID 공유
- [ ] 다중 신청 관리 (한 편지에 여러 주소)

## 🚀 마이그레이션 가이드

### 1단계: 기존 세션 기반 코드 식별

```javascript
// 기존 코드에서 이런 패턴 찾기
fetch(`/api/letters/${letterId}/physical-status/user`);
```

### 2단계: 새로운 RequestId 기반으로 교체

```javascript
// 새로운 코드로 교체
const requestId = localStorage.getItem(`physicalRequest_${letterId}`);
fetch(`/api/letters/physical-requests/${requestId}/status`);
```

### 3단계: 로컬 스토리지 관리 추가

```javascript
// 신청 시 저장
localStorage.setItem(`physicalRequest_${letterId}`, requestId);

// 조회 시 사용
const requestId = localStorage.getItem(`physicalRequest_${letterId}`);
```

이제 세션에 의존하지 않는 안정적인 실물 편지 추적 시스템을 구현할 수 있습니다! 🎉
