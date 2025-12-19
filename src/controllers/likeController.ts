import { Request, Response } from "express";
import likeService from "../services/likeService";

class LikeController {
  // 좋아요 추가
  async addLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await likeService.addLike(userId, letterId);

      res.status(201).json({
        success: true,
        message: "좋아요를 눌렀습니다",
        data: {
          isLiked: true,
          likeCount: result.likeCount,
        },
      });
    } catch (error: any) {
      if (error.message === "Letter not found") {
        res.status(404).json({ success: false, message: "편지를 찾을 수 없습니다" });
        return;
      }
      if (error.message === "Already liked") {
        res.status(409).json({ success: false, message: "이미 좋아요를 눌렀습니다" });
        return;
      }
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }

  // 좋아요 취소
  async removeLike(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await likeService.removeLike(userId, letterId);

      res.status(200).json({
        success: true,
        message: "좋아요를 취소했습니다",
        data: {
          isLiked: false,
          likeCount: result.likeCount,
        },
      });
    } catch (error: any) {
      if (error.message === "Like not found") {
        res.status(404).json({ success: false, message: "좋아요 기록을 찾을 수 없습니다" });
        return;
      }
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }

  // 좋아요 상태 확인
  async checkLikeStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id: letterId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await likeService.checkLikeStatus(userId, letterId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }

  // 내가 좋아요한 목록
  async getMyLikes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await likeService.getMyLikes(userId, page, limit);

      res.status(200).json({
        success: true,
        data: result.likes,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "서버 오류가 발생했습니다" });
    }
  }
}

export default new LikeController();
