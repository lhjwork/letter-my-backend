import { Request, Response, NextFunction } from "express";
import userService from "../services/userService";
import { OAuthProvider } from "../models/User";
import { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound } from "../utils/response";

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
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const user = await userService.findById(req.user.userId);

      if (!user) {
        sendNotFound(res, "사용자를 찾을 수 없습니다");
        return;
      }

      sendSuccess(res, user, "사용자 정보를 조회했습니다");
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
        sendNotFound(res, "사용자를 찾을 수 없습니다");
        return;
      }

      sendSuccess(res, user, "사용자 정보를 조회했습니다");
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

      sendSuccess(res, result.users, "사용자 목록을 조회했습니다", 200, {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1,
      });
    } catch (error) {
      next(error);
    }
  }

  // OAuth 로그인/회원가입
  async oauthLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { provider, providerId, email, name, image, accessToken, refreshToken, profile } = req.body;

      if (!Object.values(OAuthProvider).includes(provider)) {
        sendBadRequest(res, "유효하지 않은 OAuth provider입니다. instagram, naver, kakao 중 하나여야 합니다");
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

      sendSuccess(res, { user, token }, "로그인에 성공했습니다");
    } catch (error) {
      next(error);
    }
  }

  // 사용자 정보 업데이트
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const { name, image, email } = req.body;
      const user = await userService.updateUser(req.user.userId, { name, image, email });

      if (!user) {
        sendNotFound(res, "사용자를 찾을 수 없습니다");
        return;
      }

      sendSuccess(res, user, "사용자 정보가 수정되었습니다");
    } catch (error: any) {
      if (error.message === "Email already exists") {
        sendBadRequest(res, "이미 사용 중인 이메일입니다");
        return;
      }
      next(error);
    }
  }

  // 사용자 삭제
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const deleted = await userService.deleteUser(req.user.userId);

      if (!deleted) {
        sendNotFound(res, "사용자를 찾을 수 없습니다");
        return;
      }

      sendSuccess(res, null, "사용자가 삭제되었습니다");
    } catch (error) {
      next(error);
    }
  }

  // OAuth 계정 연결
  async linkOAuthAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const { provider, providerId, accessToken, refreshToken, profile } = req.body;

      if (!Object.values(OAuthProvider).includes(provider)) {
        sendBadRequest(res, "유효하지 않은 OAuth provider입니다");
        return;
      }

      const user = await userService.linkOAuthAccount(req.user.userId, {
        provider,
        providerId,
        accessToken,
        refreshToken,
        profile,
      });

      sendSuccess(res, user, "OAuth 계정이 연결되었습니다");
    } catch (error: any) {
      if (error.message === "User not found" || error.message?.includes("already linked")) {
        sendBadRequest(res, error.message);
        return;
      }
      next(error);
    }
  }

  // OAuth 계정 연결 해제
  async unlinkOAuthAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const { provider } = req.params;

      if (!Object.values(OAuthProvider).includes(provider as OAuthProvider)) {
        sendBadRequest(res, "유효하지 않은 OAuth provider입니다");
        return;
      }

      const user = await userService.unlinkOAuthAccount(req.user.userId, provider as OAuthProvider);

      sendSuccess(res, user, "OAuth 계정 연결이 해제되었습니다");
    } catch (error: any) {
      if (error.message === "User not found" || error.message?.includes("Cannot unlink")) {
        sendBadRequest(res, error.message);
        return;
      }
      next(error);
    }
  }
}

// Controller 인스턴스 생성 및 내보내기
export default new UserController();
