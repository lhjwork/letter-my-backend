import { Request, Response } from "express";
import recipientLetterService, { IPhysicalRequestData } from "../services/recipientLetterService";

class RecipientLetterController {
  /**
   * 실물 편지 신청 (로그인 없이 가능)
   * POST /api/letters/:letterId/physical-request
   */
  async requestPhysicalLetter(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const requestData: IPhysicalRequestData = req.body;

      // 세션 ID 생성 또는 가져오기
      let sessionId = (req.session as any)?.id;
      if (!sessionId) {
        sessionId = recipientLetterService.generateSessionId();
        if (req.session) {
          (req.session as any).id = sessionId;
        }
      }

      // 요청자 정보 수집
      const userAgent = req.get("User-Agent") || "";
      const ipAddress = req.ip || req.connection.remoteAddress || "";

      // 로그인 사용자 ID (있으면)
      const userId = (req as any).user?.userId;

      const result = await recipientLetterService.requestPhysicalLetter(letterId, sessionId, userAgent, ipAddress, requestData, userId);


      // 중복 신청인 경우 다른 메시지
      const message = result.isDuplicate
        ? "이미 이 편지에 대해 신청하셨습니다. 기존 신청 상태를 확인해주세요."
        : result.needsApproval
          ? "실물 편지 신청이 완료되었습니다. 편지 작성자의 승인을 기다려주세요."
          : "실물 편지 신청이 자동 승인되었습니다.";

      res.status(201).json({
        success: true,
        message,
        data: {
          ...result,
          trackingInfo: {
            requestId: result.requestId,
            statusCheckUrl: `/api/letters/physical-requests/${result.requestId}/status`,
            message: "이 요청 ID로 언제든지 배송 상태를 확인할 수 있습니다.",
          },
        },
      });
    } catch (error: any) {
      console.error("실물 편지 신청 실패:", error);
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
   * 작성자용 수신자 목록 조회
   * GET /api/letters/:letterId/recipients
   */
  async getAuthorRecipients(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const authorId = (req as any).user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const result = await recipientLetterService.getAuthorRecipients(letterId, authorId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("작성자 수신자 목록 조회 실패:", error);

      if (error.message.includes("작성자만")) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || "수신자 목록 조회에 실패했습니다.",
        });
      }
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
   * 개별 신청 상태 조회 (requestId 기반)
   * GET /api/letters/physical-requests/:requestId/status
   */
  async getRequestStatusByRequestId(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;


      const result = await recipientLetterService.getRequestStatusByRequestId(requestId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("개별 신청 상태 조회 실패:", error);

      if (error.message === "REQUEST_NOT_FOUND") {
        res.status(404).json({
          success: false,
          error: "신청을 찾을 수 없습니다. 요청 ID를 확인해주세요.",
          code: "REQUEST_NOT_FOUND",
        });
      } else {
        res.status(500).json({
          success: false,
          error: "서버 오류가 발생했습니다.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }
  }

  /**
   * 신청 상태 조회 (letterId와 requestId로)
   * GET /api/letters/:letterId/physical-request/:requestId
   */
  async getPhysicalRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { letterId, requestId } = req.params;


      const result = await recipientLetterService.getPhysicalRequestStatus(letterId, requestId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("신청 상태 조회 실패:", error);

      if (error.message.includes("유효하지 않은")) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: "INVALID_REQUEST",
        });
      } else if (error.message.includes("찾을 수 없습니다")) {
        res.status(404).json({
          success: false,
          error: error.message,
          code: "NOT_FOUND",
        });
      } else {
        res.status(500).json({
          success: false,
          error: "서버 오류가 발생했습니다.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }
  }

  /**
   * 편지별 간단한 실물 편지 상태 조회
   * GET /api/letters/:letterId/physical-status/simple
   */
  async getSimplePhysicalStatus(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const userId = (req as any).user?.userId;


      if (!userId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
          code: "AUTHENTICATION_REQUIRED",
        });
        return;
      }

      const result = await recipientLetterService.getSimplePhysicalStatus(letterId, userId);

      // 캐싱 헤더 설정 (5분 캐시)
      res.set({
        "Cache-Control": "public, max-age=300", // 5분
        ETag: `"${letterId}-${Date.now()}"`,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("간단한 실물 편지 상태 조회 실패:", error);

      switch (error.message) {
        case "LETTER_NOT_FOUND":
          res.status(404).json({
            success: false,
            error: "편지를 찾을 수 없습니다.",
            code: "LETTER_NOT_FOUND",
          });
          break;
        default:
          res.status(500).json({
            success: false,
            error: "서버 오류가 발생했습니다.",
            code: "INTERNAL_SERVER_ERROR",
          });
      }
    }
  }

  /**
   * 사용자별 실물 편지 상태 조회 (세션 기반)
   * GET /api/letters/:letterId/physical-status/user
   */
  async getPhysicalStatusForUser(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const sessionId = (req.session as any)?.id;

      if (!sessionId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
          code: "AUTHENTICATION_REQUIRED",
        });
        return;
      }

      const result = await recipientLetterService.getPhysicalStatusForUser(letterId, sessionId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("사용자 실물 편지 상태 조회 실패:", error);

      switch (error.message) {
        case "NO_PHYSICAL_REQUESTS":
          res.status(403).json({
            success: false,
            error: "이 편지에 대한 실물 편지 신청 내역이 없습니다.",
            code: "NO_PHYSICAL_REQUESTS",
          });
          break;
        case "LETTER_NOT_FOUND":
          res.status(404).json({
            success: false,
            error: "편지를 찾을 수 없습니다.",
            code: "LETTER_NOT_FOUND",
          });
          break;
        default:
          res.status(500).json({
            success: false,
            error: "서버 오류가 발생했습니다.",
            code: "INTERNAL_SERVER_ERROR",
          });
      }
    }
  }
}

export default new RecipientLetterController();
