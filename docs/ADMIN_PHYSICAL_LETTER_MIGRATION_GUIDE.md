# 🔄 Admin Panel 업데이트 가이드 - 실물 편지 시스템 마이그레이션

## 📋 변경 사항 요약

기존 `AuthorApprovalPhysicalRequest` 별도 컬렉션에서 **Letter 모델의 `recipientAddresses` 필드**로 완전 마이그레이션되었습니다.

### 🗂️ 새로운 데이터 구조

```typescript
// Letter 모델 내 recipientAddresses 배열
recipientAddresses: [
  {
    // 기본 주소 정보
    name: string,
    phone: string,
    zipCode: string,
    address1: string,
    address2?: string,
    memo?: string,
    addedAt: Date,

    // 실물 편지 신청 정보
    isPhysicalRequested: boolean,
    physicalRequestDate?: Date,
    physicalStatus: "none" | "requested" | "approved" | "rejected" | "writing" | "sent" | "delivered",
    sessionId?: string,
    userAgent?: string,
    ipAddress?: string,
    requestId?: string // 고유 신청 ID
  }
]

// Letter 모델 내 통계 정보
physicalLetterStats: {
  totalRequests: number,
  pendingRequests: number,
  approvedRequests: number,
  rejectedRequests: number,
  completedRequests: number
}

// Letter 모델 내 작성자 설정
authorSettings: {
  allowPhysicalRequests: boolean,
  autoApprove: boolean,
  maxRequestsPerPerson: number,
  requireApprovalMessage?: string
}
```

## 🎯 Admin Panel 구현 요구사항

### 1. 📊 대시보드 통계 쿼리

```javascript
// 전체 실물 편지 통계
const totalStats = await Letter.aggregate([
  { $match: { "recipientAddresses.isPhysicalRequested": true } },
  { $unwind: "$recipientAddresses" },
  { $match: { "recipientAddresses.isPhysicalRequested": true } },
  {
    $group: {
      _id: null,
      totalRequests: { $sum: 1 },
      pendingRequests: { $sum: { $cond: [{ $eq: ["$recipientAddresses.physicalStatus", "requested"] }, 1, 0] } },
      approvedRequests: { $sum: { $cond: [{ $eq: ["$recipientAddresses.physicalStatus", "approved"] }, 1, 0] } },
      rejectedRequests: { $sum: { $cond: [{ $eq: ["$recipientAddresses.physicalStatus", "rejected"] }, 1, 0] } },
      writingRequests: { $sum: { $cond: [{ $eq: ["$recipientAddresses.physicalStatus", "writing"] }, 1, 0] } },
      sentRequests: { $sum: { $cond: [{ $eq: ["$recipientAddresses.physicalStatus", "sent"] }, 1, 0] } },
      deliveredRequests: { $sum: { $cond: [{ $eq: ["$recipientAddresses.physicalStatus", "delivered"] }, 1, 0] } },
    },
  },
]);

// 일별 신청 통계
const dailyStats = await Letter.aggregate([
  { $unwind: "$recipientAddresses" },
  { $match: { "recipientAddresses.isPhysicalRequested": true } },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$recipientAddresses.physicalRequestDate" } },
      count: { $sum: 1 },
    },
  },
  { $sort: { _id: -1 } },
  { $limit: 30 },
]);
```

### 2. 📋 실물 편지 신청 목록 조회

```javascript
// 페이지네이션과 필터링이 포함된 신청 목록
const getPhysicalRequests = async (page = 1, limit = 20, status = null, search = null) => {
  const pipeline = [{ $unwind: "$recipientAddresses" }, { $match: { "recipientAddresses.isPhysicalRequested": true } }];

  // 상태 필터
  if (status) {
    pipeline.push({ $match: { "recipientAddresses.physicalStatus": status } });
  }

  // 검색 필터 (편지 제목, 작성자명, 수신자명)
  if (search) {
    pipeline.push({
      $match: {
        $or: [{ title: { $regex: search, $options: "i" } }, { authorName: { $regex: search, $options: "i" } }, { "recipientAddresses.name": { $regex: search, $options: "i" } }],
      },
    });
  }

  // 데이터 구조화
  pipeline.push({
    $project: {
      letterId: "$_id",
      letterTitle: "$title",
      authorName: "$authorName",
      requestId: "$recipientAddresses.requestId",
      recipientName: "$recipientAddresses.name",
      recipientPhone: "$recipientAddresses.phone",
      fullAddress: {
        $concat: ["(", "$recipientAddresses.zipCode", ") ", "$recipientAddresses.address1", " ", { $ifNull: ["$recipientAddresses.address2", ""] }],
      },
      status: "$recipientAddresses.physicalStatus",
      requestedAt: "$recipientAddresses.physicalRequestDate",
      memo: "$recipientAddresses.memo",
      sessionId: "$recipientAddresses.sessionId",
    },
  });

  // 정렬 및 페이지네이션
  pipeline.push({ $sort: { requestedAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit });

  return await Letter.aggregate(pipeline);
};
```

### 3. 🔄 상태 관리 API

```javascript
// 대량 상태 업데이트
const bulkUpdateStatus = async (requestIds, newStatus, adminId) => {
  const result = await Letter.updateMany(
    { "recipientAddresses.requestId": { $in: requestIds } },
    {
      $set: {
        "recipientAddresses.$.physicalStatus": newStatus,
        "recipientAddresses.$.updatedBy": adminId,
        "recipientAddresses.$.updatedAt": new Date(),
      },
    }
  );

  // 통계 재계산 필요
  await recalculateStats(requestIds);

  return result;
};

// 개별 상태 업데이트
const updateRequestStatus = async (letterId, requestId, newStatus, adminId, notes = null) => {
  const letter = await Letter.findById(letterId);
  const requestIndex = letter.recipientAddresses.findIndex((addr) => addr.requestId === requestId);

  if (requestIndex === -1) {
    throw new Error("신청을 찾을 수 없습니다.");
  }

  const oldStatus = letter.recipientAddresses[requestIndex].physicalStatus;
  letter.recipientAddresses[requestIndex].physicalStatus = newStatus;
  letter.recipientAddresses[requestIndex].updatedBy = adminId;
  letter.recipientAddresses[requestIndex].updatedAt = new Date();

  if (notes) {
    letter.recipientAddresses[requestIndex].adminNotes = notes;
  }

  // 통계 업데이트
  updateLetterStats(letter, oldStatus, newStatus);

  await letter.save();
  return letter.recipientAddresses[requestIndex];
};
```

### 4. 📈 고급 분석 쿼리

```javascript
// 편지별 신청 현황
const getLetterAnalytics = async () => {
  return await Letter.aggregate([
    { $match: { "recipientAddresses.isPhysicalRequested": true } },
    {
      $project: {
        title: 1,
        authorName: 1,
        createdAt: 1,
        totalRequests: {
          $size: {
            $filter: {
              input: "$recipientAddresses",
              cond: { $eq: ["$$this.isPhysicalRequested", true] },
            },
          },
        },
        pendingCount: {
          $size: {
            $filter: {
              input: "$recipientAddresses",
              cond: { $eq: ["$$this.physicalStatus", "requested"] },
            },
          },
        },
        approvedCount: {
          $size: {
            $filter: {
              input: "$recipientAddresses",
              cond: { $eq: ["$$this.physicalStatus", "approved"] },
            },
          },
        },
      },
    },
    { $sort: { totalRequests: -1 } },
  ]);
};

// 작성자별 통계
const getAuthorAnalytics = async () => {
  return await Letter.aggregate([
    { $unwind: "$recipientAddresses" },
    { $match: { "recipientAddresses.isPhysicalRequested": true } },
    {
      $group: {
        _id: "$userId",
        authorName: { $first: "$authorName" },
        totalLetters: { $addToSet: "$_id" },
        totalRequests: { $sum: 1 },
        pendingRequests: { $sum: { $cond: [{ $eq: ["$recipientAddresses.physicalStatus", "requested"] }, 1, 0] } },
        approvedRequests: { $sum: { $cond: [{ $eq: ["$recipientAddresses.physicalStatus", "approved"] }, 1, 0] } },
      },
    },
    {
      $project: {
        authorName: 1,
        totalLetters: { $size: "$totalLetters" },
        totalRequests: 1,
        pendingRequests: 1,
        approvedRequests: 1,
        approvalRate: {
          $cond: [{ $eq: ["$totalRequests", 0] }, 0, { $multiply: [{ $divide: ["$approvedRequests", "$totalRequests"] }, 100] }],
        },
      },
    },
    { $sort: { totalRequests: -1 } },
  ]);
};
```

## 🚀 새로운 Admin API 엔드포인트

### 필수 구현 API 목록

```javascript
// 1. 대시보드 통계
GET /api/admin/physical-letters/stats

// 2. 신청 목록 조회 (페이지네이션, 필터링)
GET /api/admin/physical-letters/requests?page=1&limit=20&status=requested&search=검색어

// 3. 개별 신청 상세 조회
GET /api/admin/physical-letters/requests/:requestId

// 4. 상태 업데이트
PATCH /api/admin/physical-letters/requests/:requestId/status
Body: { status: "approved", notes: "관리자 메모" }

// 5. 대량 상태 업데이트
PATCH /api/admin/physical-letters/requests/bulk-update
Body: { requestIds: ["id1", "id2"], status: "sent" }

// 6. 편지별 신청 현황
GET /api/admin/physical-letters/letters-analytics

// 7. 작성자별 통계
GET /api/admin/physical-letters/authors-analytics

// 8. 신청 내역 내보내기
GET /api/admin/physical-letters/export?format=csv&status=approved&dateFrom=2025-01-01

// 9. 작성자 설정 관리
GET /api/admin/letters/:letterId/author-settings
PATCH /api/admin/letters/:letterId/author-settings
```

## 🎨 UI/UX 업데이트 요구사항

### 1. 대시보드 위젯

- 전체 신청 통계 카드
- 상태별 진행률 차트
- 일별 신청 추이 그래프
- 긴급 처리 필요 알림

### 2. 신청 관리 테이블

- 실시간 필터링 (상태, 날짜, 검색)
- 대량 선택 및 상태 변경
- 신청 상세 정보 모달
- 편지 내용 미리보기

### 3. 상태 관리 워크플로우

- 드래그 앤 드롭 상태 변경
- 상태 변경 히스토리 추적
- 자동 알림 설정
- 배송 추적 연동

## ⚠️ 마이그레이션 주의사항

### 1. 기존 데이터 마이그레이션

```javascript
// AuthorApprovalPhysicalRequest → Letter.recipientAddresses 마이그레이션 스크립트 필요
const migratePhysicalRequests = async () => {
  const oldRequests = await AuthorApprovalPhysicalRequest.find({});

  for (const request of oldRequests) {
    await Letter.findByIdAndUpdate(request.letterId, {
      $push: {
        recipientAddresses: {
          name: request.recipientName,
          phone: request.recipientPhone,
          zipCode: request.zipCode,
          address1: request.address1,
          address2: request.address2,
          memo: request.memo,
          addedAt: request.createdAt,
          isPhysicalRequested: true,
          physicalRequestDate: request.createdAt,
          physicalStatus: request.status,
          sessionId: request.sessionId,
          requestId: request._id.toString(),
        },
      },
    });
  }
};
```

### 2. 성능 최적화

- `recipientAddresses.requestId` 인덱스 추가
- `recipientAddresses.physicalStatus` 인덱스 추가
- 집계 쿼리 최적화를 위한 복합 인덱스

### 3. 백업 및 롤백 계획

- 마이그레이션 전 전체 데이터 백업
- 단계별 마이그레이션 및 검증
- 롤백 스크립트 준비

## 🔧 개발 우선순위

1. **1단계**: 기본 CRUD API 구현
2. **2단계**: 대시보드 통계 및 분석 기능
3. **3단계**: 고급 필터링 및 검색 기능
4. **4단계**: 대량 처리 및 자동화 기능
5. **5단계**: 알림 및 워크플로우 기능

이제 Admin Panel이 새로운 데이터 구조에 맞춰 완전히 업데이트될 수 있습니다! 🎉
