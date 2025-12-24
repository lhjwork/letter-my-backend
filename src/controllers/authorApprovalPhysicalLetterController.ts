import { Request, Response } from "express";
import authorApprovalPhysicalLetterService, { IPhysicalRequestData, IApprovalData } from "../services/authorApprovalPhysicalLetterService";

class AuthorApprovalPhysicalLetterController {
  /**
   * 실물 편지 신청 (무제한 허용)
   * POST /api/letters/:letterId/physical-requests
   */
  async requestPhysicalLetter(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const requestData: IPhysicalRequestData = req.body;

      // 세션 ID 생성 또는 가져오기
      let sessionId = (req.session as any)?.id;
      if (!sessionId) {
        sessionId = authorApprovalPhysicalLetterService.generateSessionId();
        if (req.session) {
          (req.session as any).id = sessionId;
        }
      }

      // 요청자 정보 수집
      const userAgent = req.get("User-Agent") || "";
      const ipAddress = req.ip || req.connection.remoteAddress || "";

      const result = await authorApprovalPhysicalLetterService.requestPhysicalLetter(letterId, sessionId, userAgent, ipAddress, requestData);

      res.status(201).json({
        success: true,
        message: result.needsApproval ? "실물 편지 신청이 완료되었습니다. 편지 작성자의 승인을 기다려주세요." : "실물 편지 신청이 자동 승인되었습니다.",
        data: result,
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
   * 편지 작성자용 신청 목록 조회
   * GET /api/letters/:letterId/physical-requests/author
   */
  async getAuthorRequests(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const { status, page = "1", limit = "20" } = req.query;
      const authorId = (req as any).user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const result = await authorApprovalPhysicalLetterService.getAuthorRequests(letterId, authorId, {
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("작성자 신청 목록 조회 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "신청 목록 조회에 실패했습니다.",
      });
    }
  }

  /**
   * 편지 작성자용 신청 승인/거절
   * PATCH /api/letters/:letterId/physical-requests/:requestId/approval
   */
  async processApproval(req: Request, res: Response): Promise<void> {
    try {
      const { letterId, requestId } = req.params;
      const approvalData: IApprovalData = req.body;
      const authorId = (req as any).user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const result = await authorApprovalPhysicalLetterService.processApproval(letterId, requestId, authorId, approvalData);

      res.json({
        success: true,
        message: approvalData.action === "approve" ? "신청이 승인되었습니다." : "신청이 거절되었습니다.",
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
   * 편지별 공개 신청 현황 조회
   * GET /api/letters/:letterId/physical-requests/public
   */
  async getPublicRequests(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const { limit = "10" } = req.query;

      const result = await authorApprovalPhysicalLetterService.getPublicRequests(letterId, parseInt(limit as string));

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("공개 신청 현황 조회 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "신청 현황 조회에 실패했습니다.",
      });
    }
  }

  /**
   * 편지 설정 업데이트
   * PATCH /api/letters/:letterId/settings
   */
  async updateLetterSettings(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const { authorSettings } = req.body;
      const authorId = (req as any).user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const result = await authorApprovalPhysicalLetterService.updateLetterSettings(letterId, authorId, authorSettings);

      res.json({
        success: true,
        message: "설정이 업데이트되었습니다.",
        data: result,
      });
    } catch (error: any) {
      console.error("편지 설정 업데이트 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "설정 업데이트에 실패했습니다.",
      });
    }
  }

  /**
   * 스팸 방지를 위한 요청 제한 체크
   * GET /api/letters/:letterId/request-limit-check
   */
  async checkRequestLimit(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const sessionId = (req.session as any)?.id;

      if (!sessionId) {
        res.json({
          success: true,
          data: {
            canRequest: true,
            remainingRequests: 5, // 기본값
            maxRequestsPerPerson: 5,
            currentRequestCount: 0,
          },
        });
        return;
      }

      const result = await authorApprovalPhysicalLetterService.checkRequestLimit(letterId, sessionId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("요청 제한 체크 실패:", error);
      res.status(500).json({
        success: false,
        error: error.message || "요청 제한 체크에 실패했습니다.",
      });
    }
  }

  /**
   * 개별 신청 상태 조회 (신청자용)
   * GET /api/physical-requests/:requestId/status
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

      // 신청 정보 조회 (세션 ID로 권한 확인)
      const request = await authorApprovalPhysicalLetterService.getRequestByIdAndSession(requestId, sessionId);

      res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      console.error("개별 신청 상태 조회 실패:", error);

      if (error.message === "접근 권한이 없습니다.") {
        res.status(403).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || "신청 상태 조회에 실패했습니다.",
        });
      }
    }
  }
}

export default new AuthorApprovalPhysicalLetterController();
