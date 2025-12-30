# 🔧 Admin 프론트엔드 API 수정 가이드

## 🚨 문제 상황

현재 Admin 프론트엔드에서 호출하는 API 엔드포인트가 존재하지 않아 404 에러가 발생하고 있습니다.

**요청 중인 API (존재하지 않음):**

```
GET /api/admin/physical-letters/dashboard?range=7d
```

**에러 응답:**

```json
{
  "success": false,
  "error": {
    "message": "Route not found"
  }
}
```

## 🎯 해결 방법: 기존 API 사용

백엔드에 이미 구현된 API를 사용하도록 프론트엔드를 수정해야 합니다.

### ✅ 사용 가능한 Admin API 목록

```javascript
// 1. 실물 편지 요청 목록 조회
GET /api/admin/physical-requests

// 2. 실물 편지 상태 업데이트
PATCH /api/admin/physical-requests/:letterId

// 3. 일반 대시보드 (기본 통계)
GET /api/admin/dashboard

// 4. 편지 목록 (실물 편지 포함)
GET /api/admin/letters

// 5. 사용자 목록
GET /api/admin/users
```

## 🔄 프론트엔드 수정 요청사항

### 1. **대시보드 API 변경**

**기존 코드 (수정 필요):**

```javascript
// ❌ 존재하지 않는 API
const response = await fetch("/api/admin/physical-letters/dashboard?range=7d");
```

**수정된 코드:**

```javascript
// ✅ 기존 API 사용
const response = await fetch("/api/admin/physical-requests");
```

### 2. **API 응답 구조 확인**

**`/api/admin/physical-requests` 응답 구조:**

```json
{
  "success": true,
  "data": [
    {
      "letterId": "편지ID",
      "letterTitle": "편지 제목",
      "authorName": "작성자명",
      "requestId": "요청ID",
      "recipientName": "수신자명",
      "recipientPhone": "전화번호",
      "fullAddress": "(12345) 서울시 강남구...",
      "status": "requested",
      "requestedAt": "2025-12-30T10:00:00Z",
      "memo": "메모"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 3. **대시보드 통계 생성**

프론트엔드에서 받은 데이터로 통계를 계산하세요:

```javascript
// 대시보드 통계 계산 함수
const calculateDashboardStats = (physicalRequests) => {
  const stats = {
    totalRequests: physicalRequests.length,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    writingRequests: 0,
    sentRequests: 0,
    deliveredRequests: 0,
  };

  physicalRequests.forEach((request) => {
    switch (request.status) {
      case "requested":
        stats.pendingRequests++;
        break;
      case "approved":
        stats.approvedRequests++;
        break;
      case "rejected":
        stats.rejectedRequests++;
        break;
      case "writing":
        stats.writingRequests++;
        break;
      case "sent":
        stats.sentRequests++;
        break;
      case "delivered":
        stats.deliveredRequests++;
        break;
    }
  });

  return stats;
};

// 사용 예시
const fetchDashboardData = async () => {
  try {
    const response = await fetch("/api/admin/physical-requests");
    const result = await response.json();

    if (result.success) {
      const stats = calculateDashboardStats(result.data);
      setDashboardStats(stats);
    }
  } catch (error) {
    console.error("대시보드 데이터 로딩 실패:", error);
  }
};
```

### 4. **날짜 범위 필터링**

기존 `?range=7d` 파라미터 대신 프론트엔드에서 필터링:

```javascript
// 날짜 범위 필터링 함수
const filterByDateRange = (requests, range) => {
  const now = new Date();
  let startDate;

  switch (range) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      return requests; // 전체 기간
  }

  return requests.filter((request) => new Date(request.requestedAt) >= startDate);
};

// 사용 예시
const fetchDashboardData = async (range = "7d") => {
  try {
    const response = await fetch("/api/admin/physical-requests");
    const result = await response.json();

    if (result.success) {
      const filteredRequests = filterByDateRange(result.data, range);
      const stats = calculateDashboardStats(filteredRequests);
      setDashboardStats(stats);
      setRequestsList(filteredRequests);
    }
  } catch (error) {
    console.error("대시보드 데이터 로딩 실패:", error);
  }
};
```

### 5. **페이지네이션 처리**

```javascript
// 페이지네이션과 함께 데이터 로드
const fetchDashboardData = async (page = 1, limit = 100, range = "7d") => {
  try {
    const response = await fetch(`/api/admin/physical-requests?page=${page}&limit=${limit}`);
    const result = await response.json();

    if (result.success) {
      const filteredRequests = filterByDateRange(result.data, range);
      const stats = calculateDashboardStats(filteredRequests);

      return {
        stats,
        requests: filteredRequests,
        pagination: result.pagination,
      };
    }
  } catch (error) {
    console.error("대시보드 데이터 로딩 실패:", error);
    throw error;
  }
};
```

## 🎨 UI 컴포넌트 수정 예시

```javascript
// React 컴포넌트 예시
const PhysicalLetterDashboard = () => {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardData(1, 100, dateRange);
      setStats(data.stats);
      setRequests(data.requests);
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div className="dashboard">
      {/* 날짜 범위 선택 */}
      <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
        <option value="7d">최근 7일</option>
        <option value="30d">최근 30일</option>
        <option value="90d">최근 90일</option>
        <option value="all">전체 기간</option>
      </select>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>전체 신청</h3>
          <p>{stats?.totalRequests || 0}</p>
        </div>
        <div className="stat-card">
          <h3>승인 대기</h3>
          <p>{stats?.pendingRequests || 0}</p>
        </div>
        <div className="stat-card">
          <h3>작성 중</h3>
          <p>{stats?.writingRequests || 0}</p>
        </div>
        <div className="stat-card">
          <h3>발송 완료</h3>
          <p>{stats?.sentRequests || 0}</p>
        </div>
      </div>

      {/* 요청 목록 */}
      <div className="requests-list">
        {requests.map((request) => (
          <div key={request.requestId} className="request-item">
            <h4>{request.letterTitle}</h4>
            <p>수신자: {request.recipientName}</p>
            <p>상태: {request.status}</p>
            <p>신청일: {new Date(request.requestedAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## ⚡ 즉시 수정 사항

**1단계: API URL 변경**

```javascript
// 변경 전
"/api/admin/physical-letters/dashboard?range=7d";

// 변경 후
"/api/admin/physical-requests";
```

**2단계: 응답 데이터 구조 확인**

- 기존 API 응답 구조에 맞춰 프론트엔드 코드 수정

**3단계: 클라이언트 사이드 필터링**

- 날짜 범위 필터링을 프론트엔드에서 처리

이렇게 수정하면 404 에러 없이 정상적으로 Admin 대시보드가 작동할 것입니다! 🎉
