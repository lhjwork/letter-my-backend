import { Request, Response } from "express";
import likeService from "../services/likeService";
import { sendSuccess, sendCreated, sendUnauthorized, sendNotFound, sendBadRequest, sendServerError } from "../utils/response";

class LikeController {
  // 좋아요 추가
  async addLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const result = await likeService.addLike(userId, letterId);

      sendCreated(res, { isLiked: true, likeCount: result.likeCount }, "좋아요를 눌렀습니다");
    } catch (error: any) {
      if (error.message === "Letter not found") {
        sendNotFound(res, "편지를 찾을 수 없습니다");
        return;
      }
      if (error.message === "Already liked") {
        sendBadRequest(res, "이미 좋아요를 눌렀습니다");
        return;
      }
      sendServerError(res, "서버 오류가 발생했습니다");
    }
  }

  // 좋아요 취소
  async removeLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const result = await likeService.removeLike(userId, letterId);

      sendSuccess(res, { isLiked: false, likeCount: result.likeCount }, "좋아요를 취소했습니다");
    } catch (error: any) {
      if (error.message === "Like not found") {
        sendNotFound(res, "좋아요 기록을 찾을 수 없습니다");
        return;
      }
      sendServerError(res, "서버 오류가 발생했습니다");
    }
  }

  // 좋아요 상태 확인
  async checkLikeStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const result = await likeService.checkLikeStatus(userId, letterId);

      sendSuccess(res, result, "좋아요 상태를 조회했습니다");
    } catch (error) {
      sendServerError(res, "서버 오류가 발생했습니다");
    }
  }

  // 내가 좋아요한 목록
  async getMyLikes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        sendUnauthorized(res, "로그인이 필요합니다");
        return;
      }

      const result = await likeService.getMyLikes(userId, page, limit);

      sendSuccess(res, result.likes, "좋아요 목록을 조회했습니다", 200, result.pagination);
    } catch (error) {
      sendServerError(res, "서버 오류가 발생했습니다");
    }
  }
}

export default new LikeController();
