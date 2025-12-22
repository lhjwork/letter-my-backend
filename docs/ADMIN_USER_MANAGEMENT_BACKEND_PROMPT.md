# 어드민 사용자 관리 백엔드 구현 프롬프트

## 개요

Letter My 서비스의 어드민을 위한 사용자 관리 기능을 구현합니다.
어드민이 사용자 목록을 조회하고, 검색하며, 사용자 상세 정보와 작성한 사연/답장을 관리할 수 있습니다.

---

## 1. API 엔드포인트 설계

### 기본 URL: `/api/admin/users`

| Method | Endpoint                           | 설명                            | 권한        |
| ------ | ---------------------------------- | ------------------------------- | ----------- |
| GET    | `/api/admin/users`                 | 사용자 목록 조회 (페이지네이션) | admin 이상  |
| GET    | `/api/admin/users/search`          | 사용자 검색                     | admin 이상  |
| GET    | `/api/admin/users/:userId`         | 사용자 상세 정보 조회           | admin 이상  |
| GET    | `/api/admin/users/:userId/letters` | 사용자 작성 편지 목록           | admin 이상  |
| GET    | `/api/admin/users/:userId/stats`   | 사용자 통계 정보                | admin 이상  |
| PUT    | `/api/admin/users/:userId/status`  | 사용자 상태 변경 (활성/비활성)  | super_admin |
| DELETE | `/api/admin/users/:userId`         | 사용자 삭제                     | super_admin |

---

## 2. 서비스 구현

### `src/services/adminUserService.ts`

```typescript
import User, { IUser } from "../models/User";
import Letter, { ILetter } from "../models/Letter";
import mongoose from "mongoose";

export interface UserListQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: "createdAt" | "name" | "letterCount";
  sortOrder?: "asc" | "desc";
  status?: "active" | "inactive" | "all";
}

export interface UserStats {
  totalLetters: number;
  totalStories: number;
  totalViews: number;
  totalLikes: number;
  joinedAt: Date;
  lastActiveAt?: Date;
}

export interface UserWithStats extends IUser {
  stats: UserStats;
}

class AdminUserService {
  // 사용자 목록 조회 (페이지네이션)
  async getUserList(query: UserListQuery) {
    const { page, limit, search, sortBy = "createdAt", sortOrder = "desc", status = "all" } = query;
    const skip = (page - 1) * limit;

    // 기본 쿼리
    const matchQuery: any = {};

    // 상태 필터
    if (status !== "all") {
      matchQuery.status = status;
    }

    // 검색 조건
    if (search) {
      matchQuery.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    }

    // 정렬 조건
    const sortOption: any = {};
    if (sortBy === "letterCount") {
      // 편지 수로 정렬하는 경우 aggregation 사용
      const pipeline = [
        { $match: matchQuery },
        {
          $lookup: {
            from: "letters",
            localField: "_id",
            foreignField: "userId",
            as: "letters",
          },
        },
        {
          $addFields: {
            letterCount: { $size: "$letters" },
          },
        },
        { $sort: { letterCount: sortOrder === "desc" ? -1 : 1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            name: 1,
            email: 1,
            image: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            letterCount: 1,
            addresses: 1,
            oauthProviders: 1,
          },
        },
      ];

      const [users, totalCount] = await Promise.all([User.aggregate(pipeline), User.countDocuments(matchQuery)]);

      return {
        users,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
      };
    } else {
      // 일반 정렬
      sortOption[sortBy] = sortOrder === "desc" ? -1 : 1;

      const [users, totalCount] = await Promise.all([User.find(matchQuery).sort(sortOption).skip(skip).limit(limit).select("-__v").lean(), User.countDocuments(matchQuery)]);

      // 각 사용자의 편지 수 추가
      const usersWithLetterCount = await Promise.all(
        users.map(async (user) => {
          const letterCount = await Letter.countDocuments({ userId: user._id });
          return { ...user, letterCount };
        })
      );

      return {
        users: usersWithLetterCount,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
      };
    }
  }

  // 사용자 검색
  async searchUsers(searchTerm: string, limit: number = 10) {
    const users = await User.find({
      $or: [{ name: { $regex: searchTerm, $options: "i" } }, { email: { $regex: searchTerm, $options: "i" } }],
    })
      .limit(limit)
      .select("name email image status createdAt")
      .lean();

    return users;
  }

  // 사용자 상세 정보 조회
  async getUserDetail(userId: string): Promise<UserWithStats | null> {
    const user = await User.findById(userId).select("-__v").lean();
    if (!user) return null;

    const stats = await this.getUserStats(userId);

    return {
      ...user,
      stats,
    } as UserWithStats;
  }

  // 사용자 통계 정보
  async getUserStats(userId: string): Promise<UserStats> {
    const [letterStats, user] = await Promise.all([
      Letter.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalLetters: { $sum: 1 },
            totalStories: {
              $sum: { $cond: [{ $eq: ["$type", "story"] }, 1, 0] },
            },
            totalViews: { $sum: "$viewCount" },
            totalLikes: { $sum: "$likeCount" },
          },
        },
      ]),
      User.findById(userId).select("createdAt updatedAt").lean(),
    ]);

    const stats = letterStats[0] || {
      totalLetters: 0,
      totalStories: 0,
      totalViews: 0,
      totalLikes: 0,
    };

    return {
      ...stats,
      joinedAt: user?.createdAt || new Date(),
      lastActiveAt: user?.updatedAt,
    };
  }

  // 사용자 작성 편지 목록
  async getUserLetters(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [letters, totalCount] = await Promise.all([Letter.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-__v").lean(), Letter.countDocuments({ userId })]);

    return {
      letters,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  // 사용자 상태 변경
  async updateUserStatus(userId: string, status: "active" | "inactive") {
    const user = await User.findByIdAndUpdate(userId, { status, updatedAt: new Date() }, { new: true, runValidators: true }).select("-__v");

    return user;
  }

  // 사용자 삭제 (소프트 삭제)
  async deleteUser(userId: string) {
    // 사용자의 모든 편지도 함께 삭제 처리
    await Promise.all([
      User.findByIdAndUpdate(userId, {
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
      }),
      Letter.updateMany(
        { userId },
        {
          status: "deleted",
          deletedAt: new Date(),
          updatedAt: new Date(),
        }
      ),
    ]);

    return true;
  }

  // 대시보드용 사용자 통계
  async getDashboardStats() {
    const [userStats, recentUsers] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            inactiveUsers: {
              $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
            },
          },
        },
      ]),
      User.find({ status: "active" }).sort({ createdAt: -1 }).limit(5).select("name email createdAt").lean(),
    ]);

    const stats = userStats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
    };

    return {
      ...stats,
      recentUsers,
    };
  }
}

export default new AdminUserService();
```

---

## 3. 컨트롤러 구현

### `src/controllers/adminUserController.ts`

```typescript
import { Request, Response } from "express";
import adminUserService, { UserListQuery } from "../services/adminUserService";

class AdminUserController {
  // 사용자 목록 조회
  async getUserList(req: Request, res: Response): Promise<void> {
    try {
      const query: UserListQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        search: req.query.search as string,
        sortBy: (req.query.sortBy as "createdAt" | "name" | "letterCount") || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
        status: (req.query.status as "active" | "inactive" | "all") || "all",
      };

      // 파라미터 검증
      if (query.page < 1 || query.limit < 1) {
        res.status(400).json({
          success: false,
          message: "page와 limit은 1 이상의 값이어야 합니다.",
        });
        return;
      }

      const result = await adminUserService.getUserList(query);

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 목록 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 사용자 검색
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { q: searchTerm, limit } = req.query;

      if (!searchTerm) {
        res.status(400).json({
          success: false,
          message: "검색어가 필요합니다.",
        });
        return;
      }

      const users = await adminUserService.searchUsers(searchTerm as string, parseInt(limit as string) || 10);

      res.json({
        success: true,
        data: users,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 검색에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 사용자 상세 정보 조회
  async getUserDetail(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await adminUserService.getUserDetail(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "사용자를 찾을 수 없습니다.",
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 상세 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 사용자 통계 정보
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const stats = await adminUserService.getUserStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 통계 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 사용자 작성 편지 목록
  async getUserLetters(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (page < 1 || limit < 1) {
        res.status(400).json({
          success: false,
          message: "page와 limit은 1 이상의 값이어야 합니다.",
        });
        return;
      }

      const result = await adminUserService.getUserLetters(userId, page, limit);

      res.json({
        success: true,
        data: result.letters,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 편지 목록 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 사용자 상태 변경
  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!["active", "inactive"].includes(status)) {
        res.status(400).json({
          success: false,
          message: "상태는 'active' 또는 'inactive'여야 합니다.",
        });
        return;
      }

      const user = await adminUserService.updateUserStatus(userId, status);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "사용자를 찾을 수 없습니다.",
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: `사용자 상태가 ${status}로 변경되었습니다.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 상태 변경에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 사용자 삭제
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      await adminUserService.deleteUser(userId);

      res.json({
        success: true,
        message: "사용자가 삭제되었습니다.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 삭제에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }

  // 대시보드 통계
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminUserService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "대시보드 통계 조회에 실패했습니다";
      res.status(500).json({ success: false, message });
    }
  }
}

export default new AdminUserController();
```

---

## 4. 라우트 구현

### `src/routes/adminUserRoutes.ts`

```typescript
import { Router } from "express";
import adminUserController from "../controllers/adminUserController";
import { adminAuth, requireRole } from "../middleware/adminAuth";
import { param, query, body } from "express-validator";
import { validate } from "../middleware/validation";

const router: Router = Router();

// 모든 라우트에 어드민 인증 필요
router.use(adminAuth);

// 사용자 ID 검증
const userIdValidation = [param("userId").isMongoId().withMessage("Invalid user ID"), validate];

// 페이지네이션 검증
const paginationValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  validate,
];

// 검색 검증
const searchValidation = [query("q").notEmpty().withMessage("Search term is required"), query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"), validate];

// 상태 변경 검증
const statusValidation = [body("status").isIn(["active", "inactive"]).withMessage("Status must be 'active' or 'inactive'"), validate];

/**
 * @route   GET /api/admin/users
 * @desc    사용자 목록 조회 (페이지네이션)
 * @access  Admin
 * @query   page, limit, search, sortBy, sortOrder, status
 */
router.get("/", requireRole("admin"), paginationValidation, adminUserController.getUserList);

/**
 * @route   GET /api/admin/users/search
 * @desc    사용자 검색
 * @access  Admin
 * @query   q (검색어), limit
 */
router.get("/search", requireRole("admin"), searchValidation, adminUserController.searchUsers);

/**
 * @route   GET /api/admin/users/dashboard-stats
 * @desc    대시보드용 사용자 통계
 * @access  Admin
 */
router.get("/dashboard-stats", requireRole("admin"), adminUserController.getDashboardStats);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    사용자 상세 정보 조회
 * @access  Admin
 */
router.get("/:userId", requireRole("admin"), userIdValidation, adminUserController.getUserDetail);

/**
 * @route   GET /api/admin/users/:userId/stats
 * @desc    사용자 통계 정보
 * @access  Admin
 */
router.get("/:userId/stats", requireRole("admin"), userIdValidation, adminUserController.getUserStats);

/**
 * @route   GET /api/admin/users/:userId/letters
 * @desc    사용자 작성 편지 목록
 * @access  Admin
 * @query   page, limit
 */
router.get("/:userId/letters", requireRole("admin"), userIdValidation, paginationValidation, adminUserController.getUserLetters);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    사용자 상태 변경 (활성/비활성)
 * @access  Super Admin
 */
router.put("/:userId/status", requireRole("super_admin"), userIdValidation, statusValidation, adminUserController.updateUserStatus);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    사용자 삭제
 * @access  Super Admin
 */
router.delete("/:userId", requireRole("super_admin"), userIdValidation, adminUserController.deleteUser);

export default router;
```

### `src/routes/adminRoutes.ts`에 등록

```typescript
import adminUserRoutes from "./adminUserRoutes";

// 사용자 관리 라우트
router.use("/users", adminUserRoutes);
```

---

## 5. User 모델 확장

### `src/models/User.ts`에 추가

```typescript
// User 스키마에 status 필드 추가
status: {
  type: String,
  enum: ["active", "inactive", "deleted"],
  default: "active",
  index: true,
},
deletedAt: {
  type: Date,
  index: true,
},
```

---

## 6. 사용 예시

### 사용자 목록 조회

```bash
GET /api/admin/users?page=1&limit=20&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <admin_token>
```

### 사용자 검색

```bash
GET /api/admin/users/search?q=홍길동&limit=10
Authorization: Bearer <admin_token>
```

### 사용자 상세 정보

```bash
GET /api/admin/users/64a7b8c9d1e2f3a4b5c6d7e8
Authorization: Bearer <admin_token>
```

### 사용자 편지 목록

```bash
GET /api/admin/users/64a7b8c9d1e2f3a4b5c6d7e8/letters?page=1&limit=10
Authorization: Bearer <admin_token>
```

---

## 구현 순서

1. **User 모델 확장** (status, deletedAt 필드 추가)
2. **AdminUserService 구현** (사용자 관리 로직)
3. **AdminUserController 구현** (API 엔드포인트)
4. **AdminUserRoutes 구현** (라우팅 및 검증)
5. **기존 adminRoutes에 등록**
6. **테스트 및 검증**

---

## 추가 고려사항

### 성능 최적화

- 사용자 목록 조회 시 인덱스 활용
- 편지 수 계산 시 aggregation 파이프라인 최적화

### 보안

- 민감한 정보 (비밀번호 등) 제외
- 권한별 접근 제어 (admin, super_admin)

### 로깅

- 사용자 상태 변경, 삭제 등 중요 작업 로그 기록

이 구현을 통해 어드민이 효율적으로 사용자를 관리할 수 있습니다!
