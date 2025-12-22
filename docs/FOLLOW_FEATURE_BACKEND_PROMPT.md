# 팔로우/팔로잉 기능 백엔드 구현 프롬프트

## 개요

Letter My 서비스에 사용자 간 팔로우/팔로잉 기능을 구현합니다.
사용자들이 서로를 팔로우하여 관심있는 작성자의 새 글을 쉽게 확인할 수 있습니다.

---

## 1. Follow 모델

### 파일: `src/models/Follow.ts`

```typescript
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFollow extends Document {
  followerId: mongoose.Types.ObjectId; // 팔로우하는 사람
  followingId: mongoose.Types.ObjectId; // 팔로우당하는 사람
  createdAt: Date;
}

interface IFollowModel extends Model<IFollow> {
  // 팔로우 관계 확인
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // 팔로우 추가
  addFollow(followerId: string, followingId: string): Promise<IFollow>;

  // 팔로우 제거
  removeFollow(followerId: string, followingId: string): Promise<boolean>;

  // 팔로워 목록 조회
  getFollowers(userId: string): Promise<IFollow[]>;

  // 팔로잉 목록 조회
  getFollowing(userId: string): Promise<IFollow[]>;

  // 팔로워 수 조회
  getFollowerCount(userId: string): Promise<number>;

  // 팔로잉 수 조회
  getFollowingCount(userId: string): Promise<number>;
}

const FollowSchema = new Schema<IFollow, IFollowModel>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// 복합 유니크 인덱스 (중복 팔로우 방지)
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// 팔로우 관계 확인
FollowSchema.statics.isFollowing = function (followerId: string, followingId: string): Promise<boolean> {
  return this.exists({ followerId, followingId }).then((result) => !!result);
};

// 팔로우 추가
FollowSchema.statics.addFollow = function (followerId: string, followingId: string): Promise<IFollow> {
  return this.create({ followerId, followingId });
};

// 팔로우 제거
FollowSchema.statics.removeFollow = function (followerId: string, followingId: string): Promise<boolean> {
  return this.deleteOne({ followerId, followingId }).then((result) => result.deletedCount > 0);
};

// 팔로워 목록 조회 (나를 팔로우하는 사람들)
FollowSchema.statics.getFollowers = function (userId: string): Promise<IFollow[]> {
  return this.find({ followingId: userId }).populate("followerId", "name email image").sort({ createdAt: -1 });
};

// 팔로잉 목록 조회 (내가 팔로우하는 사람들)
FollowSchema.statics.getFollowing = function (userId: string): Promise<IFollow[]> {
  return this.find({ followerId: userId }).populate("followingId", "name email image").sort({ createdAt: -1 });
};

// 팔로워 수 조회
FollowSchema.statics.getFollowerCount = function (userId: string): Promise<number> {
  return this.countDocuments({ followingId: userId });
};

// 팔로잉 수 조회
FollowSchema.statics.getFollowingCount = function (userId: string): Promise<number> {
  return this.countDocuments({ followerId: userId });
};

const Follow = mongoose.model<IFollow, IFollowModel>("Follow", FollowSchema);

export default Follow;
```

---

## 2. Follow 서비스

### 파일: `src/services/followService.ts`

```typescript
import Follow from "../models/Follow";
import User from "../models/User";

class FollowService {
  // 팔로우하기
  async followUser(followerId: string, followingId: string) {
    // 자기 자신 팔로우 방지
    if (followerId === followingId) {
      throw new Error("자기 자신을 팔로우할 수 없습니다");
    }

    // 팔로우할 사용자 존재 확인
    const targetUser = await User.findById(followingId);
    if (!targetUser) {
      throw new Error("존재하지 않는 사용자입니다");
    }

    // 이미 팔로우 중인지 확인
    const isAlreadyFollowing = await Follow.isFollowing(followerId, followingId);
    if (isAlreadyFollowing) {
      throw new Error("이미 팔로우 중입니다");
    }

    return Follow.addFollow(followerId, followingId);
  }

  // 언팔로우하기
  async unfollowUser(followerId: string, followingId: string) {
    const result = await Follow.removeFollow(followerId, followingId);
    if (!result) {
      throw new Error("팔로우 관계가 존재하지 않습니다");
    }
    return result;
  }

  // 팔로우 상태 확인
  async checkFollowStatus(followerId: string, followingId: string) {
    return Follow.isFollowing(followerId, followingId);
  }

  // 팔로워 목록 조회 (페이지네이션)
  async getFollowers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      Follow.find({ followingId: userId }).populate("followerId", "name email image").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Follow.getFollowerCount(userId),
    ]);

    return {
      data: followers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 팔로잉 목록 조회 (페이지네이션)
  async getFollowing(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      Follow.find({ followerId: userId }).populate("followingId", "name email image").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Follow.getFollowingCount(userId),
    ]);

    return {
      data: following,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 사용자 통계 조회
  async getUserStats(userId: string) {
    const [followerCount, followingCount] = await Promise.all([Follow.getFollowerCount(userId), Follow.getFollowingCount(userId)]);

    return {
      followerCount,
      followingCount,
    };
  }

  // 팔로잉하는 사용자들의 최신 글 조회 (피드)
  async getFollowingFeed(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // 내가 팔로우하는 사용자들의 ID 조회
    const followingUsers = await Follow.find({ followerId: userId }).select("followingId");
    const followingIds = followingUsers.map((f) => f.followingId);

    // 팔로우하는 사용자들의 글 조회
    const Letter = require("../models/Letter").default;
    const [letters, total] = await Promise.all([
      Letter.find({
        userId: { $in: followingIds },
        status: "published", // 발행된 글만
      })
        .populate("userId", "name email image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Letter.countDocuments({
        userId: { $in: followingIds },
        status: "published",
      }),
    ]);

    return {
      data: letters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new FollowService();
```

---

## 3. Follow 컨트롤러

### 파일: `src/controllers/followController.ts`

```typescript
import { Request, Response } from "express";
import followService from "../services/followService";

class FollowController {
  // 팔로우하기
  async followUser(req: Request, res: Response): Promise<void> {
    try {
      const followerId = req.user!.userId;
      const { followingId } = req.params;

      const follow = await followService.followUser(followerId, followingId);

      res.status(201).json({
        success: true,
        data: follow,
        message: "팔로우했습니다",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "팔로우에 실패했습니다";
      res.status(400).json({ success: false, message });
    }
  }

  // 언팔로우하기
  async unfollowUser(req: Request, res: Response): Promise<void> {
    try {
      const followerId = req.user!.userId;
      const { followingId } = req.params;

      await followService.unfollowUser(followerId, followingId);

      res.json({
        success: true,
        message: "언팔로우했습니다",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "언팔로우에 실패했습니다";
      res.status(400).json({ success: false, message });
    }
  }

  // 팔로우 상태 확인
  async checkFollowStatus(req: Request, res: Response): Promise<void> {
    try {
      const followerId = req.user!.userId;
      const { userId } = req.params;

      const isFollowing = await followService.checkFollowStatus(followerId, userId);

      res.json({
        success: true,
        data: { isFollowing },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "팔로우 상태 확인에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 팔로워 목록 조회
  async getFollowers(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await followService.getFollowers(userId, page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "팔로워 목록 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 팔로잉 목록 조회
  async getFollowing(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await followService.getFollowing(userId, page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "팔로잉 목록 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 내 팔로워 목록 조회
  async getMyFollowers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await followService.getFollowers(userId, page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "내 팔로워 목록 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 내 팔로잉 목록 조회
  async getMyFollowing(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await followService.getFollowing(userId, page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "내 팔로잉 목록 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 사용자 통계 조회
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const stats = await followService.getUserStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 통계 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 팔로잉 피드 조회 (팔로우하는 사용자들의 최신 글)
  async getFollowingFeed(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await followService.getFollowingFeed(userId, page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "팔로잉 피드 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }
}

export default new FollowController();
```

---

## 4. Follow 라우트

### 파일: `src/routes/followRoutes.ts`

```typescript
import { Router } from "express";
import followController from "../controllers/followController";
import { authenticate } from "../middleware/auth";
import { param } from "express-validator";
import { validate } from "../middleware/validation";

const router: Router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

// 사용자 ID 검증
const userIdValidation = [param("userId").isMongoId().withMessage("Invalid user ID"), param("followingId").isMongoId().withMessage("Invalid user ID"), validate];

/**
 * @route   POST /api/follow/:followingId
 * @desc    사용자 팔로우
 * @access  Private
 */
router.post("/:followingId", userIdValidation, followController.followUser);

/**
 * @route   DELETE /api/follow/:followingId
 * @desc    사용자 언팔로우
 * @access  Private
 */
router.delete("/:followingId", userIdValidation, followController.unfollowUser);

/**
 * @route   GET /api/follow/status/:userId
 * @desc    팔로우 상태 확인
 * @access  Private
 */
router.get("/status/:userId", userIdValidation, followController.checkFollowStatus);

/**
 * @route   GET /api/follow/followers/:userId
 * @desc    특정 사용자의 팔로워 목록 조회
 * @access  Private
 * @query   page, limit
 */
router.get("/followers/:userId", userIdValidation, followController.getFollowers);

/**
 * @route   GET /api/follow/following/:userId
 * @desc    특정 사용자의 팔로잉 목록 조회
 * @access  Private
 * @query   page, limit
 */
router.get("/following/:userId", userIdValidation, followController.getFollowing);

/**
 * @route   GET /api/follow/my/followers
 * @desc    내 팔로워 목록 조회
 * @access  Private
 * @query   page, limit
 */
router.get("/my/followers", followController.getMyFollowers);

/**
 * @route   GET /api/follow/my/following
 * @desc    내 팔로잉 목록 조회
 * @access  Private
 * @query   page, limit
 */
router.get("/my/following", followController.getMyFollowing);

/**
 * @route   GET /api/follow/stats/:userId
 * @desc    사용자 팔로우 통계 조회
 * @access  Private
 */
router.get("/stats/:userId", userIdValidation, followController.getUserStats);

/**
 * @route   GET /api/follow/feed
 * @desc    팔로잉 피드 조회 (팔로우하는 사용자들의 최신 글)
 * @access  Private
 * @query   page, limit
 */
router.get("/feed", followController.getFollowingFeed);

export default router;
```

### `src/routes/index.ts`에 등록

```typescript
import followRoutes from "./followRoutes";

// Follow routes
router.use("/follow", followRoutes);
```

---

## 5. API 엔드포인트 요약

| Method | Endpoint                        | 설명                                   |
| ------ | ------------------------------- | -------------------------------------- |
| POST   | `/api/follow/:followingId`      | 사용자 팔로우                          |
| DELETE | `/api/follow/:followingId`      | 사용자 언팔로우                        |
| GET    | `/api/follow/status/:userId`    | 팔로우 상태 확인                       |
| GET    | `/api/follow/followers/:userId` | 특정 사용자 팔로워 목록                |
| GET    | `/api/follow/following/:userId` | 특정 사용자 팔로잉 목록                |
| GET    | `/api/follow/my/followers`      | 내 팔로워 목록                         |
| GET    | `/api/follow/my/following`      | 내 팔로잉 목록                         |
| GET    | `/api/follow/stats/:userId`     | 사용자 팔로우 통계                     |
| GET    | `/api/follow/feed`              | 팔로잉 피드 (팔로우하는 사용자들의 글) |

---

## 6. 사용 예시

### 팔로우하기

```bash
POST /api/follow/64a7b8c9d1e2f3a4b5c6d7e8
Authorization: Bearer <token>
```

### 팔로잉 피드 조회

```bash
GET /api/follow/feed?page=1&limit=10
Authorization: Bearer <token>
```

### 팔로우 통계 조회

```bash
GET /api/follow/stats/64a7b8c9d1e2f3a4b5c6d7e8
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "followerCount": 150,
    "followingCount": 75
  }
}
```

---

## 구현 순서

1. Follow 모델 생성 (`src/models/Follow.ts`)
2. Follow 서비스 생성 (`src/services/followService.ts`)
3. Follow 컨트롤러 생성 (`src/controllers/followController.ts`)
4. Follow 라우트 생성 및 등록 (`src/routes/followRoutes.ts`)
5. 테스트 및 검증

---

## 추가 고려사항

### 성능 최적화

- 팔로우 관계는 자주 조회되므로 인덱스 최적화 필요
- 팔로워/팔로잉 수가 많은 경우 캐싱 고려

### 알림 기능 연동

- 새로운 팔로워가 생겼을 때 알림
- 팔로우하는 사용자가 새 글을 작성했을 때 알림

### 프라이버시 설정

- 비공개 계정 기능 (팔로우 요청 승인 필요)
- 팔로워/팔로잉 목록 공개 여부 설정
