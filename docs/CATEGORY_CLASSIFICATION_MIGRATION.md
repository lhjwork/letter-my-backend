# 백엔드 카테고리 분류 로직 변경 가이드

## 📋 변경 개요

**변경 이유**: 카테고리 분류를 AI API로 처리하면 트래픽이 증가하고 비용이 발생하므로, 프론트엔드에서 키워드 기반 분류로 변경

**변경 내용**:

- ❌ 제거: `/api/ai/categorize` API 엔드포인트
- ✅ 추가: 프론트엔드 키워드 기반 분류 로직

---

## 🔄 변경 사항 요약

### 1. 프론트엔드 변경사항

#### 새로운 파일 추가

```
lib/categoryClassifier.ts
```

**주요 기능**:

- 키워드 기반 카테고리 분류 로직
- 카테고리별 primary/secondary 키워드 정의
- 신뢰도 점수 계산 (0.3 ~ 0.9)
- 매칭된 키워드 태그 추출

**사용 예시**:

```typescript
import { classifyCategory } from "@/lib/categoryClassifier";

const result = classifyCategory(title, content);
// {
//   category: "가족",
//   confidence: 0.85,
//   reason: "가족 관계와 관련된 내용이 감지되었습니다",
//   tags: ["엄마", "가족", "그리움"]
// }
```

#### 수정된 파일

```
app/(afterLogin)/write/page.tsx
```

**변경 내용**:

```diff
+ import { classifyCategory } from "@/lib/categoryClassifier";

  if (letterType === "story") {
-   // AI API 호출 방식
-   const categoryResponse = await fetch("/api/ai/categorize", {
-     method: "POST",
-     headers: { "Content-Type": "application/json" },
-     body: JSON.stringify({ title, content }),
-   });

+   // 프론트엔드 키워드 기반 분류
+   const classificationResult = classifyCategory(title.trim(), plainContent);
+   const aiCategory = classificationResult.category;
+   const aiMetadata = {
+     confidence: classificationResult.confidence,
+     reason: classificationResult.reason,
+     tags: classificationResult.tags,
+     classifiedAt: new Date().toISOString(),
+     model: "keyword-based-frontend",
+   };
  }
```

### 2. 백엔드 변경사항

#### 제거된 파일

```
app/api/ai/categorize/route.ts  ❌ (삭제됨)
app/api/ai/categorize/          ❌ (디렉토리 삭제됨)
```

#### 백엔드 API 스펙 영향

**기존 스토리 등록 API는 그대로 유지됩니다**:

- `POST /api/letters/story` - 변경 없음
- `aiMetadata.model` 값만 `"gemini-1.5-flash"` → `"keyword-based-frontend"`로 변경

---

## 📊 데이터 구조 비교

### aiMetadata 필드 비교

#### Before (AI API)

```json
{
  "confidence": 0.85,
  "reason": "가족 관계와 관련된 내용이 포함되어 있습니다",
  "tags": ["엄마", "가족", "사랑"],
  "classifiedAt": "2025-12-17T10:30:00.000Z",
  "model": "gemini-1.5-flash"
}
```

#### After (프론트엔드 분류)

```json
{
  "confidence": 0.85,
  "reason": "가족 관계와 관련된 내용이 감지되었습니다",
  "tags": ["엄마", "가족", "고향"],
  "classifiedAt": "2025-12-17T10:30:00.000Z",
  "model": "keyword-based-frontend"
}
```

**차이점**: `model` 필드 값만 변경됨

---

## 🎯 카테고리 분류 알고리즘

### 키워드 가중치 시스템

1. **Primary 키워드** (가중치 3점)
   - 카테고리의 핵심 키워드
   - 예: "가족", "엄마", "아빠", "사랑", "연애" 등

2. **Secondary 키워드** (가중치 1점)
   - 보조 키워드
   - 예: "집", "식구", "좋아", "설레" 등

### 신뢰도 계산 공식

```typescript
confidence = (maxScore / totalScore) * 0.8 + 0.2;
confidence = Math.min(0.9, Math.max(0.3, confidence));
```

- 최소값: 0.3 (매우 불확실)
- 최대값: 0.9 (매우 확실)

---

## 🔍 백엔드 개발자가 확인할 사항

### 1. API 엔드포인트 제거 확인

```bash
# 더 이상 존재하지 않아야 함
curl -X POST http://localhost:3000/api/ai/categorize
# Expected: 404 Not Found
```

### 2. 스토리 등록 API 정상 동작 확인

```bash
# 기존 API는 정상 동작해야 함
POST /api/letters/story
{
  "title": "제목",
  "content": "내용",
  "category": "가족",
  "aiMetadata": {
    "model": "keyword-based-frontend",
    ...
  }
}
```

### 3. 데이터베이스 스키마

**변경 불필요** - aiMetadata 구조는 동일하게 유지됨

---

## 📈 장점

### 1. 트래픽 절감

- ❌ Before: 사연 작성 시마다 AI API 호출 (네트워크 요청)
- ✅ After: 프론트엔드에서 즉시 처리 (네트워크 요청 없음)

### 2. 비용 절감

- Gemini API 호출 비용 제거
- Vercel Serverless Function 실행 시간 절감

### 3. 응답 속도 향상

- AI API 응답 대기 시간 제거 (수 초 → 밀리초)
- 사용자 경험 개선

### 4. 의존성 감소

- 외부 AI API 장애에 영향받지 않음
- 안정성 향상

---

## ⚠️ 주의사항

### 1. 분류 정확도

- AI 기반 분류보다 정확도가 낮을 수 있음
- 키워드 기반이므로 문맥 파악 제한적

### 2. 키워드 업데이트

- 새로운 패턴 발견 시 `lib/categoryClassifier.ts`의 키워드 업데이트 필요
- 사용자 피드백 기반으로 지속적인 개선 필요

### 3. 신뢰도 기준

- 0.8 이상: 매우 확실함
- 0.6-0.8: 확실함
- 0.4-0.6: 보통
- 0.4 미만: 불확실함 (기본 "기타" 카테고리)

---

## 🧪 테스트 가이드

### 프론트엔드 테스트

```typescript
import { classifyCategory } from "@/lib/categoryClassifier";

// 테스트 케이스 1: 가족
const result1 = classifyCategory("어머니께 드리는 편지", "엄마, 항상 감사합니다. 가족이 최고에요.");
console.log(result1.category); // "가족"

// 테스트 케이스 2: 사랑
const result2 = classifyCategory("첫사랑 이야기", "처음 만났을 때 너무 설렜어요. 사랑이 뭔지 알았죠.");
console.log(result2.category); // "사랑"
```

### 통합 테스트

1. 사연 작성 페이지에서 다양한 내용 작성
2. 카테고리 자동 분류 확인
3. 제출 후 스토리 상세 페이지에서 카테고리 표시 확인

---

## 📚 관련 파일

### 프론트엔드

- `lib/categoryClassifier.ts` - 새로 추가된 분류 로직
- `lib/categoryTheme.ts` - 카테고리 테마 정의 (변경 없음)
- `app/(afterLogin)/write/page.tsx` - 사연 작성 페이지 (수정됨)

### 백엔드

- ~~`app/api/ai/categorize/route.ts`~~ - 삭제됨
- `POST /api/letters/story` - 변경 없음 (기존 API 유지)

---

## 🚀 배포 체크리스트

### 프론트엔드

- [x] `lib/categoryClassifier.ts` 파일 추가
- [x] `write/page.tsx` 수정
- [x] `/api/ai/categorize` 디렉토리 제거
- [ ] 빌드 테스트 (`pnpm build`)
- [ ] 로컬 테스트 (`pnpm dev`)

### 백엔드

- [x] 기존 스토리 API 정상 동작 확인 (`POST /api/letters/story`)
- [x] aiMetadata.model 값 변경 대응 가능 확인
- [x] 데이터베이스 스키마 호환성 확인 (변경 불필요)

### 모니터링

- [ ] 카테고리 분류 정확도 모니터링
- [ ] 사용자 피드백 수집
- [ ] 필요시 키워드 업데이트

---

## 💡 백엔드 구현 현황

### 현재 백엔드 상태

이 백엔드 프로젝트(Express.js)는 애초에 AI 카테고리 분류 API를 포함하지 않았습니다.

- ✅ **카테고리 필드**: 프론트엔드에서 전달받은 카테고리를 그대로 저장
- ✅ **카테고리 통계**: `GET /api/letters/categories/stats` - 카테고리별 통계 조회 API 제공
- ✅ **카테고리 필터**: 사연 목록 조회 시 카테고리 필터링 지원

### 지원하는 카테고리

```typescript
export enum LetterCategory {
  FAMILY = "가족",
  LOVE = "사랑",
  FRIENDSHIP = "우정",
  GROWTH = "성장",
  COMFORT = "위로",
  MEMORY = "추억",
  GRATITUDE = "감사",
  OTHER = "기타",
}
```

### 주요 API 엔드포인트

```typescript
// 사연 등록 (카테고리 포함)
POST /api/letters/story
Body: {
  title: string;
  content: string;
  category?: "가족" | "사랑" | "우정" | "성장" | "위로" | "추억" | "감사" | "기타";
  authorName?: string;
}

// 사연 목록 조회 (카테고리 필터 지원)
GET /api/letters/stories?category=가족&page=1&limit=10

// 카테고리별 통계
GET /api/letters/categories/stats
```

### 백엔드 영향 분석

프론트엔드의 카테고리 분류 방식 변경이 백엔드에 미치는 영향:

- ✅ **API 스펙**: 변경 없음 - 동일한 요청/응답 구조 유지
- ✅ **DB 스키마**: 변경 없음 - 카테고리 필드는 그대로 유지
- ✅ **검증 로직**: 변경 없음 - 동일한 카테고리 enum 값 사용
- ℹ️ **메타데이터**: `aiMetadata.model` 값이 변경되지만 백엔드는 저장만 하므로 영향 없음

---

## 💡 추후 개선 방안

### 1. 하이브리드 접근

- 일반 사용자: 프론트엔드 키워드 분류
- 프리미엄: AI 기반 고급 분류 옵션 제공

### 2. 머신러닝 모델

- 오프라인 학습된 경량 모델 사용
- TensorFlow.js 등 활용

### 3. 사용자 피드백

- 카테고리 수정 기능 추가
- 수정 데이터를 통한 키워드 학습

### 4. 백엔드에서 카테고리 추천 API 추가 (선택사항)

프론트엔드가 카테고리를 결정하기 어려운 경우를 대비한 백엔드 API 추가 가능:

```typescript
// 선택적: 백엔드에서 간단한 키워드 기반 추천 제공
POST / api / letters / suggest - category;
Body: {
  title: string;
  content: string;
}
Response: {
  suggestedCategory: string;
  confidence: number;
}
```

---

**작성일**: 2025-12-17  
**작성자**: GitHub Copilot  
**버전**: 1.0.0  
**업데이트**: 백엔드 구현 현황 추가
