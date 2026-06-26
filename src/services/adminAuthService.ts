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

  /**
   * 비밀번호 정책 검증
   * - 최소 8자 이상
   * - 영문, 숫자, 특수문자 중 2종류 이상 포함
   */
  validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error("비밀번호는 8자 이상이어야 합니다");
    }

    let typeCount = 0;
    if (/[a-zA-Z]/.test(password)) typeCount++;
    if (/[0-9]/.test(password)) typeCount++;
    if (/[^a-zA-Z0-9]/.test(password)) typeCount++;

    if (typeCount < 2) {
      throw new Error("비밀번호는 영문, 숫자, 특수문자 중 2종류 이상 포함해야 합니다");
    }
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

    this.validatePassword(newPassword);

    admin.password = newPassword;
    await admin.save();
  }
}

export default new AdminAuthService();
