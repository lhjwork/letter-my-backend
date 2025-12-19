import jwt from "jsonwebtoken";
import Admin, { IAdmin, AdminStatus } from "../models/Admin";

class AdminAuthService {
  // 로그인
  async login(username: string, password: string): Promise<{ admin: IAdmin; token: string }> {
    const admin = await Admin.findByUsername(username);

    if (!admin) {
      throw new Error("아이디 또는 비밀번호가 올바르지 않습니다");
    }

    if (admin.status !== AdminStatus.ACTIVE) {
      throw new Error("비활성화된 계정입니다");
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      throw new Error("아이디 또는 비밀번호가 올바르지 않습니다");
    }

    // 마지막 로그인 시간 업데이트
    admin.lastLoginAt = new Date();
    await admin.save();

    // JWT 토큰 생성
    const token = jwt.sign({ adminId: admin._id, type: "admin" }, process.env.JWT_SECRET!, { expiresIn: "8h" });

    return { admin, token };
  }

  // 비밀번호 변경
  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    const admin = await Admin.findById(adminId);

    if (!admin) {
      throw new Error("관리자를 찾을 수 없습니다");
    }

    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      throw new Error("현재 비밀번호가 올바르지 않습니다");
    }

    admin.password = newPassword;
    await admin.save();
  }
}

export default new AdminAuthService();
