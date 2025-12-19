import Admin, { IAdmin, AdminRole, AdminStatus, Permission, ROLE_PERMISSIONS } from "../models/Admin";
import User from "../models/User";
import Letter from "../models/Letter";

interface AdminQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminRole;
  status?: AdminStatus;
  department?: string;
}

interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
}

interface LetterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  category?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AdminService {
  // ===== 관리자 관리 =====

  async getAdmins(params: AdminQueryParams): Promise<PaginatedResult<IAdmin>> {
    const { page = 1, limit = 20, search, role, status, department } = params;
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [{ username: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }];
    }
    if (role) query.role = role;
    if (status) query.status = status;
    if (department) query.department = department;

    const total = await Admin.countDocuments(query);
    const admins = await Admin.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data: admins,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAdmin(data: { username: string; password: string; name: string; role?: AdminRole; permissions?: Permission[]; department?: string }): Promise<IAdmin> {
    const existing = await Admin.findByUsername(data.username);
    if (existing) {
      throw new Error("이미 존재하는 아이디입니다");
    }

    const admin = new Admin({
      ...data,
      role: data.role || AdminRole.MANAGER,
      permissions: data.permissions || [],
    });

    return admin.save();
  }

  async getAdminById(id: string): Promise<IAdmin | null> {
    return Admin.findById(id);
  }

  async updateAdmin(
    id: string,
    data: Partial<{
      name: string;
      role: AdminRole;
      permissions: Permission[];
      department: string;
      status: AdminStatus;
    }>
  ): Promise<IAdmin | null> {
    return Admin.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const result = await Admin.findByIdAndDelete(id);
    return !!result;
  }

  getRolePermissions(role: AdminRole): Permission[] {
    return ROLE_PERMISSIONS[role];
  }

  // ===== 대시보드 =====

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 사용자 통계
    const [totalUsers, todayUsers, weekUsers, monthUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      User.countDocuments({ createdAt: { $gte: monthStart } }),
    ]);

    // 편지 통계
    const [totalLetters, storyCount, letterCount, todayLetters] = await Promise.all([
      Letter.countDocuments(),
      Letter.countDocuments({ type: "story" }),
      Letter.countDocuments({ type: "letter" }),
      Letter.countDocuments({ createdAt: { $gte: todayStart } }),
    ]);

    // 카테고리별 통계
    const categoryStats = await Letter.aggregate([{ $match: { type: "story" } }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

    // 최근 사용자
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

    // 최근 편지
    const recentLetters = await Letter.find().sort({ createdAt: -1 }).limit(5);

    return {
      users: {
        total: totalUsers,
        today: todayUsers,
        thisWeek: weekUsers,
        thisMonth: monthUsers,
        byStatus: { active: totalUsers, banned: 0, deleted: 0 },
      },
      letters: {
        total: totalLetters,
        stories: storyCount,
        letters: letterCount,
        today: todayLetters,
        byStatus: { created: 0, published: totalLetters, hidden: 0 },
      },
      categories: categoryStats.map((c) => ({ name: c._id || "기타", count: c.count })),
      recentUsers,
      recentLetters,
    };
  }

  // ===== 사용자 관리 =====

  async getUsers(params: UserQueryParams): Promise<PaginatedResult<typeof User.prototype>> {
    const { page = 1, limit = 20, search, status, sort = "createdAt", order = "desc" } = params;
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [{ email: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }];
    }
    if (status) query.status = status;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ [sort]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(id: string) {
    return User.findById(id);
  }

  async updateUser(id: string, data: Record<string, unknown>) {
    return User.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async banUser(id: string, reason: string) {
    return User.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "banned",
          bannedAt: new Date(),
          bannedReason: reason,
        },
      },
      { new: true }
    );
  }

  async unbanUser(id: string) {
    return User.findByIdAndUpdate(
      id,
      {
        $set: { status: "active" },
        $unset: { bannedAt: 1, bannedReason: 1 },
      },
      { new: true }
    );
  }

  async deleteUser(id: string) {
    return User.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "deleted",
          deletedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  // ===== 편지/사연 관리 =====

  async getLetters(params: LetterQueryParams): Promise<PaginatedResult<typeof Letter.prototype>> {
    const { page = 1, limit = 20, search, type, category, status, sort = "createdAt", order = "desc" } = params;
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }, { content: { $regex: search, $options: "i" } }, { authorName: { $regex: search, $options: "i" } }];
    }
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    const total = await Letter.countDocuments(query);
    const letters = await Letter.find(query)
      .sort({ [sort]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data: letters,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLetterById(id: string) {
    return Letter.findById(id);
  }

  async updateLetter(id: string, data: Record<string, unknown>) {
    return Letter.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async updateLetterStatus(id: string, status: string, reason?: string) {
    const updateData: Record<string, unknown> = { status };

    if (status === "hidden") {
      updateData.hiddenAt = new Date();
      if (reason) updateData.hiddenReason = reason;
    } else if (status === "deleted") {
      updateData.deletedAt = new Date();
    }

    return Letter.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async deleteLetter(id: string) {
    return Letter.findByIdAndDelete(id);
  }
}

export default new AdminService();
