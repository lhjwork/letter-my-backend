import { Router, Request, Response } from "express";
import { body, param } from "express-validator";
import Diary, { DIARY_FONTS, DIARY_PAPERS } from "../models/Diary";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { contentSizeLimit, validateHtmlContent } from "../middleware/contentValidation";

// ponytail: 컨트롤러/서비스 분리 없이 라우트 안에 핸들러. 로직이 커지면 diaryService로 뺀다.
const router: Router = Router();
router.use(authenticate);

const fail = (res: Response, status: number, error: string): void => {
  res.status(status).json({ success: false, error });
};

/** 본인 소유 다이어리만 반환. 없으면 404 응답을 보내고 null */
async function ownDiary(req: Request, res: Response) {
  const diary = await Diary.findOne({ _id: req.params.diaryId, userId: req.user!.userId });
  if (!diary) fail(res, 404, "다이어리를 찾을 수 없습니다.");
  return diary;
}

const diaryIdValidation = [param("diaryId").isMongoId(), validate];
const settingsValidation = [
  body("title").optional().trim().isLength({ min: 1, max: 50 }).withMessage("제목은 1-50자여야 합니다."),
  body("paper").optional().isIn(DIARY_PAPERS),
  body("font").optional().isIn(DIARY_FONTS),
];

// 내 다이어리 목록 (페이지 본문 제외)
router.get("/", async (req, res) => {
  const diaries = await Diary.find({ userId: req.user!.userId }, { "pages.content": 0 }).sort({ month: -1, updatedAt: -1 });
  res.json({ success: true, data: diaries });
});

// 생성
router.post(
  "/",
  [body("title").trim().isLength({ min: 1, max: 50 }).withMessage("제목은 1-50자여야 합니다."), body("month").matches(/^\d{4}-\d{2}$/).withMessage("month는 YYYY-MM 형식"), ...settingsValidation, validate],
  async (req: Request, res: Response) => {
    const { title, month, paper, font } = req.body;
    const diary = await Diary.create({ userId: req.user!.userId, title, month, paper, font });
    res.status(201).json({ success: true, data: diary });
  },
);

// 단건 (페이지 포함)
router.get("/:diaryId", diaryIdValidation, async (req: Request, res: Response) => {
  const diary = await ownDiary(req, res);
  if (diary) res.json({ success: true, data: diary });
});

// 설정 수정 (제목·종이·폰트)
router.patch("/:diaryId", [...diaryIdValidation, ...settingsValidation, validate], async (req: Request, res: Response) => {
  const diary = await ownDiary(req, res);
  if (!diary) return;
  const { title, paper, font } = req.body;
  if (title !== undefined) diary.title = title;
  if (paper !== undefined) diary.paper = paper;
  if (font !== undefined) diary.font = font;
  await diary.save();
  res.json({ success: true, data: diary });
});

// 날짜 페이지 저장 (upsert)
router.put(
  "/:diaryId/pages/:date",
  [param("diaryId").isMongoId(), param("date").matches(/^\d{4}-\d{2}-\d{2}$/), body("content").isString(), validate],
  contentSizeLimit(50000),
  validateHtmlContent,
  async (req: Request, res: Response) => {
    const diary = await ownDiary(req, res);
    if (!diary) return;
    const { date } = req.params;
    if (!date.startsWith(diary.month)) {
      fail(res, 400, "이 다이어리의 달에 속하지 않는 날짜입니다.");
      return;
    }
    const page = diary.pages.find((p) => p.date === date);
    if (page) page.content = req.body.content;
    else diary.pages.push({ date, content: req.body.content });
    await diary.save();
    res.json({ success: true, data: { date, savedAt: diary.updatedAt } });
  },
);

router.delete("/:diaryId", diaryIdValidation, async (req: Request, res: Response) => {
  const diary = await ownDiary(req, res);
  if (!diary) return;
  await diary.deleteOne();
  res.json({ success: true });
});

export default router;
