# 📝 편지 임시저장 기능 - 프론트엔드 통합 가이드

## 🚨 중요 이슈: 401 Unauthorized 에러 해결

### 문제 상황

```http
POST /api/drafts
Status: 401 Unauthorized
Error: {"success": false, "error": "로그인이 필요합니다."}
```

### 원인

임시저장 API는 **모든 엔드포인트에서 JWT 인증이 필수**입니다. Authorization 헤더 없이 요청하면 401 에러가 발생합니다.

### 해결 방법

모든 임시저장 API 요청 시 JWT 토큰을 포함해야 합니다.

---

## 🔐 인증 요구사항

### 필수 헤더

```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${jwtToken}` // 필수!
}
```

### JWT 토큰 획득 방법

#### 1. 기존 로그인 API 사용

```javascript
const loginResponse = await fetch("/api/users/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password",
  }),
});

const { token } = await loginResponse.json();
localStorage.setItem("authToken", token);
```

#### 2. 개발/테스트용 토큰 발급

```javascript
const devTokenResponse = await fetch("/api/dev/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "test-user-id",
    name: "테스트 사용자",
  }),
});

const { token } = await devTokenResponse.json();
```

---

## 📚 임시저장 API 사용법

### 1. 임시저장 생성

```javascript
const saveDraft = async (draftData) => {
  const token = localStorage.getItem("authToken");

  const response = await fetch("/api/drafts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // 필수!
    },
    body: JSON.stringify({
      title: draftData.title || "", // 선택사항 (빈 문자열 가능)
      content: draftData.content,
      type: draftData.type || "friend", // "friend" | "story"
      category: draftData.category || "기타",
      recipientAddresses: draftData.recipientAddresses || [],
    }),
  });

  if (response.status === 401) {
    // 토큰 만료 또는 없음 - 로그인 페이지로 리다이렉트
    window.location.href = "/login";
    return;
  }

  return await response.json();
};

// 사용 예시
const result = await saveDraft({
  title: "임시 저장 test 편지",
  content: "<p>임시 저장 test 편지</p>",
  type: "friend",
  category: "기타",
});

console.log(result);
// {
//   "success": true,
//   "data": {
//     "_id": "draft_id",
//     "title": "임시 저장 test 편지",
//     "autoTitle": "",
//     "content": "<p>임시 저장 test 편지</p>",
//     "wordCount": 12,
//     "saveCount": 1,
//     "lastSavedAt": "2024-01-02T...",
//     "createdAt": "2024-01-02T..."
//   },
//   "message": "임시저장되었습니다."
// }
```

### 2. 임시저장 목록 조회

```javascript
const getDrafts = async (options = {}) => {
  const token = localStorage.getItem("authToken");
  const { page = 1, limit = 10, sort = "latest", type = "all" } = options;

  const response = await fetch(`/api/drafts?page=${page}&limit=${limit}&sort=${sort}&type=${type}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  return await response.json();
};

// 사용 예시
const drafts = await getDrafts({ page: 1, limit: 5, sort: "latest" });
```

### 3. 임시저장 상세 조회

```javascript
const getDraft = async (draftId) => {
  const token = localStorage.getItem("authToken");

  const response = await fetch(`/api/drafts/${draftId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  return await response.json();
};
```

### 4. 임시저장 수정

```javascript
const updateDraft = async (draftId, updateData) => {
  const token = localStorage.getItem("authToken");

  const response = await fetch(`/api/drafts/${draftId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  return await response.json();
};
```

### 5. 임시저장 삭제

```javascript
const deleteDraft = async (draftId) => {
  const token = localStorage.getItem("authToken");

  const response = await fetch(`/api/drafts/${draftId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  return await response.json();
};
```

### 6. 임시저장 → 정식 발행

```javascript
const publishDraft = async (draftId, finalData = {}) => {
  const token = localStorage.getItem("authToken");

  const response = await fetch(`/api/drafts/${draftId}/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(finalData), // 최종 수정사항 (선택사항)
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  return await response.json();
};

// 사용 예시
const result = await publishDraft("draft_id", {
  title: "최종 편지 제목",
});

// 발행 성공 시 편지 페이지로 이동
if (result.success) {
  window.location.href = result.data.url;
}
```

---

## 🛠️ 유틸리티 함수 추천

### API 요청 래퍼 함수

```javascript
// utils/api.js
const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem("authToken");

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const response = await fetch(url, config);

  // 401 에러 처리
  if (response.status === 401) {
    localStorage.removeItem("authToken");
    window.location.href = "/login";
    throw new Error("Authentication required");
  }

  return await response.json();
};

// 임시저장 API 래퍼
export const draftAPI = {
  create: (data) =>
    apiRequest("/api/drafts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/drafts?${query}`);
  },

  get: (id) => apiRequest(`/api/drafts/${id}`),

  update: (id, data) =>
    apiRequest(`/api/drafts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiRequest(`/api/drafts/${id}`, {
      method: "DELETE",
    }),

  publish: (id, data = {}) =>
    apiRequest(`/api/drafts/${id}/publish`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  stats: () => apiRequest("/api/drafts/stats"),
};
```

### 사용 예시

```javascript
import { draftAPI } from "./utils/api";

// 임시저장 생성
const draft = await draftAPI.create({
  title: "제목",
  content: "내용",
  type: "friend",
});

// 목록 조회
const drafts = await draftAPI.list({ page: 1, limit: 10 });

// 발행
const published = await draftAPI.publish("draft_id");
```

---

## 🎯 React Hook 예시

### useDrafts Hook

```javascript
// hooks/useDrafts.js
import { useState, useEffect } from "react";
import { draftAPI } from "../utils/api";

export const useDrafts = (options = {}) => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await draftAPI.list(options);

      if (result.success) {
        setDrafts(result.data.drafts);
        setPagination(result.data.pagination);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [JSON.stringify(options)]);

  const saveDraft = async (draftData) => {
    try {
      const result = await draftAPI.create(draftData);
      if (result.success) {
        await fetchDrafts(); // 목록 새로고침
        return result.data;
      }
      throw new Error(result.error);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteDraft = async (draftId) => {
    try {
      const result = await draftAPI.delete(draftId);
      if (result.success) {
        await fetchDrafts(); // 목록 새로고침
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    drafts,
    loading,
    error,
    pagination,
    saveDraft,
    deleteDraft,
    refetch: fetchDrafts,
  };
};
```

### 컴포넌트에서 사용

```javascript
// components/DraftList.jsx
import { useDrafts } from "../hooks/useDrafts";

const DraftList = () => {
  const { drafts, loading, error, saveDraft } = useDrafts({
    page: 1,
    limit: 10,
    sort: "latest",
  });

  const handleSave = async (draftData) => {
    try {
      await saveDraft(draftData);
      alert("임시저장되었습니다!");
    } catch (err) {
      alert("저장 실패: " + err.message);
    }
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error}</div>;

  return (
    <div>
      {drafts.map((draft) => (
        <div key={draft._id}>
          <h3>{draft.title || draft.autoTitle}</h3>
          <p>{draft.content}</p>
          <small>저장 횟수: {draft.saveCount}</small>
        </div>
      ))}
    </div>
  );
};
```

---

## ⚠️ 주의사항

### 1. 토큰 관리

- JWT 토큰은 localStorage 또는 secure cookie에 저장
- 토큰 만료 시 자동 로그인 페이지 리다이렉트
- 로그아웃 시 토큰 삭제

### 2. 에러 처리

- 401: 인증 필요 → 로그인 페이지로 이동
- 403: 권한 없음 → 접근 거부 메시지
- 404: 임시저장 없음 → 목록으로 이동
- 500: 서버 에러 → 재시도 또는 에러 메시지

### 3. UX 고려사항

- 자동저장 기능 (일정 시간마다)
- 저장 중 로딩 상태 표시
- 네트워크 오류 시 재시도 로직
- 오프라인 상태에서 로컬 저장

---

## 🧪 테스트 방법

### 1. Postman/Insomnia 테스트

```bash
# 1. 토큰 발급
POST /api/dev/token
{
  "userId": "test-user",
  "name": "테스트 사용자"
}

# 2. 임시저장 생성
POST /api/drafts
Headers: Authorization: Bearer YOUR_TOKEN
{
  "title": "테스트 편지",
  "content": "테스트 내용",
  "type": "friend"
}
```

### 2. 브라우저 콘솔 테스트

```javascript
// 개발자 도구 콘솔에서
const token = "YOUR_JWT_TOKEN";

fetch("/api/drafts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: "테스트",
    content: "내용",
    type: "friend",
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

---

## 📞 문제 해결

### 자주 발생하는 에러

1. **401 Unauthorized**
   - 원인: Authorization 헤더 누락 또는 잘못된 토큰
   - 해결: JWT 토큰 확인 및 헤더 추가

2. **400 Bad Request**
   - 원인: 잘못된 요청 데이터 (validation 실패)
   - 해결: 요청 데이터 형식 확인

3. **404 Not Found**
   - 원인: 존재하지 않는 임시저장 ID
   - 해결: 올바른 draftId 사용

### 디버깅 팁

- 브라우저 Network 탭에서 요청/응답 확인
- Authorization 헤더가 올바르게 포함되었는지 확인
- JWT 토큰이 유효한지 확인 (jwt.io에서 디코딩)

---

**이 가이드를 따라 구현하면 임시저장 기능을 완벽하게 통합할 수 있습니다!** 🚀

추가 질문이나 문제가 있으면 언제든 문의해주세요.
