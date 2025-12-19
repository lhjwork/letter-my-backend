# 좋아요 기능 백엔드 구현 프롬프트

## 개요

사연/편지에 좋아요 기능을 구현합니다. 사용자는 로그인 후 좋아요를 누를 수 있으며, 중복 좋아요는 불가능합니다.

---

## 데이터 모델 설계

### 방법 1: 별도 Like 컬렉션 (추천)

장점: 좋아요 목록 조회, 통계 분석 용이
단점: 조인 필요

```typescript
// src/models/Like.ts
interface ILike {
  userId: ObjectId;
  letterId: ObjectId;
  createdAt: Date;
}

// 복합 유니크 인덱스로 중복 방지
LikeSchema.index({ userId: 1, letterId: 1 }, { unique: true });
```

### 방법 2: Letter에 likedBy 배열 추가

장점: 조인 불필요
단점: 좋아요 많으면 문서 크기 증가

```typescript
// Letter 모델에 추가
likedBy: [{ type: ObjectId, ref: "User" }];
```

**→ 방법 1 (별도 Like 컬렉션) 추천**

---

## API 엔드포인트

| Method | Endpoint                | 설명               | 인증 |
| ------ | ----------------------- | ------------------ | ---- |
| POST   | `/api/letters/:id/like` | 좋아요 추가        | 필수 |
| DELETE | `/api/letters/:id/like` | 좋아요 취소        | 필수 |
| GET    | `/api/letters/:id/like` | 좋아요 상태 확인   | 필수 |
| GET    | `/api/users/me/likes`   | 내가 좋아요한 목록 | 필수 |

---

## 구현 파일 구조

```
src/
├── models/
│   └── Like.ts                 # Like 모델
├── controllers/
│   └── likeController.ts       # Like 컨트롤러
├── services/
│   └── likeService.ts          # Like 서비스
├── routes/
│   └── likeRoutes.ts           # Like 라우트 (letters에 통합 가능)
└── middleware/
    └── likeValidation.ts       # Like 유효성 검사
```

---

## 1. Like 모델

### 파일: `src/models/Like.ts`

```typescript
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  letterId: mongoose.Types.ObjectId;
  createdAt: Date;
}

interface ILikeModel extends Model<ILike> {
  findByUserAndLetter(userId: string, letterId: string): Promise<ILike | null>;
  countByLetter(letterId: string): Promise<number>;
  findByUserId(userId: string): Promise<ILike[]>;
}

const LikeSchema = new Schema<ILike, ILikeModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    letterId: {
      type: Schema.Types.ObjectId,
      ref: "Letter",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// 복합 유니크 인덱스 (중복 좋아요 방지)
LikeSchema.index({ userId: 1, letterId: 1 }, { unique: true });

// Static 메서드
LikeSchema.statics.findByUserAndLetter = function (userId: string, letterId: string): Promise<ILike | null> {
  return this.findOne({ userId, letterId });
};

LikeSchema.statics.countByLetter = function (letterId: string): Promise<number> {
  return this.countDocuments({ letterId });
};

LikeSchema.statics.findByUserId = function (userId: string): Promise<ILike[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

const Like = mongoose.model<ILike, ILikeModel>("Like", LikeSchema);

export default Like;
```

---

## 2. Like 서비스

### 파일: `src/services/likeService.ts`

```typescript
import Like, { ILike } from "../models/Like";
import Letter from "../models/Letter";

class LikeService {
  // 좋아요 추가
  async addLike(userId: string, letterId: string): Promise<{ like: ILike; likeCount: number }> {
    // 편지 존재 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("Letter not found");
    }

    // 이미 좋아요 했는지 확인
    const existingLike = await Like.findByUserAndLetter(userId, letterId);
    if (existingLike) {
      throw new Error("Already liked");
    }

    // 좋아요 생성
    const like = await Like.create({ userId, letterId });

    // Letter의 likeCount 증가
    await Letter.findByIdAndUpdate(letterId, { $inc: { likeCount: 1 } });

    const likeCount = await Like.countByLetter(letterId);

    return { like, likeCount };
  }

  // 좋아요 취소
  async removeLike(userId: string, letterId: string): Promise<{ likeCount: number }> {
    const like = await Like.findOneAndDelete({ userId, letterId });

    if (!like) {
      throw new Error("Like not found");
    }

    // Letter의 likeCount 감소
    await Letter.findByIdAndUpdate(letterId, { $inc: { likeCount: -1 } });

    const likeCount = await Like.countByLetter(letterId);

    return { likeCount };
  }

  // 좋아요 상태 확인
  async checkLikeStatus(userId: string, letterId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const [like, likeCount] = await Promise.all([Like.findByUserAndLetter(userId, letterId), Like.countByLetter(letterId)]);

    return {
      isLiked: !!like,
      likeCount,
    };
  }

  // 내가 좋아요한 목록
  async getMyLikes(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    likes: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      Like.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("letterId", "title authorName category viewCount likeCount createdAt"),
      Like.countDocuments({ userId }),
    ]);

    return {
      likes: likes.map((like) => like.letterId),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 여러 편지의 좋아요 상태 일괄 확인 (목록 조회 시 사용)
  async checkBulkLikeStatus(userId: string, letterIds: string[]): Promise<Map<string, boolean>> {
    const likes = await Like.find({
      userId,
      letterId: { $in: letterIds },
    });

    const likeMap = new Map<string, boolean>();
    letterIds.forEach((id) => likeMap.set(id, false));
    likes.forEach((like) => likeMap.set(like.letterId.toString(), true));

    return likeMap;
  }
}

export default new LikeService();
```

---

## 3. Like 컨트롤러

### 파일: `src/controllers/likeController.ts`

```typescript
import { Request, Response } from "express";
import likeService from "../services/likeService";

class LikeController {
  // 좋아요 추가
  async addLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await likeService.addLike(userId, letterId);

      res.status(201).json({
        success: true,
        message: "좋아요를 눌렀습니다",
        data: {
          isLiked: true,
          likeCount: result.likeCount,
        },
      });
    } catch (error: any) {
      if (error.message === "Letter not found") {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다" });
        return;
      }
      if (error.message === "Already liked") {
        res.status(409).json({ success: false, message: "이미 좋아요를 눌렀습니다" });
        return;
      }
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }

  // 좋아요 취소
  async removeLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await likeService.removeLike(userId, letterId);

      res.status(200).json({
        success: true,
        message: "좋아요를 취소했습니다",
        data: {
          isLiked: false,
          likeCount: result.likeCount,
        },
      });
    } catch (error: any) {
      if (error.message === "Like not found") {
        res.status(404).json({ success: false, message: "좋아요 기록을 찾을 수 없습니다" });
        return;
      }
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }

  // 좋아요 상태 확인
  async checkLikeStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await likeService.checkLikeStatus(userId, letterId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }

  // 내가 좋아요한 목록
  async getMyLikes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await likeService.getMyLikes(userId, page, limit);

      res.status(200).json({
        success: true,
        data: result.likes,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }
}

export default new LikeController();
```

---

## 4. 라우트 등록

### 파일: `src/routes/letters.ts`에 추가

```typescript
import likeController from "../controllers/likeController";

// 좋아요 추가
router.post("/:id/like", authenticate, letterIdValidation, likeController.addLike);

// 좋아요 취소
router.delete("/:id/like", authenticate, letterIdValidation, likeController.removeLike);

// 좋아요 상태 확인
router.get("/:id/like", authenticate, letterIdValidation, likeController.checkLikeStatus);
```

### 파일: `src/routes/users.ts`에 추가

```typescript
import likeController from "../controllers/likeController";

// 내가 좋아요한 목록
router.get("/me/likes", authenticate, likeController.getMyLikes);
```

---

## API 응답 형식

### 좋아요 추가/취소 응답

```json
{
  "success": true,
  "message": "좋아요를 눌렀습니다",
  "data": {
    "isLiked": true,
    "likeCount": 42
  }
}
```

### 좋아요 상태 확인 응답

```json
{
  "success": true,
  "data": {
    "isLiked": true,
    "likeCount": 42
  }
}
```

### 내가 좋아요한 목록 응답

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "엄마에게",
      "authorName": "익명",
      "category": "가족",
      "viewCount": 123,
      "likeCount": 42,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 구현 순서

1. Like 모델 생성 (`src/models/Like.ts`)
2. Like 서비스 생성 (`src/services/likeService.ts`)
3. Like 컨트롤러 생성 (`src/controllers/likeController.ts`)
4. 라우트 등록 (letters.ts, users.ts)
5. Swagger 문서 추가
