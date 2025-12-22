import User from "../models/User";
import Letter from "../models/Letter";
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

export interface UserWithStats {
  _id: any;
  email: string;
  name: string;
  image?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  addresses?: any[];
  oauthAccounts?: any[];
  inactiveAt?: Date;
  inactiveReason?: string;
  deletedAt?: Date;
  letterCount?: number;
  lastActiveAt?: Date;
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
        { $sort: { letterCount: sortOrder === "desc" ? -1 : 1 } as any },
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
            oauthAccounts: 1,
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

  // 사용자 검색 (letterCount와 lastActiveAt 추가)
  async searchUsers(searchTerm: string, limit: number = 10, status?: string) {
    const query: any = {
      $or: [{ name: { $regex: searchTerm, $options: "i" } }, { email: { $regex: searchTerm, $options: "i" } }],
    };

    // 상태 필터 추가
    if (status && status !== "all") {
      query.status = status;
    }

    const users = await User.find(query).limit(limit).select("name email image status createdAt updatedAt").lean();

    // 각 사용자의 편지 수 추가
    const usersWithLetterCount = await Promise.all(
      users.map(async (user) => {
        const letterCount = await Letter.countDocuments({ userId: user._id });
        return {
          ...user,
          letterCount,
          lastActiveAt: user.updatedAt,
        };
      })
    );

    return usersWithLetterCount;
  }

  // 사용자 상세 정보 조회 (letterCount 추가)
  async getUserDetail(userId: string): Promise<UserWithStats | null> {
    const user = await User.findById(userId).select("-__v").lean();
    if (!user) return null;

    const [stats, letterCount] = await Promise.all([this.getUserStats(userId), Letter.countDocuments({ userId })]);

    return {
      ...user,
      letterCount,
      lastActiveAt: user.updatedAt,
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

  // 사용자 작성 편지 목록 (status 필터링 추가)
  async getUserLetters(userId: string, page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;

    // 쿼리 조건
    const query: any = { userId };
    if (status && status !== "all") {
      query.status = status;
    }

    const [letters, totalCount] = await Promise.all([Letter.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-__v").lean(), Letter.countDocuments(query)]);

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
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === "inactive") {
      updateData.inactiveAt = new Date();
    } else {
      updateData.inactiveAt = undefined;
      updateData.inactiveReason = undefined;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select("-__v");

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
