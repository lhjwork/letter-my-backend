import { Request, Response } from "express";
import adminUserService, { UserListQuery } from "../services/adminUserService";
import { createErrorResponse, ERROR_CODES, ERROR_STATUS_CODES } from "../utils/errorResponse";

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
        const errorResponse = createErrorResponse(ERROR_CODES.INVALID_PARAMETERS, "page와 limit은 1 이상의 값이어야 합니다.");
        res.status(ERROR_STATUS_CODES[ERROR_CODES.INVALID_PARAMETERS]).json(errorResponse);
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

  // 사용자 검색 (status 필터링 추가)
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { query: searchTerm, limit, status } = req.query;

      if (!searchTerm) {
        const errorResponse = createErrorResponse(ERROR_CODES.SEARCH_TERM_REQUIRED);
        res.status(ERROR_STATUS_CODES[ERROR_CODES.SEARCH_TERM_REQUIRED]).json(errorResponse);
        return;
      }

      const users = await adminUserService.searchUsers(searchTerm as string, parseInt(limit as string) || 10, status as string);

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
        const errorResponse = createErrorResponse(ERROR_CODES.USER_NOT_FOUND);
        res.status(ERROR_STATUS_CODES[ERROR_CODES.USER_NOT_FOUND]).json(errorResponse);
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "사용자 상세 조회에 실패했습니다";
      const errorResponse = createErrorResponse(ERROR_CODES.INTERNAL_ERROR, message);
      res.status(ERROR_STATUS_CODES[ERROR_CODES.INTERNAL_ERROR]).json(errorResponse);
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

  // 사용자 작성 편지 목록 (status 필터링 추가)
  async getUserLetters(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as string;

      if (page < 1 || limit < 1) {
        res.status(400).json({
          success: false,
          message: "page와 limit은 1 이상의 값이어야 합니다.",
        });
        return;
      }

      const result = await adminUserService.getUserLetters(userId, page, limit, status);

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
  async getDashboardStats(_req: Request, res: Response): Promise<void> {
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
