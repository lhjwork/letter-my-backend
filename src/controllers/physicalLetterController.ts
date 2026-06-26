import { Request, Response } from "express";
import physicalLetterService from "../services/physicalLetterService";
import { PhysicalLetterStatus } from "../models/Letter";

export class PhysicalLetterController {
  /**
   * 실물 편지 신청
   * POST /api/letters/:letterId/physical-request
   */
  async requestPhysicalLetter(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const { address } = req.body;


      if (!address) {
        res.status(400).json({
          success: false,
          message: "주소 정보가 필요합니다.",
          errorType: "MISSING_ADDRESS",
        });
        return;
      }

      const result = await physicalLetterService.requestPhysicalLetter(letterId, address);

      res.status(200).json({
        success: true,
        message: "실물 편지 신청이 완료되었습니다.",
        data: result,
      });
    } catch (error: unknown) {
      console.error("실물 편지 신청 실패:", error);

      if (error instanceof Error) {
        const message = error.message;

        if (message.includes("올바르지 않은 편지 ID")) {
          res.status(400).json({
            success: false,
            message,
            errorType: "INVALID_LETTER_ID",
          });
        } else if (message.includes("편지를 찾을 수 없습니다")) {
          res.status(404).json({
            success: false,
            message,
            errorType: "LETTER_NOT_FOUND",
          });
        } else if (message.includes("이미 실물 편지가 신청된")) {
          res.status(409).json({
            success: false,
            message,
            errorType: "ALREADY_REQUESTED",
          });
        } else if (message.includes("필수") || message.includes("형식") || message.includes("자 이상")) {
          res.status(400).json({
            success: false,
            message,
            errorType: "VALIDATION_ERROR",
          });
        } else {
          res.status(500).json({
            success: false,
            message,
            errorType: "INTERNAL_ERROR",
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: "실물 편지 신청 처리 중 오류가 발생했습니다.",
          errorType: "UNKNOWN_ERROR",
        });
      }
    }
  }

  /**
   * 실물 편지 상태 조회
   * GET /api/letters/:letterId/physical-status
   */
  async getPhysicalLetterStatus(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;

      const result = await physicalLetterService.getPhysicalLetterStatus(letterId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      console.error("실물 편지 상태 조회 실패:", error);

      if (error instanceof Error) {
        const message = error.message;

        if (message.includes("올바르지 않은 편지 ID")) {
          res.status(400).json({
            success: false,
            message,
            errorType: "INVALID_LETTER_ID",
          });
        } else if (message.includes("편지를 찾을 수 없습니다")) {
          res.status(404).json({
            success: false,
            message,
            errorType: "LETTER_NOT_FOUND",
          });
        } else {
          res.status(500).json({
            success: false,
            message,
            errorType: "INTERNAL_ERROR",
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: "상태 조회 중 오류가 발생했습니다.",
          errorType: "UNKNOWN_ERROR",
        });
      }
    }
  }

  /**
   * 관리자용 실물 편지 목록 조회
   * GET /api/admin/physical-requests
   */
  async getPhysicalLetterRequests(req: Request, res: Response): Promise<void> {
    try {
      const { status, page = "1", limit = "20" } = req.query;

      const result = await physicalLetterService.getPhysicalLetterRequests(status as string, parseInt(page as string), Math.min(parseInt(limit as string), 100));

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      console.error("실물 편지 목록 조회 실패:", error);

      res.status(500).json({
        success: false,
        message: "목록 조회 중 오류가 발생했습니다.",
        errorType: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * 관리자용 실물 편지 상태 업데이트
   * PATCH /api/admin/physical-requests/:letterId
   */
  async updatePhysicalLetterStatus(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: "상태 정보가 필요합니다.",
          errorType: "MISSING_STATUS",
        });
        return;
      }

      const result = await physicalLetterService.updatePhysicalLetterStatus(letterId, status as PhysicalLetterStatus, notes);

      res.status(200).json({
        success: true,
        message: "상태가 업데이트되었습니다.",
        data: result,
      });
    } catch (error: unknown) {
      console.error("상태 업데이트 실패:", error);

      if (error instanceof Error) {
        const message = error.message;

        if (message.includes("올바르지 않은 편지 ID")) {
          res.status(400).json({
            success: false,
            message,
            errorType: "INVALID_LETTER_ID",
          });
        } else if (message.includes("올바르지 않은 상태값")) {
          res.status(400).json({
            success: false,
            message,
            errorType: "INVALID_STATUS",
          });
        } else if (message.includes("편지를 찾을 수 없습니다")) {
          res.status(404).json({
            success: false,
            message,
            errorType: "LETTER_NOT_FOUND",
          });
        } else {
          res.status(500).json({
            success: false,
            message,
            errorType: "INTERNAL_ERROR",
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: "상태 업데이트 중 오류가 발생했습니다.",
          errorType: "UNKNOWN_ERROR",
        });
      }
    }
  }
}

export default new PhysicalLetterController();
