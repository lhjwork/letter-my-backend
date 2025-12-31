# 🎯 Frontend - Anonymous Physical Letter Request Integration Guide

## 📋 Overview

Users can now request physical letters without logging in. The frontend needs to:

1. Generate and store a sessionId
2. Submit requests with the sessionId
3. Track status using requestId

## 🔧 Implementation Steps

### 1. Generate and Store SessionId

```typescript
// utils/sessionManager.ts
export const getOrCreateSessionId = (): string => {
  const STORAGE_KEY = "physicalLetterSessionId";

  let sessionId = localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    // Generate new sessionId
    sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
};
```

### 2. Submit Physical Letter Request

```typescript
// services/physicalLetterService.ts
interface PhysicalLetterRequest {
  address: {
    name: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  };
  sessionId: string;
}

export const requestPhysicalLetter = async (letterId: string, requestData: PhysicalLetterRequest): Promise<any> => {
  const response = await fetch(`/api/letters/${letterId}/physical-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "신청에 실패했습니다.");
  }

  return response.json();
};
```

### 3. Check Request Status

```typescript
// services/physicalLetterService.ts

// Option 1: By requestId only (recommended for tracking)
export const getPhysicalRequestStatus = async (requestId: string): Promise<any> => {
  const response = await fetch(`/api/letters/physical-requests/${requestId}/status`);

  if (!response.ok) {
    throw new Error("상태 조회에 실패했습니다.");
  }

  return response.json();
};

// Option 2: By letterId + requestId
export const getPhysicalRequestStatusByLetter = async (letterId: string, requestId: string): Promise<any> => {
  const response = await fetch(`/api/letters/${letterId}/physical-request/${requestId}`);

  if (!response.ok) {
    throw new Error("상태 조회에 실패했습니다.");
  }

  return response.json();
};

// Option 3: By letterId + sessionId (session-based)
export const getPhysicalStatusForUser = async (letterId: string, sessionId: string): Promise<any> => {
  const response = await fetch(`/api/letters/${letterId}/physical-status/user`, {
    headers: {
      "X-Session-Id": sessionId,
    },
  });

  if (!response.ok) {
    throw new Error("상태 조회에 실패했습니다.");
  }

  return response.json();
};
```

### 4. Handle Request Submission

```typescript
// components/PhysicalLetterRequestForm.tsx
import { getOrCreateSessionId } from "@/utils/sessionManager";
import { requestPhysicalLetter } from "@/services/physicalLetterService";

export const PhysicalLetterRequestForm = ({ letterId }: { letterId: string }) => {
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const sessionId = getOrCreateSessionId();

      const response = await requestPhysicalLetter(letterId, {
        address: {
          name: formData.name,
          phone: formData.phone,
          zipCode: formData.zipCode,
          address1: formData.address1,
          address2: formData.address2,
          memo: formData.memo,
        },
        sessionId,
      });

      if (response.success) {
        const { requestId, isDuplicate } = response.data;
        setRequestId(requestId);
        setIsDuplicate(isDuplicate);

        // Store requestId for later tracking
        localStorage.setItem(`physicalRequest_${letterId}`, requestId);

        if (isDuplicate) {
          alert("이미 이 편지에 대해 신청하셨습니다. 기존 신청 상태를 확인해주세요.");
        } else {
          alert("신청이 완료되었습니다!");
        }
      }
    } catch (error: any) {
      alert(error.message || "신청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit({
        name: e.currentTarget.name.value,
        phone: e.currentTarget.phone.value,
        zipCode: e.currentTarget.zipCode.value,
        address1: e.currentTarget.address1.value,
        address2: e.currentTarget.address2.value,
        memo: e.currentTarget.memo.value,
      });
    }}>
      {/* Form fields */}
      <input name="name" placeholder="받는 분 성함" required />
      <input name="phone" placeholder="010-1234-5678" required />
      <input name="zipCode" placeholder="12345" required />
      <input name="address1" placeholder="주소" required />
      <input name="address2" placeholder="상세주소 (선택)" />
      <textarea name="memo" placeholder="메모 (선택)" />
      <button type="submit" disabled={loading}>
        {loading ? "신청 중..." : "신청하기"}
      </button>
    </form>
  );
};
```

### 5. Display Status in Letter Detail

```typescript
// components/LetterDetail.tsx
import { getPhysicalRequestStatus } from "@/services/physicalLetterService";

export const LetterDetail = ({ letterId }: { letterId: string }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const requestId = localStorage.getItem(`physicalRequest_${letterId}`);
        if (!requestId) return;

        setLoading(true);
        const response = await getPhysicalRequestStatus(requestId);
        if (response.success) {
          setStatus(response.data);
        }
      } catch (error) {
        console.error("상태 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
    // Poll every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [letterId]);

  if (!status) return null;

  return (
    <div className="physical-status">
      <h3>실물 편지 상태</h3>
      <div className="status-badge">{status.data.letterTitle}</div>
      <div className="status-info">
        <p>상태: {status.data.status}</p>
        <p>신청일: {new Date(status.data.requestedAt).toLocaleDateString()}</p>
        {status.data.trackingInfo?.estimatedDelivery && (
          <p>예상 배송일: {status.data.trackingInfo.estimatedDelivery}</p>
        )}
      </div>
    </div>
  );
};
```

### 6. Status Tracking Page

```typescript
// pages/PhysicalLetterTracking.tsx
export const PhysicalLetterTracking = () => {
  const [requestId, setRequestId] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!requestId.trim()) {
      setError("요청 ID를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getPhysicalRequestStatus(requestId);
      if (response.success) {
        setStatus(response.data);
      }
    } catch (err: any) {
      setError(err.message || "상태 조회에 실패했습니다.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tracking-page">
      <h1>실물 편지 배송 추적</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="요청 ID 입력"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "조회 중..." : "조회"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {status && (
        <div className="status-details">
          <h2>{status.data.letterTitle}</h2>
          <p>작성자: {status.data.letterAuthor}</p>

          <div className="timeline">
            <div className={`step ${status.data.statusHistory.requested ? "completed" : ""}`}>
              <span>신청</span>
              <time>{new Date(status.data.statusHistory.requested).toLocaleDateString()}</time>
            </div>

            <div className={`step ${status.data.statusHistory.approved ? "completed" : ""}`}>
              <span>승인</span>
              {status.data.statusHistory.approved && (
                <time>{new Date(status.data.statusHistory.approved).toLocaleDateString()}</time>
              )}
            </div>

            <div className={`step ${status.data.statusHistory.writing ? "completed" : ""}`}>
              <span>작성 중</span>
              {status.data.statusHistory.writing && (
                <time>{new Date(status.data.statusHistory.writing).toLocaleDateString()}</time>
              )}
            </div>

            <div className={`step ${status.data.statusHistory.sent ? "completed" : ""}`}>
              <span>발송</span>
              {status.data.statusHistory.sent && (
                <time>{new Date(status.data.statusHistory.sent).toLocaleDateString()}</time>
              )}
            </div>

            <div className={`step ${status.data.statusHistory.delivered ? "completed" : ""}`}>
              <span>배송 완료</span>
              {status.data.statusHistory.delivered && (
                <time>{new Date(status.data.statusHistory.delivered).toLocaleDateString()}</time>
              )}
            </div>
          </div>

          <div className="recipient-info">
            <h3>수신자 정보</h3>
            <p>이름: {status.data.recipientInfo.name}</p>
            <p>주소: {status.data.recipientInfo.address}</p>
          </div>
        </div>
      )}
    </div>
  );
};
```

## 📊 Response Examples

### Successful Request Submission

```json
{
  "success": true,
  "message": "실물 편지 신청이 완료되었습니다. 편지 작성자의 승인을 기다려주세요.",
  "data": {
    "requestId": "abc123xyz",
    "letterId": "letter456",
    "isDuplicate": false,
    "needsApproval": true,
    "status": "requested",
    "trackingInfo": {
      "requestId": "abc123xyz",
      "statusCheckUrl": "/api/letters/physical-requests/abc123xyz/status",
      "message": "이 요청 ID로 언제든지 배송 상태를 확인할 수 있습니다."
    }
  }
}
```

### Duplicate Request

```json
{
  "success": true,
  "message": "이미 이 편지에 대해 신청하셨습니다. 기존 신청 상태를 확인해주세요.",
  "data": {
    "requestId": "abc123xyz",
    "isDuplicate": true,
    "duplicateOf": "abc123xyz",
    "trackingInfo": {
      "requestId": "abc123xyz",
      "statusCheckUrl": "/api/letters/physical-requests/abc123xyz/status"
    }
  }
}
```

### Status Check Response

```json
{
  "success": true,
  "data": {
    "requestId": "abc123xyz",
    "letterId": "letter456",
    "letterTitle": "편지 제목",
    "letterAuthor": "작성자명",
    "status": "writing",
    "requestedAt": "2025-12-30T10:00:00Z",
    "recipientInfo": {
      "name": "홍길동",
      "phone": "010-1234-5678",
      "address": "(12345) 서울시 강남구 테헤란로 123"
    },
    "statusHistory": {
      "requested": "2025-12-30T10:00:00Z",
      "approved": "2025-12-30T14:00:00Z",
      "writing": "2025-12-31T09:00:00Z",
      "sent": null,
      "delivered": null
    },
    "trackingInfo": {
      "canTrack": true,
      "estimatedDelivery": "2026-01-03"
    }
  }
}
```

## ⚠️ Error Handling

```typescript
// Common error scenarios
const handlePhysicalLetterError = (error: any) => {
  if (error.code === "REQUEST_NOT_FOUND") {
    return "요청을 찾을 수 없습니다. 요청 ID를 확인해주세요.";
  }

  if (error.code === "LETTER_NOT_FOUND") {
    return "편지를 찾을 수 없습니다.";
  }

  if (error.code === "NO_PHYSICAL_REQUESTS") {
    return "이 편지에 대한 신청 내역이 없습니다.";
  }

  if (error.code === "AUTHENTICATION_REQUIRED") {
    return "로그인이 필요합니다.";
  }

  return error.message || "오류가 발생했습니다.";
};
```

## 🔐 Security Notes

- SessionId is stored in localStorage and persists across sessions
- Phone numbers are masked in responses (010-\*\*\*\*-5678)
- Duplicate detection prevents abuse
- Rate limiting is applied on the backend (5 requests per 15 minutes per IP)

## 📱 Mobile Considerations

- Ensure form is mobile-friendly
- Phone number input should use tel type
- Status tracking should work offline (cache requestId)
- Consider push notifications for status updates

---

**Status**: ✅ Ready for Implementation
