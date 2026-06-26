import { Request, Response } from "express";
import draftLetterService, { IDraftLetterData } from "../services/draftLetterService";
import { getErrorMessage } from "../utils/response";

class DraftLetterController {
  /**
   * 임시저장 생성/수정
   * POST /api/drafts
   * PUT /api/drafts/:draftId
   */
  async saveDraft(req: Request, res: Response): Promise<void> {
    try {
      const { title, content, type, category, recipientAddresses, draftId } = req.body;
      const authorId = req.user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }


      const requestData: IDraftLetterData = {
        title,
        content,
        type,
        category,
        recipientAddresses,
      };

      const result = await draftLetterService.saveDraft(authorId, requestData, draftId);

      const message = draftId ? "임시저장이 업데이트되었습니다." : "임시저장되었습니다.";

      res.status(draftId ? 200 : 201).json({
        success: true,
        data: result,
        message,
      });
    } catch (error: unknown) {
      console.error("임시저장 실패:", error);
      const message = getErrorMessage(error);
      res.status(400).json({
        success: false,
        error: message || "임시저장 중 오류가 발생했습니다.",
      });
    }
  }

  /**
   * 기존 임시저장 수정
   * PUT /api/drafts/:draftId
   */
  async updateDraft(req: Request, res: Response): Promise<void> {
    try {
      const { draftId } = req.params;
      const { title, content, type, category, recipientAddresses } = req.body;
      const authorId = req.user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }


      const requestData: IDraftLetterData = {
        title,
        content,
        type,
        category,
        recipientAddresses,
      };

      const result = await draftLetterService.saveDraft(authorId, requestData, draftId);

      res.json({
        success: true,
        data: result,
        message: "임시저장이 업데이트되었습니다.",
      });
    } catch (error: unknown) {
      console.error("임시저장 업데이트 실패:", error);
      const message = getErrorMessage(error);
      res.status(400).json({
        success: false,
        error: message || "임시저장 업데이트 중 오류가 발생했습니다.",
      });
    }
  }

  /**
   * 임시저장 목록 조회
   * GET /api/drafts
   */
  async getDrafts(req: Request, res: Response): Promise<void> {
    try {
      const authorId = req.user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const sort = (req.query.sort as string) || "latest";
      const type = (req.query.type as string) || "all";


      const result = await draftLetterService.getDrafts(authorId, page, limit, sort, type);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      console.error("임시저장 목록 조회 실패:", error);
      const message = getErrorMessage(error);
      res.status(500).json({
        success: false,
        error: message || "임시저장 목록을 불러올 수 없습니다.",
      });
    }
  }

  /**
   * 임시저장 상세 조회
   * GET /api/drafts/:draftId
   */
  async getDraft(req: Request, res: Response): Promise<void> {
    try {
      const { draftId } = req.params;
      const authorId = req.user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }


      const result = await draftLetterService.getDraft(draftId, authorId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      console.error("임시저장 조회 실패:", error);

      const message = getErrorMessage(error);
      if (message.includes("찾을 수 없습니다")) {
        res.status(404).json({
          success: false,
          error: message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: message || "임시저장된 편지를 불러올 수 없습니다.",
        });
      }
    }
  }

  /**
   * 임시저장 삭제
   * DELETE /api/drafts/:draftId
   */
  async deleteDraft(req: Request, res: Response): Promise<void> {
    try {
      const { draftId } = req.params;
      const authorId = req.user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }


      await draftLetterService.deleteDraft(draftId, authorId);

      res.json({
        success: true,
        message: "임시저장된 편지가 삭제되었습니다.",
      });
    } catch (error: unknown) {
      console.error("임시저장 삭제 실패:", error);

      const message = getErrorMessage(error);
      if (message.includes("찾을 수 없습니다")) {
        res.status(404).json({
          success: false,
          error: message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: message || "임시저장 삭제 중 오류가 발생했습니다.",
        });
      }
    }
  }

  /**
   * 임시저장 → 정식 발행
   * POST /api/drafts/:draftId/publish
   */
  async publishDraft(req: Request, res: Response): Promise<void> {
    try {
      const { draftId } = req.params;
      const { title, content, type, category, recipientAddresses } = req.body;
      const authorId = req.user?.userId;
      const userName = req.user?.name || "익명";

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }


      const updateData = {
        title,
        content,
        type,
        category,
        recipientAddresses,
      };

      const result = await draftLetterService.publishDraft(draftId, authorId, userName, updateData);

      res.json({
        success: true,
        data: result,
        message: "편지가 성공적으로 발행되었습니다.",
      });
    } catch (error: unknown) {
      console.error("편지 발행 실패:", error);

      const message = getErrorMessage(error);
      if (message.includes("찾을 수 없습니다")) {
        res.status(404).json({
          success: false,
          error: message,
        });
      } else if (message.includes("필수입니다")) {
        res.status(400).json({
          success: false,
          error: message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: message || "편지 발행 중 오류가 발생했습니다.",
        });
      }
    }
  }

  /**
   * 임시저장 통계 조회
   * GET /api/drafts/stats
   */
  async getDraftStats(req: Request, res: Response): Promise<void> {
    try {
      const authorId = req.user?.userId;

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다.",
        });
        return;
      }


      const result = await draftLetterService.getDraftStats(authorId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      console.error("임시저장 통계 조회 실패:", error);
      const message = getErrorMessage(error);
      res.status(500).json({
        success: false,
        error: message || "임시저장 통계를 불러올 수 없습니다.",
      });
    }
  }

  /**
   * 오래된 임시저장 정리 (관리자용)
   * POST /api/drafts/cleanup
   */
  async cleanupOldDrafts(_req: Request, res: Response): Promise<void> {
    try {

      const cleanedCount = await draftLetterService.cleanupOldDrafts();

      res.json({
        success: true,
        data: {
          cleanedCount,
        },
        message: `${cleanedCount}개의 오래된 임시저장이 정리되었습니다.`,
      });
    } catch (error: unknown) {
      console.error("임시저장 정리 실패:", error);
      const message = getErrorMessage(error);
      res.status(500).json({
        success: false,
        error: message || "임시저장 정리 중 오류가 발생했습니다.",
      });
    }
  }
}

export default new DraftLetterController();
