import { Request, Response } from "express";
import adminAuthService from "../services/adminAuthService";

class AdminAuthController {
  // 로그인
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ success: false, message: "아이디와 비밀번호를 입력해주세요", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const decryptedPassword = password;

      const { admin, token } = await adminAuthService.login(username, decryptedPassword);

      res.json({
        success: true,
        data: { admin, token },
        message: "로그인 성공",
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "로그인에 실패했습니다";
      res.status(401).json({ success: false, message, meta: { timestamp: new Date().toISOString() } });
    }
  }

  // 로그아웃
  async logout(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: "로그아웃 성공", meta: { timestamp: new Date().toISOString() } });
  }

  // 내 정보 조회
  async getMe(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: req.admin, meta: { timestamp: new Date().toISOString() } });
  }

  // 비밀번호 변경
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: "현재 비밀번호와 새 비밀번호를 입력해주세요", meta: { timestamp: new Date().toISOString() } });
        return;
      }

      const decryptedCurrentPassword = currentPassword;
      const decryptedNewPassword = newPassword;

      try {
        adminAuthService.validatePassword(decryptedNewPassword);
      } catch (validationError: unknown) {
        const msg = validationError instanceof Error ? validationError.message : "비밀번호 정책을 충족하지 않습니다";
        res.status(400).json({ success: false, message: msg, meta: { timestamp: new Date().toISOString() } });
        return;
      }

      await adminAuthService.changePassword(req.admin!._id.toString(), decryptedCurrentPassword, decryptedNewPassword);

      res.json({ success: true, message: "비밀번호가 변경되었습니다", meta: { timestamp: new Date().toISOString() } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다";
      res.status(400).json({ success: false, message, meta: { timestamp: new Date().toISOString() } });
    }
  }
}

export default new AdminAuthController();
