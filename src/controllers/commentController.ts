import { Request, Response } from "express";
import commentService, { COMMENT_PAGE_LIMIT_MAX } from "../services/commentService";
import { isAdminEmail } from "../utils/adminUser";
import { sendSuccess, sendCreated, sendUnauthorized, sendNotFound, sendBadRequest, sendForbidden, sendServerError, getErrorMessage } from "../utils/response";

function fail(res: Response, error: unknown): void {
  const message = getErrorMessage(error);
  if (message.includes("올바르지 않은")) sendBadRequest(res, message);
  else if (message.includes("찾을 수 없습니다")) sendNotFound(res, message);
  else if (message.includes("권한")) sendForbidden(res, message);
  else sendServerError(res, "서버 오류가 발생했습니다");
}

class CommentController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query.page)) || 1);
      const limit = Math.min(COMMENT_PAGE_LIMIT_MAX, Math.max(1, parseInt(String(req.query.limit)) || 5));
      sendSuccess(res, await commentService.list(req.params.letterId, page, limit, req.user?.userId));
    } catch (error) {
      fail(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) return void sendUnauthorized(res, "로그인이 필요합니다");
      const c = await commentService.create(req.params.letterId, req.user.userId, req.body.content);
      sendCreated(res, { _id: String(c._id), createdAt: c.createdAt }, "댓글을 남겼어요");
    } catch (error) {
      fail(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) return void sendUnauthorized(res, "로그인이 필요합니다");
      await commentService.remove(req.params.letterId, req.params.commentId, req.user.userId, isAdminEmail(req.user.email));
      sendSuccess(res, null, "댓글을 삭제했어요");
    } catch (error) {
      fail(res, error);
    }
  }
}

export default new CommentController();
