import { Request, Response } from "express";
import { Session } from "express-session";
import cumulativePhysicalLetterService, { CumulativeRequestData } from "../services/cumulativePhysicalLetterService";
import { CumulativeRequestStatus } from "../models/CumulativePhysicalLetterRequest";

// 세션 확장을 위한 인터페이스
interface SessionRequest extends Request {
  session: Session & {
    id?: string;
  };
}

class CumulativePhysicalLetterController {
  /**
   * 개별 실물 편지 신청 (누적 방식)
   * POST /api/letters/:letterId/cumulative-physical-request
   */
  async requestPhysicalLetter(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const requestData: CumulativeRequestData = req.body;

      // 세션 ID 생성 또는 가져오기
      let sessionId = req.session?.id;
      if (!sessionId) {
        sessionId = cumulativePhysicalLetterService.generateSessionId();
        if (req.session) {
          req.session.id = sessionId;
        }
      }

      // 요청자 정보 수집
      const userAgent = req.get("User-Agent") || "";
      const ipAddress = req.ip || req.connection.remoteAddress || "";

      const result = await cumulativePhysicalLetterService.requestPhysicalLetter(letterId, sessionId, userAgent, ipAddress, requestData);

      res.status(201).json({
        success: true,
        message: "실물 편지 신청이 완료되었습니다.",
        data: result,
      });
    } catch (error: any) {
      console.error("누적 실물 편지 신청 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "실물 편지 신청에 실패했습니다.",
      });
    }
  }

  /**
   * 편지별 신청 현황 조회
   * GET /api/letters/:letterId/cumulative-physical-requests
   */
  async getLetterRequests(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const { page = "1", limit = "20", status } = req.query;

      const result = await cumulativePhysicalLetterService.getLetterRequests(letterId, parseInt(page as string), parseInt(limit as string), status as string);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("편지별 신청 현황 조회 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "신청 현황 조회에 실패했습니다.",
      });
    }
  }

  /**
   * 개별 신청 상태 조회
   * GET /api/cumulative-physical-requests/:requestId
   */
  async getRequestStatus(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const sessionId = req.session?.id;

      if (!sessionId) {
        res.status(401).json({
          success: false,
          error: "세션 정보가 없습니다.",
        });
        return;
      }

      const result = await cumulativePhysicalLetterService.getRequestStatus(requestId, sessionId);

      res.json({
        success: true,
        data: result,
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

  /**
   * 관리자용 전체 신청 목록 조회
   * GET /api/admin/cumulative-physical-requests
   */
  async getAdminRequests(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "50", status, letterId, startDate, endDate } = req.query;

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        letterId: letterId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      const result = await cumulativePhysicalLetterService.getAdminRequests(filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("관리자 신청 목록 조회 실패:", error);
      res.status(500).json({
        success: false,
        error: error.message || "관리자 신청 목록 조회에 실패했습니다.",
      });
    }
  }

  /**
   * 관리자용 신청 상태 업데이트
   * PATCH /api/admin/cumulative-physical-requests/:requestId
   */
  async updateRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { status, trackingNumber, shippingCompany, adminNote } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: "관리자 로그인이 필요합니다.",
        });
        return;
      }

      const updateData = {
        status: status as CumulativeRequestStatus,
        trackingNumber,
        shippingCompany,
        adminNote,
      };

      const result = await cumulativePhysicalLetterService.updateRequestStatus(requestId, updateData, adminId);

      res.json({
        success: true,
        message: "신청 상태가 업데이트되었습니다.",
        data: result,
      });
    } catch (error: any) {
      console.error("신청 상태 업데이트 실패:", error);
      res.status(400).json({
        success: false,
        error: error.message || "신청 상태 업데이트에 실패했습니다.",
      });
    }
  }

  /**
   * 관리자용 인기 편지 분석
   * GET /api/admin/analytics/popular-letters
   */
  async getPopularLetters(req: Request, res: Response): Promise<void> {
    try {
      const { limit = "20" } = req.query;

      const result = await cumulativePhysicalLetterService.getPopularLetters(parseInt(limit as string));

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("인기 편지 분석 실패:", error);
      res.status(500).json({
        success: false,
        error: error.message || "인기 편지 분석에 실패했습니다.",
      });
    }
  }

  /**
   * 관리자용 통계 대시보드
   * GET /api/admin/cumulative-physical-requests/stats
   */
  async getRequestStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // 기본 필터 설정
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate as string);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate as string);
      }

      // 여기서는 간단한 통계만 제공하고, 실제로는 더 복잡한 집계 쿼리 필요
      const stats = {
        totalRequests: 0,
        statusBreakdown: {
          [CumulativeRequestStatus.REQUESTED]: 0,
          [CumulativeRequestStatus.CONFIRMED]: 0,
          [CumulativeRequestStatus.WRITING]: 0,
          [CumulativeRequestStatus.SENT]: 0,
          [CumulativeRequestStatus.DELIVERED]: 0,
          [CumulativeRequestStatus.FAILED]: 0,
          [CumulativeRequestStatus.CANCELLED]: 0,
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
      console.error("통계 조회 실패:", error);
      res.status(500).json({
        success: false,
        error: error.message || "통계 조회에 실패했습니다.",
      });
    }
  }

  /**
   * 스팸 방지를 위한 요청 제한 체크
   * GET /api/letters/:letterId/request-limit-check
   */
  async checkRequestLimit(req: SessionRequest, res: Response): Promise<void> {
    try {
      const sessionId = req.session?.id;

      if (!sessionId) {
        res.json({
          success: true,
          data: {
            canRequest: true,
            remainingRequests: 5, // 기본값
          },
        });
        return;
      }

      // 실제 구현에서는 CumulativePhysicalLetterRequest 모델을 사용하여 카운트
      const recentRequestCount = 0; // 임시값
      const maxRequestsPerDay = 5; // 하루 최대 신청 수

      const canRequest = recentRequestCount < maxRequestsPerDay;
      const remainingRequests = Math.max(0, maxRequestsPerDay - recentRequestCount);

      res.json({
        success: true,
        data: {
          canRequest,
          remainingRequests,
          maxRequestsPerDay,
          recentRequestCount,
        },
      });
    } catch (error: any) {
      console.error("요청 제한 체크 실패:", error);
      res.status(500).json({
        success: false,
        error: error.message || "요청 제한 체크에 실패했습니다.",
      });
    }
  }
}

export default new CumulativePhysicalLetterController();
