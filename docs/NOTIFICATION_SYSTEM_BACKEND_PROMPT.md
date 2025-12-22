# 알림 시스템 백엔드 구현 프롬프트

## 개요

Letter My 서비스에 실시간 알림 시스템을 구현합니다.
사용자들이 중요한 활동(팔로우, 좋아요, 새 글 등)에 대한 알림을 받을 수 있습니다.

---

## 1. Notification 모델

### 파일: `src/models/Notification.ts`

```typescript
import mongoose, { Schema, Document, Model } from "mongoose";

// 알림 타입
export enum NotificationType {
  NEW_FOLLOWER = "new_follower", // 새로운 팔로워
  NEW_LIKE = "new_like", // 내 글에 좋아요
  NEW_LETTER = "new_letter", // 팔로우하는 사용자의 새 글
  SYSTEM_NOTICE = "system_notice", // 시스템 공지사항
}

// 알림 상태
export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
}

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId; // 알림 받는 사용자
  senderId?: mongoose.Types.ObjectId; // 알림 보낸 사용자 (시스템 알림의 경우 null)
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  relatedId?: mongoose.Types.ObjectId; // 관련 객체 ID (편지, 사용자 등)
  relatedType?: string; // 관련 객체 타입 (Letter, User 등)
  metadata?: Record<string, any>; // 추가 메타데이터
  createdAt: Date;
  readAt?: Date;
}

interface INotificationModel extends Model<INotification> {
  // 읽지 않은 알림 개수
  getUnreadCount(userId: string): Promise<number>;

  // 알림 읽음 처리
  markAsRead(notificationId: string): Promise<INotification | null>;

  // 모든 알림 읽음 처리
  markAllAsRead(userId: string): Promise<number>;

  // 사용자별 알림 목록 조회
  getUserNotifications(
    userId: string,
    page: number,
    limit: number
  ): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
  }>;
}

const NotificationSchema = new Schema<INotification, INotificationModel>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.UNREAD,
      index: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    relatedType: {
      type: String,
      enum: ["Letter", "User", "Follow", "Like"],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    readAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// 복합 인덱스
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

// 읽지 않은 알림 개수
NotificationSchema.statics.getUnreadCount = function (userId: string): Promise<number> {
  return this.countDocuments({
    recipientId: userId,
    status: NotificationStatus.UNREAD,
  });
};

// 알림 읽음 처리
NotificationSchema.statics.markAsRead = function (notificationId: string): Promise<INotification | null> {
  return this.findByIdAndUpdate(
    notificationId,
    {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
    { new: true }
  );
};

// 모든 알림 읽음 처리
NotificationSchema.statics.markAllAsRead = function (userId: string): Promise<number> {
  return this.updateMany(
    {
      recipientId: userId,
      status: NotificationStatus.UNREAD,
    },
    {
      status: NotificationStatus.READ,
      readAt: new Date(),
    }
  ).then((result) => result.modifiedCount);
};

// 사용자별 알림 목록 조회
NotificationSchema.statics.getUserNotifications = async function (userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    this.find({ recipientId: userId }).populate("senderId", "name email image").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    this.countDocuments({ recipientId: userId }),
    this.getUnreadCount(userId),
  ]);

  return { notifications, total, unreadCount };
};

const Notification = mongoose.model<INotification, INotificationModel>("Notification", NotificationSchema);

export default Notification;
```

---

## 2. Notification 서비스

### 파일: `src/services/notificationService.ts`

```typescript
import Notification, { NotificationType, INotification } from "../models/Notification";
import User from "../models/User";

class NotificationService {
  // 알림 생성
  async createNotification(data: {
    recipientId: string;
    senderId?: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    metadata?: Record<string, any>;
  }): Promise<INotification> {
    const notification = new Notification(data);
    const savedNotification = await notification.save();

    // 실시간 알림 전송 (WebSocket/SSE)
    await this.sendRealTimeNotification(savedNotification);

    return savedNotification;
  }

  // 새 팔로워 알림
  async createFollowerNotification(followerId: string, followingId: string): Promise<void> {
    const follower = await User.findById(followerId).select("name");
    if (!follower) return;

    await this.createNotification({
      recipientId: followingId,
      senderId: followerId,
      type: NotificationType.NEW_FOLLOWER,
      title: "새로운 팔로워",
      message: `${follower.name}님이 회원님을 팔로우했습니다.`,
      relatedId: followerId,
      relatedType: "User",
    });
  }

  // 좋아요 알림
  async createLikeNotification(likerId: string, letterId: string, letterAuthorId: string): Promise<void> {
    // 자기 글에 자기가 좋아요 한 경우 알림 안함
    if (likerId === letterAuthorId) return;

    const liker = await User.findById(likerId).select("name");
    if (!liker) return;

    await this.createNotification({
      recipientId: letterAuthorId,
      senderId: likerId,
      type: NotificationType.NEW_LIKE,
      title: "새로운 좋아요",
      message: `${liker.name}님이 회원님의 글을 좋아합니다.`,
      relatedId: letterId,
      relatedType: "Letter",
    });
  }

  // 새 글 알림 (팔로워들에게)
  async createNewLetterNotification(authorId: string, letterId: string, letterTitle: string): Promise<void> {
    const Follow = require("../models/Follow").default;
    const author = await User.findById(authorId).select("name");
    if (!author) return;

    // 작성자를 팔로우하는 사용자들 조회
    const followers = await Follow.find({ followingId: authorId }).select("followerId");

    // 각 팔로워에게 알림 생성
    const notifications = followers.map((follow: any) => ({
      recipientId: follow.followerId,
      senderId: authorId,
      type: NotificationType.NEW_LETTER,
      title: "새로운 글",
      message: `${author.name}님이 새 글 "${letterTitle}"을 작성했습니다.`,
      relatedId: letterId,
      relatedType: "Letter",
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);

      // 실시간 알림 전송
      for (const notification of notifications) {
        await this.sendRealTimeNotification(notification as any);
      }
    }
  }

  // 시스템 공지사항 알림
  async createSystemNotification(data: {
    title: string;
    message: string;
    targetUserIds?: string[]; // 특정 사용자들에게만 (없으면 전체)
    metadata?: Record<string, any>;
  }): Promise<void> {
    let targetUsers: string[];

    if (data.targetUserIds) {
      targetUsers = data.targetUserIds;
    } else {
      // 전체 사용자에게 알림
      const users = await User.find({}).select("_id");
      targetUsers = users.map((user) => user._id.toString());
    }

    const notifications = targetUsers.map((userId) => ({
      recipientId: userId,
      type: NotificationType.SYSTEM_NOTICE,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  }

  // 사용자 알림 목록 조회
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    return Notification.getUserNotifications(userId, page, limit);
  }

  // 읽지 않은 알림 개수
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.getUnreadCount(userId);
  }

  // 알림 읽음 처리
  async markAsRead(notificationId: string): Promise<INotification | null> {
    return Notification.markAsRead(notificationId);
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(userId: string): Promise<number> {
    return Notification.markAllAsRead(userId);
  }

  // 알림 삭제
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
    });
    return !!result;
  }

  // 오래된 알림 정리 (30일 이상)
  async cleanupOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
    });

    return result.deletedCount;
  }

  // 실시간 알림 전송 (WebSocket/SSE)
  private async sendRealTimeNotification(notification: INotification): Promise<void> {
    // TODO: WebSocket 또는 Server-Sent Events로 실시간 알림 전송
    // 현재는 로그만 출력
    console.log(`Real-time notification sent to user ${notification.recipientId}:`, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
    });
  }
}

export default new NotificationService();
```

---

## 3. Notification 컨트롤러

### 파일: `src/controllers/notificationController.ts`

```typescript
import { Request, Response } from "express";
import notificationService from "../services/notificationService";

class NotificationController {
  // 내 알림 목록 조회
  async getMyNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      if (page < 1 || limit < 1) {
        res.status(400).json({
          success: false,
          message: "page와 limit은 1 이상의 값이어야 합니다.",
        });
        return;
      }

      const result = await notificationService.getUserNotifications(userId, page, limit);

      res.json({
        success: true,
        data: result.notifications,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNextPage: page < Math.ceil(result.total / limit),
          hasPrevPage: page > 1,
        },
        unreadCount: result.unreadCount,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "알림 목록 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 읽지 않은 알림 개수 조회
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const count = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "읽지 않은 알림 개수 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 알림 읽음 처리
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id);

      if (!notification) {
        res.status(404).json({
          success: false,
          message: "알림을 찾을 수 없습니다",
        });
        return;
      }

      res.json({
        success: true,
        data: notification,
        message: "알림을 읽음 처리했습니다",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "알림 읽음 처리에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const count = await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        data: { updatedCount: count },
        message: `${count}개의 알림을 읽음 처리했습니다`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "모든 알림 읽음 처리에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 알림 삭제
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const deleted = await notificationService.deleteNotification(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "알림을 찾을 수 없습니다",
        });
        return;
      }

      res.json({
        success: true,
        message: "알림을 삭제했습니다",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "알림 삭제에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 시스템 공지사항 생성 (관리자 전용)
  async createSystemNotification(req: Request, res: Response): Promise<void> {
    try {
      const { title, message, targetUserIds, metadata } = req.body;

      if (!title || !message) {
        res.status(400).json({
          success: false,
          message: "제목과 내용은 필수입니다",
        });
        return;
      }

      await notificationService.createSystemNotification({
        title,
        message,
        targetUserIds,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: "시스템 알림을 생성했습니다",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "시스템 알림 생성에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }
}

export default new NotificationController();
```

---

## 4. Notification 라우트

### 파일: `src/routes/notificationRoutes.ts`

```typescript
import { Router } from "express";
import notificationController from "../controllers/notificationController";
import { authenticate } from "../middleware/auth";
import { adminAuth } from "../middleware/adminAuth";
import { param, body } from "express-validator";
import { validate } from "../middleware/validation";

const router: Router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

// MongoDB ObjectId 검증
const objectIdValidation = [param("id").isMongoId().withMessage("Invalid notification ID"), validate];

// 시스템 알림 생성 검증
const systemNotificationValidation = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 100 }).withMessage("Title must be less than 100 characters"),
  body("message").trim().notEmpty().withMessage("Message is required").isLength({ max: 500 }).withMessage("Message must be less than 500 characters"),
  body("targetUserIds").optional().isArray().withMessage("Target user IDs must be an array"),
  body("targetUserIds.*").optional().isMongoId().withMessage("Invalid user ID in target list"),
  body("metadata").optional().isObject().withMessage("Metadata must be an object"),
  validate,
];

/**
 * @route   GET /api/notifications
 * @desc    내 알림 목록 조회
 * @access  Private
 * @query   page, limit
 */
router.get("/", notificationController.getMyNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    읽지 않은 알림 개수 조회
 * @access  Private
 */
router.get("/unread-count", notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    알림 읽음 처리
 * @access  Private
 */
router.put("/:id/read", objectIdValidation, notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    모든 알림 읽음 처리
 * @access  Private
 */
router.put("/read-all", notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    알림 삭제
 * @access  Private
 */
router.delete("/:id", objectIdValidation, notificationController.deleteNotification);

/**
 * @route   POST /api/notifications/system
 * @desc    시스템 공지사항 생성 (관리자 전용)
 * @access  Admin
 */
router.post("/system", adminAuth, systemNotificationValidation, notificationController.createSystemNotification);

export default router;
```

### `src/routes/index.ts`에 등록

```typescript
import notificationRoutes from "./notificationRoutes";

// Notification routes
router.use("/notifications", notificationRoutes);
```

---

## 5. 기존 서비스와 연동

### 5.1 Follow 서비스 연동

```typescript
// src/services/followService.ts에 추가
import notificationService from "./notificationService";

// followUser 메서드에 추가
async followUser(followerId: string, followingId: string) {
  // ... 기존 코드 ...

  const follow = await Follow.addFollow(followerId, followingId);

  // 팔로우 알림 생성
  await notificationService.createFollowerNotification(followerId, followingId);

  return follow;
}
```

### 5.2 Like 서비스 연동

```typescript
// src/services/likeService.ts에 추가
import notificationService from "./notificationService";

// addLike 메서드에 추가
async addLike(userId: string, letterId: string) {
  // ... 기존 코드 ...

  const like = await Like.create({ userId, letterId });

  // 편지 작성자에게 좋아요 알림
  const letter = await Letter.findById(letterId).select("userId title");
  if (letter && letter.userId) {
    await notificationService.createLikeNotification(
      userId,
      letterId,
      letter.userId.toString()
    );
  }

  return like;
}
```

### 5.3 Letter 서비스 연동

```typescript
// src/services/letterService.ts에 추가
import notificationService from "./notificationService";

// createStory 메서드에 추가
async createStory(data: CreateStoryData): Promise<ILetter> {
  const letter = await new Letter({...}).save();

  // 팔로워들에게 새 글 알림
  if (data.userId) {
    await notificationService.createNewLetterNotification(
      data.userId,
      letter._id.toString(),
      letter.title
    );
  }

  return letter;
}
```

---

## 6. API 엔드포인트 요약

| Method | Endpoint                          | 설명                      |
| ------ | --------------------------------- | ------------------------- |
| GET    | `/api/notifications`              | 내 알림 목록 조회         |
| GET    | `/api/notifications/unread-count` | 읽지 않은 알림 개수       |
| PUT    | `/api/notifications/:id/read`     | 알림 읽음 처리            |
| PUT    | `/api/notifications/read-all`     | 모든 알림 읽음 처리       |
| DELETE | `/api/notifications/:id`          | 알림 삭제                 |
| POST   | `/api/notifications/system`       | 시스템 알림 생성 (관리자) |

---

## 7. 실시간 알림 (선택사항)

### WebSocket 또는 Server-Sent Events 구현

```typescript
// src/services/realTimeService.ts
import { Server } from "socket.io";

class RealTimeService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  // 특정 사용자에게 알림 전송
  sendNotificationToUser(userId: string, notification: any) {
    this.io.to(`user_${userId}`).emit("notification", notification);
  }

  // 사용자 소켓 연결 관리
  handleUserConnection(socket: any, userId: string) {
    socket.join(`user_${userId}`);

    socket.on("disconnect", () => {
      socket.leave(`user_${userId}`);
    });
  }
}

export default RealTimeService;
```

---

## 8. 정리 작업 스케줄러

### 파일: `src/jobs/notificationCleanup.ts`

```typescript
import cron from "node-cron";
import notificationService from "../services/notificationService";

// 매일 새벽 2시에 오래된 알림 정리
cron.schedule("0 2 * * *", async () => {
  try {
    const deletedCount = await notificationService.cleanupOldNotifications();
    console.log(`Cleaned up ${deletedCount} old notifications`);
  } catch (error) {
    console.error("Failed to cleanup old notifications:", error);
  }
});
```

---

## 구현 순서

1. **Notification 모델** (`src/models/Notification.ts`)
2. **Notification 서비스** (`src/services/notificationService.ts`)
3. **Notification 컨트롤러** (`src/controllers/notificationController.ts`)
4. **Notification 라우트** (`src/routes/notificationRoutes.ts`)
5. **기존 서비스와 연동** (Follow, Like, Letter)
6. **실시간 알림** (선택사항)
7. **정리 작업 스케줄러** (선택사항)
8. **테스트 및 검증**

---

## 추가 고려사항

### 성능 최적화

- 알림 배치 처리 (대량 알림 시)
- 인덱스 최적화
- 캐싱 전략

### 사용자 경험

- 알림 설정 (타입별 on/off)
- 알림 그룹화
- 푸시 알림 연동

### 보안

- 알림 권한 검증
- 스팸 방지
- Rate Limiting

이 프롬프트를 따라 구현하면 완전한 알림 시스템을 구축할 수 있습니다!
