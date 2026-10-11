import { Request, Response, NextFunction } from "express";
import myRecordsService, { RecordFlow, RecordTab } from "../services/myRecordsService";
import { sendSuccess, sendUnauthorized } from "../utils/response";

/** GET /api/letters/my/records?tab=&flow=&limit= — 마이페이지 내 기록 (검증은 라우트 express-validator) */
export async function getMyRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res, "로그인이 필요합니다");
      return;
    }
    const result = await myRecordsService.getMyRecords(req.user.userId, {
      tab: (req.query.tab as RecordTab) ?? "all",
      flow: (req.query.flow as RecordFlow) ?? "all",
      limit: Number(req.query.limit ?? 6),
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
