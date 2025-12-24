import { Request, Response } from "express";
import multiplePhysicalLetterService, { MultipleRecipientRequest } from "../services/multiplePhysicalLetterService";
import { PhysicalRequestStatus } from "../models/PhysicalLetterRequest";

class MultiplePhysicalLetterController {
  /**
   * 다중 수신자 실물 편지 신청
   * POST /api/letters/:letterId/multiple-physical-request
   */
  async requestMultiplePhysicalLetters(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const requesterId = req.user?.userId;
      const recipientData: MultipleRecipientRequest = req.body;

      if (!requesterId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const result = await multiplePhysicalLetterService.requestMultiplePhysicalLetters(letterId, requesterId, recipientData);

      res.status(201).json({
        success: true,
        message: "다중 수신자 실물 편지 신청이 완료되었습니다.",
        data: result,
      });
    } catch (error: any) {
      console.error("다중 수신자 실물 편지 신청 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "다중 수신자 실물 편지 신청에 실패했습니다.",
      });
    }
  }

  /**
   * 편지의 실물 편지 요청 목록 조회
   * GET /api/letters/:letterId/physical-requests
   */
  async getPhysicalLetterRequests(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const requesterId = req.user?.userId;

      if (!requesterId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const result = await multiplePhysicalLetterService.getPhysicalLetterRequests(letterId, requesterId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("실물 편지 요청 목록 조회 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "실물 편지 요청 목록 조회에 실패했습니다.",
      });
    }
  }

  /**
   * 개별 실물 편지 요청 취소
   * DELETE /api/letters/physical-requests/:requestId
   */
  async cancelPhysicalLetterRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const requesterId = req.user?.userId;

      if (!requesterId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const result = await multiplePhysicalLetterService.cancelPhysicalLetterRequest(requestId, requesterId);

      res.json({
        success: true,
        message: "실물 편지 요청이 취소되었습니다.",
        data: result,
      });
    } catch (error: any) {
      console.error("실물 편지 요청 취소 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "실물 편지 요청 취소에 실패했습니다.",
      });
    }
  }

  /**
   * 관리자용 실물 편지 요청 목록 조회
   * GET /api/admin/physical-requests
   */
  async getAdminPhysicalLetterRequests(req: Request, res: Response): Promise<void> {
    try {
      const { status, letterId, page = "1", limit = "20", sortBy = "requestedAt", sortOrder = "desc" } = req.query;

      const filters = {
        status: status as string,
        letterId: letterId as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as string,
      };

      const result = await multiplePhysicalLetterService.getAdminPhysicalLetterRequests(filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("관리자 실물 편지 요청 목록 조회 실패:", error);
      res.status(500).json({
        success: false,
        error: error.message || "관리자 실물 편지 요청 목록 조회에 실패했습니다.",
      });
    }
  }

  /**
   * 관리자용 실물 편지 요청 상태 업데이트
   * PUT /api/admin/physical-requests/:requestId
   */
  async updatePhysicalLetterRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const adminId = req.user?.userId;
      const updateData = req.body;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: "관리자 로그인이 필요합니다.",
        });
        return;
      }

      const result = await multiplePhysicalLetterService.updatePhysicalLetterRequestStatus(requestId, updateData, adminId);

      res.json({
        success: true,
        message: "실물 편지 요청 상태가 업데이트되었습니다.",
        data: result,
      });
    } catch (error: any) {
      console.error("실물 편지 요청 상태 업데이트 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "실물 편지 요청 상태 업데이트에 실패했습니다.",
      });
    }
  }

  /**
   * 관리자용 실물 편지 요청 일괄 상태 업데이트
   * PUT /api/admin/physical-requests/bulk-update
   */
  async bulkUpdatePhysicalLetterRequests(req: Request, res: Response): Promise<void> {
    try {
      const { requestIds, updateData } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: "관리자 로그인이 필요합니다.",
        });
        return;
      }

      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        res.status(400).json({
          success: false,
          error: "업데이트할 요청 ID 목록이 필요합니다.",
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const requestId of requestIds) {
        try {
          const result = await multiplePhysicalLetterService.updatePhysicalLetterRequestStatus(requestId, updateData, adminId);
          results.push(result);
        } catch (error: any) {
          errors.push({
            requestId,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        message: `${results.length}개의 요청이 업데이트되었습니다.`,
        data: {
          updated: results,
          errors: errors,
          totalRequested: requestIds.length,
          successCount: results.length,
          errorCount: errors.length,
        },
      });
    } catch (error: any) {
      console.error("실물 편지 요청 일괄 업데이트 실패:", error);
      res.status(500).json({
        success: false,
        error: error.message || "실물 편지 요청 일괄 업데이트에 실패했습니다.",
      });
    }
  }

  /**
   * 관리자용 실물 편지 요청 통계 조회
   * GET /api/admin/physical-requests/stats
   */
  async getPhysicalLetterRequestStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // 기본 통계 쿼리
      const matchQuery: any = {};
      if (startDate || endDate) {
        matchQuery.requestedAt = {};
        if (startDate) matchQuery.requestedAt.$gte = new Date(startDate as string);
        if (endDate) matchQuery.requestedAt.$lte = new Date(endDate as string);
      }

      // 통계 데이터 조회 (실제 구현에서는 PhysicalLetterRequest 모델 사용)
      const stats = {
        totalRequests: 0,
        statusBreakdown: {
          [PhysicalRequestStatus.REQUESTED]: 0,
          [PhysicalRequestStatus.CONFIRMED]: 0,
          [PhysicalRequestStatus.WRITING]: 0,
          [PhysicalRequestStatus.SENT]: 0,
          [PhysicalRequestStatus.DELIVERED]: 0,
          [PhysicalRequestStatus.FAILED]: 0,
          [PhysicalRequestStatus.CANCELLED]: 0,
        },
        totalRevenue: 0,
        averageProcessingTime: 0,
        topRegions: [],
        dailyStats: [],
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error("실물 편지 요청 통계 조회 실패:", error);
      res.status(500).json({
        success: false,
        error: error.message || "실물 편지 요청 통계 조회에 실패했습니다.",
      });
    }
  }
}

export default new MultiplePhysicalLetterController();
