import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import diaryService, { DiaryError, normalizeSections } from "../services/diaryService";
import { sendSuccess, sendCreated, sendError, sendServerError, sendUnauthorized } from "../utils/response";

/** 서비스 에러 → 상태 코드. 모델 검증 실패는 400 */
async function run(res: Response, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof DiaryError) return void sendError(res, e.message, e.status, e.status === 423 ? "LOCKED" : undefined);
    if (e instanceof mongoose.Error.ValidationError) return void sendError(res, Object.values(e.errors)[0]?.message || "입력값을 확인해주세요.", 400, "BAD_REQUEST");
    console.error("Diary error:", e);
    sendServerError(res, "서버 오류가 발생했습니다");
  }
}

const uid = (req: Request) => req.user!.userId;
const id = (req: Request) => String(req.params.id);

class DiaryController {
  list = (req: Request, res: Response) => run(res, async () => void sendSuccess(res, await diaryService.list(uid(req))));

  create = (req: Request, res: Response) =>
    run(res, async () => {
      const { title, month, cover, paper, font } = req.body;
      const sections = req.body.sections === undefined ? undefined : normalizeSections(req.body.sections);
      if (sections === null) throw new DiaryError(400, "구성을 하나 이상 골라주세요.");
      const d = await diaryService.create(uid(req), { title, month, cover, paper, font, ...(sections && { sections }) } as Parameters<typeof diaryService.create>[1]);
      sendCreated(res, d.toObject(), "다이어리를 만들었어요");
    });

  get = (req: Request, res: Response) => run(res, async () => void sendSuccess(res, await diaryService.get(uid(req), id(req))));

  remove = (req: Request, res: Response) =>
    run(res, async () => {
      await diaryService.remove(uid(req), id(req));
      sendSuccess(res, null, "다이어리를 지웠어요");
    });

  updateSettings = (req: Request, res: Response) =>
    run(res, async () => {
      const { title, cover, paper, font } = req.body;
      const sections = req.body.sections === undefined ? undefined : normalizeSections(req.body.sections);
      if (sections === null) throw new DiaryError(400, "구성을 하나 이상 골라주세요.");
      const d = await diaryService.updateSettings(uid(req), id(req), { title, cover, paper, font, sections });
      sendSuccess(res, { title: d.title, cover: d.cover, paper: d.paper, font: d.font, sections: d.sections, updatedAt: d.updatedAt });
    });

  setSection = (name: "first" | "monthly" | "goals" | "letters" | "review") => (req: Request, res: Response) =>
    run(res, async () => {
      const d = await diaryService.setSection(uid(req), id(req), name, req.body);
      sendSuccess(res, { [name]: d.get(name), updatedAt: d.updatedAt });
    });

  putWeek = (req: Request, res: Response) =>
    run(res, async () => {
      const week = Number(req.params.week);
      const { plans = [], todos = [], line = "" } = req.body;
      const d = await diaryService.putWeek(uid(req), id(req), week, { plans, todos, line });
      sendSuccess(res, { week: d.weeks.find((w) => w.week === week), updatedAt: d.updatedAt });
    });

  putDay = (req: Request, res: Response) =>
    run(res, async () => {
      const date = String(req.params.date);
      const { weather = null, text = "", thanks = "", letters = [] } = req.body;
      const d = await diaryService.putDay(uid(req), id(req), date, { weather, text, thanks, letters });
      sendSuccess(res, { day: d.days.find((x) => x.date === date) ?? null, updatedAt: d.updatedAt });
    });

  putDecos = (req: Request, res: Response) =>
    run(res, async () => {
      const page = String(req.params.page);
      const d = await diaryService.putDecos(uid(req), id(req), page, req.body.decos);
      sendSuccess(res, { decos: d.decos.filter((x) => x.page === page), updatedAt: d.updatedAt });
    });

  attachableLetters = (req: Request, res: Response) => run(res, async () => void sendSuccess(res, await diaryService.attachableLetters(uid(req), id(req))));

  requestPhysical = (req: Request, res: Response) =>
    run(res, async () => {
      const { binding, copies, address } = req.body;
      sendCreated(res, await diaryService.requestPhysical(uid(req), id(req), { binding, copies, address }), "책으로 받기를 신청했어요");
    });

  /** 관리자 인쇄용 열람: 관리자 API 가 발급한 15분 토큰(?t=). 소유자 세션 없이 조회 */
  printView = (req: Request, res: Response) =>
    run(res, async () => {
      try {
        const t = jwt.verify(String(req.query.t || ""), process.env.JWT_SECRET!, { algorithms: ["HS256"] }) as { type?: string; diaryId?: string };
        if (t.type !== "diary-print" || t.diaryId !== id(req)) throw new Error("bad token");
      } catch {
        return void sendUnauthorized(res, "인쇄 링크가 유효하지 않거나 만료되었습니다.");
      }
      sendSuccess(res, await diaryService.printView(id(req)));
    });

  // ===== 관리자 =====
  adminList = (req: Request, res: Response) => run(res, async () => void sendSuccess(res, await diaryService.listPhysical((req.query.status as Parameters<typeof diaryService.listPhysical>[0]) || undefined)));

  adminPrintLink = (req: Request, res: Response) =>
    run(res, async () => {
      await diaryService.assertPrintable(id(req));
      const token = jwt.sign({ type: "diary-print", diaryId: id(req) }, process.env.JWT_SECRET!, { expiresIn: "15m", algorithm: "HS256" });
      sendSuccess(res, { token, expiresIn: 900 });
    });

  adminUpdatePhysical = (req: Request, res: Response) =>
    run(res, async () => {
      const { status, notes } = req.body;
      sendSuccess(res, await diaryService.updatePhysical(id(req), { status, notes }));
    });
}

export default new DiaryController();
