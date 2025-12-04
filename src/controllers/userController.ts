import { Request, Response, NextFunction } from "express";
import userService from "../services/userService";
import { OAuthProvider } from "../models/User";

// Request에 user 정보 추가를 위한 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

// User Controller 클래스
export class UserController {
  // 현재 로그인한 사용자 정보 조회
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await userService.findById(req.user.userId);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // ID로 사용자 조회
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const user = await userService.findById(id);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // 모든 사용자 조회 (페이지네이션)
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await userService.findAll(page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 일반 회원가입
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;

      const user = await userService.createUser({ email, password, name });
      const token = userService.generateToken(user);

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
        message: "User registered successfully",
      });
    } catch (error: any) {
      if (error.message === "Email already exists") {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  // 일반 로그인
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const { user, token } = await userService.login(email, password);

      res.status(200).json({
        success: true,
        data: {
          user,
          token,
        },
        message: "Login successful",
      });
    } catch (error: any) {
      if (error.message === "Invalid email or password" || error.message?.includes("OAuth login")) {
        res.status(401).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  // OAuth 로그인/회원가입
  async oauthLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { provider, providerId, email, name, image, accessToken, refreshToken, profile } = req.body;

      // Provider 유효성 검사
      if (!Object.values(OAuthProvider).includes(provider)) {
        res.status(400).json({
          message: "Invalid OAuth provider. Must be instagram, naver, or kakao",
        });
        return;
      }

      const user = await userService.findOrCreateOAuthUser({
        provider,
        providerId,
        email,
        name,
        image,
        accessToken,
        refreshToken,
        profile,
      });

      const token = userService.generateToken(user);

      res.status(200).json({
        success: true,
        data: {
          user,
          token,
        },
        message: "OAuth login successful",
      });
    } catch (error) {
      next(error);
    }
  }

  // 사용자 정보 업데이트
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { name, image, email } = req.body;

      const user = await userService.updateUser(req.user.userId, {
        name,
        image,
        email,
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
        message: "User updated successfully",
      });
    } catch (error: any) {
      if (error.message === "Email already exists") {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  // 비밀번호 변경
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      await userService.changePassword(req.user.userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: any) {
      if (error.message === "User not found" || error.message === "Current password is incorrect" || error.message?.includes("OAuth-only users")) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  // 사용자 삭제
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const deleted = await userService.deleteUser(req.user.userId);

      if (!deleted) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // OAuth 계정 연결
  async linkOAuthAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { provider, providerId, accessToken, refreshToken, profile } = req.body;

      // Provider 유효성 검사
      if (!Object.values(OAuthProvider).includes(provider)) {
        res.status(400).json({
          message: "Invalid OAuth provider. Must be instagram, naver, or kakao",
        });
        return;
      }

      const user = await userService.linkOAuthAccount(req.user.userId, {
        provider,
        providerId,
        accessToken,
        refreshToken,
        profile,
      });

      res.status(200).json({
        success: true,
        data: user,
        message: "OAuth account linked successfully",
      });
    } catch (error: any) {
      if (error.message === "User not found" || error.message?.includes("already linked")) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  // OAuth 계정 연결 해제
  async unlinkOAuthAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { provider } = req.params;

      // Provider 유효성 검사
      if (!Object.values(OAuthProvider).includes(provider as OAuthProvider)) {
        res.status(400).json({
          message: "Invalid OAuth provider. Must be instagram, naver, or kakao",
        });
        return;
      }

      const user = await userService.unlinkOAuthAccount(req.user.userId, provider as OAuthProvider);

      res.status(200).json({
        success: true,
        data: user,
        message: "OAuth account unlinked successfully",
      });
    } catch (error: any) {
      if (error.message === "User not found" || error.message?.includes("Cannot unlink")) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

// Controller 인스턴스 생성 및 내보내기
export default new UserController();
