# 🎛️ Letter SEO Admin 패널 가이드

## 📋 개요

관리자가 Letter 플랫폼의 SEO를 중앙에서 관리할 수 있는 Admin 패널 구현 가이드입니다.

---

## 🏗️ Admin 패널 구조

```
/admin
  /seo
    /configs          # SEO 설정 목록
    /configs/new      # 새 SEO 설정 생성
    /configs/[id]     # SEO 설정 수정
    /preview          # SEO 미리보기 도구
    /analytics        # SEO 성과 분석
```

---

## 📊 SEO Config 목록 페이지

### app/admin/seo/configs/page.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SEOConfig {
  _id: string;
  urlPattern: string;
  patternType: 'exact' | 'dynamic';
  metaTitle?: string;
  metaDescription?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SEOConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<SEOConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    patternType: '',
    isActive: '',
  });
  
  useEffect(() => {
    fetchConfigs();
  }, [filter]);
  
  async function fetchConfigs() {
    try {
      const params = new URLSearchParams();
      if (filter.patternType) params.append('patternType', filter.patternType);
      if (filter.isActive) params.append('isActive', filter.isActive);
      
      const response = await fetch(`/api/admin/seo/configs?${params}`, {
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
        },
      });
      
      const result = await response.json();
      setConfigs(result.data);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function deleteConfig(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await fetch(`/api/admin/seo/configs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
        },
      });
      
      fetchConfigs();
    } catch (error) {
      console.error('Failed to delete config:', error);
    }
  }
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">SEO 설정 관리</h1>
        <Link
          href="/admin/seo/configs/new"
          className="btn btn-primary"
        >
          새 SEO 설정 추가
        </Link>
      </div>
      
      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              패턴 타입
            </label>
            <select
              value={filter.patternType}
              onChange={(e) => setFilter({ ...filter, patternType: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="exact">정적 URL</option>
              <option value="dynamic">동적 URL</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              활성화 상태
            </label>
            <select
              value={filter.isActive}
              onChange={(e) => setFilter({ ...filter, isActive: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="true">활성화</option>
              <option value="false">비활성화</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* SEO Config 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">URL 패턴</th>
              <th className="px-6 py-3 text-left">타입</th>
              <th className="px-6 py-3 text-left">제목</th>
              <th className="px-6 py-3 text-center">우선순위</th>
              <th className="px-6 py-3 text-center">상태</th>
              <th className="px-6 py-3 text-center">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {configs.map((config) => (
              <tr key={config._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {config.urlPattern}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    config.patternType === 'exact'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {config.patternType === 'exact' ? '정적' : '동적'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate">
                    {config.metaTitle || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-semibold">{config.priority}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    config.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {config.isActive ? '활성화' : '비활성화'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center space-x-2">
                    <Link
                      href={`/admin/seo/configs/${config._id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => deleteConfig(config._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {configs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            SEO 설정이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

function getAdminToken() {
  // 실제 구현에서는 쿠키나 localStorage에서 가져오기
  return localStorage.getItem('adminToken') || '';
}
```

이 문서는 계속됩니다...
