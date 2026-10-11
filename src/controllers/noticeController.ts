import { Request, Response } from "express";
import noticeService, { parsePaging, pickNoticeInput } from "../services/noticeService";
import { sendSuccess, sendCreated, sendNotFound, sendServerError } from "../utils/response";

const NOT_FOUND = "공지를 찾을 수 없습니다";

function fail(res: Response, error: unknown): void {
  console.error("Notice error:", error);
  sendServerError(res, "서버 오류가 발생했습니다");
}

class NoticeController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = parsePaging(req.query);
      sendSuccess(res, await noticeService.listPublic(page, limit, skip));
    } catch (error) {
      fail(res, error);
    }
  }

  async detail(req: Request, res: Response): Promise<void> {
    try {
      const notice = await noticeService.getPublic(String(req.params.id));
      if (!notice) return void sendNotFound(res, NOT_FOUND);
      sendSuccess(res, notice);
    } catch (error) {
      fail(res, error);
    }
  }

  // ===== 관리자 =====
  async adminList(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = parsePaging(req.query);
      sendSuccess(res, await noticeService.listAll(page, limit, skip));
    } catch (error) {
      fail(res, error);
    }
  }

  async adminDetail(req: Request, res: Response): Promise<void> {
    try {
      const notice = await noticeService.get(String(req.params.id));
      if (!notice) return void sendNotFound(res, NOT_FOUND);
      sendSuccess(res, notice);
    } catch (error) {
      fail(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const notice = await noticeService.create(pickNoticeInput(req.body));
      sendCreated(res, notice, "공지를 등록했습니다");
    } catch (error) {
      fail(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const notice = await noticeService.update(String(req.params.id), pickNoticeInput(req.body));
      if (!notice) return void sendNotFound(res, NOT_FOUND);
      sendSuccess(res, notice, "공지를 수정했습니다");
    } catch (error) {
      fail(res, error);
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      if (!(await noticeService.remove(String(req.params.id)))) return void sendNotFound(res, NOT_FOUND);
      sendSuccess(res, null, "공지를 삭제했습니다");
    } catch (error) {
      fail(res, error);
    }
  }
}

export default new NoticeController();
