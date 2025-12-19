import { Request, Response } from "express";
import adminAuthService from "../services/adminAuthService";
import cryptoService from "../services/cryptoService";

class AdminAuthController {
  // RSA 공개키 조회
  async getPublicKey(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: { publicKey: cryptoService.getPublicKey() },
    });
  }

  // 로그인
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, encrypted } = req.body;

      if (!username || !password) {
        res.status(400).json({ success: false, message: "아이디와 비밀번호를 입력해주세요" });
        return;
      }

      // 암호화된 비밀번호인 경우 복호화
      let decryptedPassword = password;
      if (encrypted) {
        try {
          decryptedPassword = cryptoService.decrypt(password);
        } catch {
          res.status(400).json({ success: false, message: "비밀번호 복호화에 실패했습니다" });
          return;
        }
      }

      const { admin, token } = await adminAuthService.login(username, decryptedPassword);

      res.json({
        success: true,
        data: { admin, token },
        message: "로그인 성공",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "로그인에 실패했습니다";
      res.status(401).json({ success: false, message });
    }
  }

  // 로그아웃
  async logout(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: "로그아웃 성공" });
  }

  // 내 정보 조회
  async getMe(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: req.admin });
  }

  // 비밀번호 변경
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword, encrypted } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: "현재 비밀번호와 새 비밀번호를 입력해주세요" });
        return;
      }

      // 암호화된 비밀번호인 경우 복호화
      let decryptedCurrentPassword = currentPassword;
      let decryptedNewPassword = newPassword;

      if (encrypted) {
        try {
          decryptedCurrentPassword = cryptoService.decrypt(currentPassword);
          decryptedNewPassword = cryptoService.decrypt(newPassword);
        } catch {
          res.status(400).json({ success: false, message: "비밀번호 복호화에 실패했습니다" });
          return;
        }
      }

      if (decryptedNewPassword.length < 4) {
        res.status(400).json({ success: false, message: "비밀번호는 4자 이상이어야 합니다" });
        return;
      }

      await adminAuthService.changePassword(req.admin!._id.toString(), decryptedCurrentPassword, decryptedNewPassword);

      res.json({ success: true, message: "비밀번호가 변경되었습니다" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다";
      res.status(400).json({ success: false, message });
    }
  }
}

export default new AdminAuthController();
