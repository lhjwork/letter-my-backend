# 📝 임시저장 시스템 프론트엔드 구현 가이드

## 📋 개요

편지 작성 중 임시저장과 불러오기 기능을 모달로 구현하는 가이드입니다. Figma 디자인을 기반으로 한 완전한 구현 방법을 제공합니다.

### 🎯 주요 기능
- **자동 임시저장**: 작성 중 자동으로 임시저장
- **수동 임시저장**: 버튼 클릭으로 즉시 저장
- **임시저장 목록**: 저장된 편지 목록 조회
- **불러오기**: 임시저장된 편지 불러오기
- **삭제**: 불필요한 임시저장 삭제

---

## 🔗 API 엔드포인트

### 기본 URL
```
BASE_URL/api/drafts
```

### 주요 엔드포인트

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| `POST` | `/api/drafts` | 임시저장 생성 | Required |
| `GET` | `/api/drafts` | 임시저장 목록 조회 | Required |
| `GET` | `/api/drafts/:draftId` | 임시저장 상세 조회 | Required |
| `PUT` | `/api/drafts/:draftId` | 임시저장 수정 | Required |
| `DELETE` | `/api/drafts/:draftId` | 임시저장 삭제 | Required |
| `POST` | `/api/drafts/:draftId/publish` | 임시저장 → 정식 발행 | Required |

---

## 🎨 UI 컴포넌트 구현

### 1. 임시저장 버튼 (에디터 우측)

```tsx
// components/DraftSaveButton.tsx
import React, { useState } from 'react';
import { Save, Clock } from 'lucide-react';

interface DraftSaveButtonProps {
  onSave: () => void;
  onOpenModal: () => void;
  isAutoSaving?: boolean;
  lastSaved?: Date;
}

export function DraftSaveButton({ 
  onSave, 
  onOpenModal, 
  isAutoSaving = false, 
  lastSaved 
}: DraftSaveButtonProps) {
  return (
    <div className="flex flex-col items-end space-y-2">
      {/* 수동 저장 버튼 */}
      <button
        onClick={onSave}
        disabled={isAutoSaving}
        className="flex items-center space-x-2 px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 transition-colors"
      >
        <Save size={16} />
        <span>{isAutoSaving ? '저장 중...' : '임시저장'}</span>
      </button>

      {/* 불러오기 버튼 */}
      <button
        onClick={onOpenModal}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Clock size={16} />
        <span>불러오기</span>
      </button>

      {/* 마지막 저장 시간 */}
      {lastSaved && (
        <p className="text-xs text-gray-500">
          마지막 저장: {formatRelativeTime(lastSaved)}
        </p>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
```

### 2. 임시저장 모달 (Figma 디자인 기반)

```tsx
// components/DraftModal.tsx
import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface DraftItem {
  _id: string;
  title: string;
  autoTitle: string;
  content: string;
  type: string;
  category: string;
  wordCount: number;
  saveCount: number;
  lastSavedAt: string;
  createdAt: string;
}

interface DraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (draft: DraftItem) => void;
  onDelete: (draftId: string) => void;
}

export function DraftModal({ isOpen, onClose, onLoad, onDelete }: DraftModalProps) {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDrafts();
    }
  }, [isOpen]);

  const fetchDrafts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/drafts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('임시저장 목록을 불러올 수 없습니다.');
      
      const result = await response.json();
      setDrafts(result.data.drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('삭제에 실패했습니다.');
      
      setDrafts(prev => prev.filter(draft => draft._id !== draftId));
      onDelete(draftId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleLoad = (draft: DraftItem) => {
    onLoad(draft);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[800px] h-[600px] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-700" style={{ fontFamily: 'Nanum JangMiCe' }}>
            임시저장 불러오기
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 p-6 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">불러오는 중...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500">{error}</div>
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">임시저장된 편지가 없습니다.</div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto pr-3 space-y-4">
                {drafts.map((draft) => (
                  <DraftCard
                    key={draft._id}
                    draft={draft}
                    onLoad={() => handleLoad(draft)}
                    onDelete={() => handleDelete(draft._id)}
                  />
                ))}
              </div>

              {/* 하단 안내 */}
              <div className="mt-6 pt-4 border-t flex items-center space-x-2 text-gray-600">
                <AlertCircle size={20} className="text-orange-400" />
                <span className="text-sm">
                  임시저장은 작성 후 30일 이후 자동으로 삭제돼요.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 임시저장 카드 컴포넌트
function DraftCard({ 
  draft, 
  onLoad, 
  onDelete 
}: { 
  draft: DraftItem; 
  onLoad: () => void; 
  onDelete: () => void; 
}) {
  const displayTitle = draft.title || draft.autoTitle || '제목없음';
  const formattedDate = new Date(draft.lastSavedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 2-digit,
    day: 2-digit,
  }).replace(/\./g, '.').replace(/\s/g, '');

  return (
    <div className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-800 truncate max-w-[300px]">
            {displayTitle}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            date.{formattedDate}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onDelete}
            className="px-3 py-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            삭제
          </button>
          <button
            onClick={onLoad}
            className="px-3 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors text-sm font-medium"
          >
            불러오기
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. 자동 저장 훅

```tsx
// hooks/useAutoSave.ts
import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

interface AutoSaveOptions {
  delay?: number; // 자동저장 지연시간 (ms)
  enabled?: boolean; // 자동저장 활성화 여부
}

interface DraftData {
  title: string;
  content: string;
  type: 'friend' | 'story';
  category: string;
  recipientAddresses?: any[];
}

export function useAutoSave(
  data: DraftData,
  onSave: (data: DraftData, draftId?: string) => Promise<{ _id: string }>,
  options: AutoSaveOptions = {}
) {
  const { delay = 3000, enabled = true } = options;
  const draftIdRef = useRef<string | null>(null);
  const isInitialRender = useRef(true);

  // 디바운스된 저장 함수
  const debouncedSave = useCallback(
    debounce(async (saveData: DraftData) => {
      if (!enabled) return;
      
      try {
        const result = await onSave(saveData, draftIdRef.current || undefined);
        draftIdRef.current = result._id;
      } catch (error) {
        console.error('Auto save failed:', error);
      }
    }, delay),
    [onSave, enabled, delay]
  );

  // 데이터 변경 시 자동저장 트리거
  useEffect(() => {
    // 초기 렌더링 시에는 저장하지 않음
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // 내용이 있을 때만 자동저장
    if (data.title.trim() || data.content.trim()) {
      debouncedSave(data);
    }

    // 컴포넌트 언마운트 시 디바운스 취소
    return () => {
      debouncedSave.cancel();
    };
  }, [data, debouncedSave]);

  // 수동 저장 함수
  const saveNow = useCallback(async () => {
    debouncedSave.cancel(); // 기존 디바운스 취소
    
    try {
      const result = await onSave(data, draftIdRef.current || undefined);
      draftIdRef.current = result._id;
      return result;
    } catch (error) {
      console.error('Manual save failed:', error);
      throw error;
    }
  }, [data, onSave, debouncedSave]);

  return {
    saveNow,
    currentDraftId: draftIdRef.current,
  };
}
```

### 4. 편지 작성 페이지 통합

```tsx
// pages/WriteLetter.tsx
import React, { useState, useCallback } from 'react';
import { DraftSaveButton } from '../components/DraftSaveButton';
import { DraftModal } from '../components/DraftModal';
import { useAutoSave } from '../hooks/useAutoSave';

interface LetterForm {
  title: string;
  content: string;
  type: 'friend' | 'story';
  category: string;
  recipientAddresses: any[];
}

export function WriteLetter() {
  const [form, setForm] = useState<LetterForm>({
    title: '',
    content: '',
    type: 'friend',
    category: '기타',
    recipientAddresses: [],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 임시저장 API 호출
  const saveDraft = useCallback(async (data: LetterForm, draftId?: string) => {
    const url = draftId ? `/api/drafts/${draftId}` : '/api/drafts';
    const method = draftId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        ...data,
        draftId: draftId || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error('임시저장에 실패했습니다.');
    }

    const result = await response.json();
    setLastSaved(new Date());
    return result.data;
  }, []);

  // 자동저장 훅
  const { saveNow, currentDraftId } = useAutoSave(form, saveDraft, {
    delay: 3000,
    enabled: true,
  });

  // 수동 저장
  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await saveNow();
      alert('임시저장되었습니다.');
    } catch (error) {
      alert('임시저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 임시저장 불러오기
  const handleLoadDraft = (draft: any) => {
    setForm({
      title: draft.title,
      content: draft.content,
      type: draft.type,
      category: draft.category,
      recipientAddresses: draft.recipientAddresses || [],
    });
    setLastSaved(new Date(draft.lastSavedAt));
  };

  // 임시저장 삭제
  const handleDeleteDraft = (draftId: string) => {
    // 현재 편집 중인 임시저장이 삭제된 경우 처리
    if (currentDraftId === draftId) {
      // 필요시 추가 로직
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex gap-6">
        {/* 메인 편집 영역 */}
        <div className="flex-1">
          {/* 제목 입력 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-700 mb-4" style={{ fontFamily: 'Nanum JangMiCe' }}>
              편지의 제목을 정해주세요
            </h2>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="내용을 입력해주세요"
              className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <p className="text-sm text-gray-600 mt-2">
              제목이 떠오르지 않아도 괜찮아요. 레터가 내용을 바탕으로 제목을 제안해드려요.
            </p>
          </div>

          {/* 내용 입력 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-700 mb-4" style={{ fontFamily: 'Nanum JangMiCe' }}>
              어떤 이야기를 건네고 싶으신가요?
            </h2>
            <div className="relative">
              <div className="bg-gray-50 border border-gray-300 rounded-lg min-h-[400px] p-4">
                <div className="text-sm text-gray-600 mb-2">*에디터 영역</div>
                <div className="border-t-2 border-gray-300 pt-4">
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="내용을 입력해주세요"
                    className="w-full h-80 resize-none border-none outline-none bg-transparent text-gray-800"
                    style={{ 
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 47px, #c4c4c4 47px, #c4c4c4 48px)',
                      lineHeight: '48px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 임시저장 버튼 영역 */}
        <div className="w-48 flex-shrink-0">
          <div className="sticky top-6">
            <DraftSaveButton
              onSave={handleManualSave}
              onOpenModal={() => setIsModalOpen(true)}
              isAutoSaving={isSaving}
              lastSaved={lastSaved}
            />
          </div>
        </div>
      </div>

      {/* 임시저장 모달 */}
      <DraftModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoad={handleLoadDraft}
        onDelete={handleDeleteDraft}
      />
    </div>
  );
}
```

---

## 🔧 API 사용법

### 1. 임시저장 생성

```typescript
// POST /api/drafts
const saveDraft = async (data: {
  title?: string;
  content?: string;
  type?: 'friend' | 'story';
  category?: string;
  recipientAddresses?: any[];
}) => {
  const response = await fetch('/api/drafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return response.json();
};
```

### 2. 임시저장 목록 조회

```typescript
// GET /api/drafts?page=1&limit=10&sort=latest&type=all
const getDrafts = async (params?: {
  page?: number;
  limit?: number;
  sort?: 'latest' | 'oldest' | 'wordCount';
  type?: 'all' | 'friend' | 'story';
}) => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.type) searchParams.set('type', params.type);

  const response = await fetch(`/api/drafts?${searchParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
};
```

### 3. 임시저장 불러오기

```typescript
// GET /api/drafts/:draftId
const getDraft = async (draftId: string) => {
  const response = await fetch(`/api/drafts/${draftId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
};
```

### 4. 임시저장 수정

```typescript
// PUT /api/drafts/:draftId
const updateDraft = async (draftId: string, data: any) => {
  const response = await fetch(`/api/drafts/${draftId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return response.json();
};
```

### 5. 임시저장 삭제

```typescript
// DELETE /api/drafts/:draftId
const deleteDraft = async (draftId: string) => {
  const response = await fetch(`/api/drafts/${draftId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
};
```

### 6. 임시저장 → 정식 발행

```typescript
// POST /api/drafts/:draftId/publish
const publishDraft = async (draftId: string, data?: {
  title?: string;
  content?: string;
  type?: 'friend' | 'story';
  category?: string;
  recipientAddresses?: any[];
}) => {
  const response = await fetch(`/api/drafts/${draftId}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data || {}),
  });

  return response.json();
};
```

---

## 🎯 사용자 경험 최적화

### 1. 자동저장 전략

```typescript
// 자동저장 조건
const shouldAutoSave = (data: LetterForm) => {
  // 제목이나 내용이 있을 때만 저장
  return data.title.trim().length > 0 || data.content.trim().length > 0;
};

// 저장 상태 표시
const SaveStatus = ({ isSaving, lastSaved }: { 
  isSaving: boolean; 
  lastSaved: Date | null; 
}) => {
  if (isSaving) {
    return <span className="text-orange-500">저장 중...</span>;
  }
  
  if (lastSaved) {
    return (
      <span className="text-green-600">
        저장됨 ({formatRelativeTime(lastSaved)})
      </span>
    );
  }
  
  return <span className="text-gray-500">저장되지 않음</span>;
};
```

### 2. 오프라인 지원

```typescript
// 로컬 스토리지 백업
const saveToLocalStorage = (data: LetterForm) => {
  localStorage.setItem('draft_backup', JSON.stringify({
    ...data,
    timestamp: new Date().toISOString(),
  }));
};

// 로컬 스토리지에서 복원
const restoreFromLocalStorage = (): LetterForm | null => {
  try {
    const backup = localStorage.getItem('draft_backup');
    if (!backup) return null;
    
    const parsed = JSON.parse(backup);
    const timestamp = new Date(parsed.timestamp);
    const now = new Date();
    
    // 24시간 이내의 백업만 복원
    if (now.getTime() - timestamp.getTime() < 24 * 60 * 60 * 1000) {
      return parsed;
    }
    
    localStorage.removeItem('draft_backup');
    return null;
  } catch {
    return null;
  }
};
```

### 3. 에러 처리

```typescript
// 네트워크 에러 처리
const handleSaveError = (error: Error) => {
  if (error.message.includes('network') || error.message.includes('fetch')) {
    // 네트워크 오류 시 로컬 저장
    saveToLocalStorage(form);
    showNotification('네트워크 오류로 로컬에 임시저장했습니다.', 'warning');
  } else {
    showNotification('저장에 실패했습니다. 다시 시도해주세요.', 'error');
  }
};

// 재시도 로직
const saveWithRetry = async (data: LetterForm, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await saveDraft(data);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 지수 백오프
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

---

## 📱 반응형 디자인

### 모바일 최적화

```css
/* 모바일에서 모달 크기 조정 */
@media (max-width: 768px) {
  .draft-modal {
    width: 95vw;
    height: 90vh;
    margin: 5vh auto;
  }
  
  .draft-card {
    padding: 12px;
  }
  
  .draft-buttons {
    flex-direction: column;
    gap: 8px;
  }
}

/* 태블릿 최적화 */
@media (min-width: 769px) and (max-width: 1024px) {
  .draft-modal {
    width: 80vw;
    max-width: 700px;
  }
}
```

---

## 🔒 보안 고려사항

### 1. 인증 토큰 관리

```typescript
// 토큰 만료 처리
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('로그인이 필요합니다.');
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    // 토큰 만료 시 로그인 페이지로 리다이렉트
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }
  
  return response;
};
```

### 2. 데이터 검증

```typescript
// 클라이언트 사이드 검증
const validateDraftData = (data: LetterForm): string[] => {
  const errors: string[] = [];
  
  if (data.title.length > 200) {
    errors.push('제목은 200자 이내여야 합니다.');
  }
  
  if (data.content.length > 10000) {
    errors.push('내용은 10,000자 이내여야 합니다.');
  }
  
  if (!['friend', 'story'].includes(data.type)) {
    errors.push('올바른 편지 타입을 선택해주세요.');
  }
  
  return errors;
};
```

---

## 🧪 테스트 가이드

### 1. 단위 테스트

```typescript
// __tests__/useAutoSave.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../hooks/useAutoSave';

describe('useAutoSave', () => {
  it('should auto save after delay', async () => {
    const mockSave = jest.fn().mockResolvedValue({ _id: 'test-id' });
    const { result } = renderHook(() => 
      useAutoSave(
        { title: 'Test', content: 'Content', type: 'friend', category: '기타' },
        mockSave,
        { delay: 100 }
      )
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(mockSave).toHaveBeenCalled();
  });
});
```

### 2. 통합 테스트

```typescript
// __tests__/DraftModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DraftModal } from '../components/DraftModal';

describe('DraftModal', () => {
  it('should load and display drafts', async () => {
    // Mock API response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          drafts: [
            {
              _id: '1',
              title: 'Test Draft',
              content: 'Test content',
              lastSavedAt: new Date().toISOString(),
            },
          ],
        },
      }),
    });

    render(
      <DraftModal
        isOpen={true}
        onClose={() => {}}
        onLoad={() => {}}
        onDelete={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Draft')).toBeInTheDocument();
    });
  });
});
```

---

## 📊 성능 최적화

### 1. 메모이제이션

```typescript
// React.memo로 불필요한 리렌더링 방지
export const DraftCard = React.memo(({ draft, onLoad, onDelete }) => {
  // 컴포넌트 내용
});

// useMemo로 계산 비용이 큰 작업 최적화
const sortedDrafts = useMemo(() => {
  return drafts.sort((a, b) => 
    new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime()
  );
}, [drafts]);
```

### 2. 가상화 (대량 데이터 처리)

```typescript
// react-window를 사용한 가상 스크롤
import { FixedSizeList as List } from 'react-window';

const VirtualizedDraftList = ({ drafts }: { drafts: DraftItem[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <DraftCard draft={drafts[index]} onLoad={handleLoad} onDelete={handleDelete} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={drafts.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

---

## 🚀 배포 및 모니터링

### 1. 환경 변수 설정

```typescript
// config/api.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  timeout: 10000,
  retryAttempts: 3,
};
```

### 2. 에러 모니터링

```typescript
// utils/errorTracking.ts
export const trackError = (error: Error, context?: Record<string, any>) => {
  // Sentry, LogRocket 등 에러 추적 서비스 연동
  console.error('Draft Error:', error, context);
  
  // 개발 환경에서만 상세 로그
  if (process.env.NODE_ENV === 'development') {
    console.trace();
  }
};
```

---

이 가이드를 따라 구현하면 Figma 디자인에 맞는 완전한 임시저장 시스템을 구축할 수 있습니다. 백엔드 API는 이미 완전히 구현되어 있으므로, 프론트엔드 구현에 집중하시면 됩니다!