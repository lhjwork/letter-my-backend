import { Request, Response } from "express";
import inquiryService from "../services/inquiryService";
import { parsePaging } from "../services/noticeService";
import { InquiryStatus } from "../models/Inquiry";
import { sendSuccess, sendCreated, sendNotFound, sendUnauthorized, sendServerError } from "../utils/response";

const NOT_FOUND = "문의를 찾을 수 없습니다";

function fail(res: Response, error: unknown): void {
  console.error("Inquiry error:", error);
  sendServerError(res, "서버 오류가 발생했습니다");
}

class InquiryController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) return void sendUnauthorized(res, "로그인이 필요합니다");
      const { category, title, content } = req.body;
      const r = await inquiryService.create(req.user.userId, { category, title, content });
      sendCreated(res, { _id: String(r._id), createdAt: r.createdAt }, "문의를 남겼어요");
    } catch (error) {
      fail(res, error);
    }
  }

  async listMine(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) return void sendUnauthorized(res, "로그인이 필요합니다");
      sendSuccess(res, await inquiryService.listMine(req.user.userId));
    } catch (error) {
      fail(res, error);
    }
  }

  async getMine(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) return void sendUnauthorized(res, "로그인이 필요합니다");
      const r = await inquiryService.getMine(req.user.userId, String(req.params.id));
      if (!r) return void sendNotFound(res, NOT_FOUND);
      sendSuccess(res, r);
    } catch (error) {
      fail(res, error);
    }
  }

  // ===== 관리자 =====
  async adminList(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = parsePaging(req.query);
      const status = req.query.status ? (String(req.query.status) as InquiryStatus) : undefined;
      sendSuccess(res, await inquiryService.listForAdmin(status, page, limit, skip));
    } catch (error) {
      fail(res, error);
    }
  }

  async adminDetail(req: Request, res: Response): Promise<void> {
    try {
      const r = await inquiryService.getForAdmin(String(req.params.id));
      if (!r) return void sendNotFound(res, NOT_FOUND);
      sendSuccess(res, r);
    } catch (error) {
      fail(res, error);
    }
  }

  async answer(req: Request, res: Response): Promise<void> {
    try {
      const r = await inquiryService.answer(String(req.params.id), String(req.admin!._id), req.body.answer);
      if (!r) return void sendNotFound(res, NOT_FOUND);
      sendSuccess(res, { _id: String(r._id), status: r.status, answeredAt: r.answeredAt }, "답변을 저장했습니다");
    } catch (error) {
      fail(res, error);
    }
  }
}

export default new InquiryController();
