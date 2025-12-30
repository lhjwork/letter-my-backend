import { Request, Response } from "express";
import recipientLetterService, { IPhysicalRequestData } from "../services/recipientLetterService";

class RecipientLetterController {
  /**
   * 실물 편지 신청
   * POST /api/letters/:letterId/physical-request
   */
  async requestPhysicalLetter(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const requestData: IPhysicalRequestData = req.body;

      console.log(`🔍 [DEBUG] Physical letter request for letterId: ${letterId}`);
      console.log(`📋 [DEBUG] Request data:`, requestData);

      // 세션 ID 생성 또는 가져오기
      let sessionId = (req.session as any)?.id;
      if (!sessionId) {
        sessionId = recipientLetterService.generateSessionId();
        if (req.session) {
          (req.session as any).id = sessionId;
        }
      }

      console.log(`🔑 [DEBUG] Session ID: ${sessionId}`);

      // 요청자 정보 수집
      const userAgent = req.get("User-Agent") || "";
      const ipAddress = req.ip || req.connection.remoteAddress || "";

      const result = await recipientLetterService.requestPhysicalLetter(letterId, sessionId, userAgent, ipAddress, requestData);

      console.log(`✅ [DEBUG] Physical letter request result:`, result);

      res.status(201).json({
        success: true,
        message: result.needsApproval ? "실물 편지 신청이 완료되었습니다. 편지 작성자의 승인을 기다려주세요." : "실물 편지 신청이 자동 승인되었습니다.",
        data: result,
      });
    } catch (error: any) {
      console.error("❌ [DEBUG] 실물 편지 신청 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "실물 편지 신청에 실패했습니다.",
      });
    }
  }

  /**
   * 편지별 실물 편지 신청 현황 조회
   * GET /api/letters/:letterId/physical-status
   */
  async getPhysicalRequests(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;

      const result = await recipientLetterService.getPhysicalRequests(letterId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("실물 편지 현황 조회 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "실물 편지 현황 조회에 실패했습니다.",
      });
    }
  }

  /**
   * 작성자용 신청 승인/거절
   * PATCH /api/letters/:letterId/physical-requests/:requestId/approval
   */
  async processApproval(req: Request, res: Response): Promise<void> {
    try {
      const { letterId, requestId } = req.params;
      const { action, rejectionReason } = req.body;
      const authorId = (req as any).user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const result = await recipientLetterService.processApproval(letterId, requestId, authorId, action, rejectionReason);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("신청 승인/거절 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "신청 처리에 실패했습니다.",
      });
    }
  }

  /**
   * 개별 신청 상태 조회
   * GET /api/letters/physical-requests/:requestId/status
   */
  async getRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const sessionId = (req.session as any)?.id;

      if (!sessionId) {
        res.status(401).json({
          success: false,
          error: "세션 정보가 없습니다.",
        });
        return;
      }

      const result = await recipientLetterService.getRequestStatus(requestId, sessionId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("개별 신청 상태 조회 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "신청 상태 조회에 실패했습니다.",
      });
    }
  }
}

export default new RecipientLetterController();
