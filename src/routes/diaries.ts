import { Router } from "express";
import { body, param, query } from "express-validator";
import diaryController from "../controllers/diaryController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { DECO_TYPES, DIARY_BINDINGS, DIARY_COVERS, DIARY_FONTS, DIARY_LIMITS, DIARY_PAPERS, DIARY_WEATHERS, LETTER_STYLES } from "../models/Diary";

const router: Router = Router();

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const idParam = param("id").isMongoId().withMessage("유효하지 않은 다이어리 ID입니다.");
const text = (path: string, max: number, optional = true) => (optional ? body(path).optional() : body(path)).isString().isLength({ max }).withMessage(`${max}자 이내여야 합니다.`);
const arr = (path: string, max: number) => body(path).optional().isArray({ max }).withMessage(`${max}개까지입니다.`);
const checks = (path: string, max: number) => [
  arr(path, max),
  body(`${path}.*.text`).isString().trim().isLength({ min: 1, max: DIARY_LIMITS.itemText }).withMessage(`${DIARY_LIMITS.itemText}자 이내여야 합니다.`),
  body(`${path}.*.done`).optional().isBoolean({ strict: true }),
];

// 관리자 인쇄용 열람(토큰). authenticate 보다 앞
router.get("/:id/print-view", [idParam, query("t").isString(), validate], diaryController.printView);

router.use(authenticate);

const settings = (create: boolean) => [
  (create ? body("title") : body("title").optional()).isString().trim().isLength({ min: 1, max: DIARY_LIMITS.title }).withMessage(`이름은 1-${DIARY_LIMITS.title}자여야 합니다.`),
  body("cover").optional().isIn(DIARY_COVERS),
  body("paper").optional().isIn(DIARY_PAPERS),
  body("font").optional().isIn(DIARY_FONTS),
  body("sections").optional().isArray({ min: 1, max: 7 }).withMessage("구성을 하나 이상 골라주세요."),
];

/** GET /api/diaries — 책장(요약) */
router.get("/", diaryController.list);
/** POST /api/diaries — 만들기 (월 1권, 중복 409) */
router.post("/", [...settings(true), body("month").matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage("month 는 YYYY-MM 형식입니다."), validate], diaryController.create);
/** GET /api/diaries/:id — 전체 + attachedLetters */
router.get("/:id", [idParam, validate], diaryController.get);
/** DELETE /api/diaries/:id */
router.delete("/:id", [idParam, validate], diaryController.remove);
/** PATCH /api/diaries/:id/settings */
router.patch("/:id/settings", [idParam, ...settings(false), validate], diaryController.updateSettings);

// ===== 섹션 통째 교체 =====
const sectionRules = {
  first: [text("owner", 20), arr("resolutions", 3), text("resolutions.*", 40, false), text("word", 10), text("toMe", 60)],
  monthly: [
    arr("events", 31 * DIARY_LIMITS.eventsPerDay),
    body("events.*.date").matches(DATE),
    text("events.*.text", DIARY_LIMITS.eventText, false),
    text("memo", DIARY_LIMITS.memo),
  ],
  goals: [
    ...checks("goals", 5),
    ...checks("todos", 8),
    arr("habits", 4),
    body("habits.*.name").isString().trim().isLength({ min: 1, max: 10 }).withMessage("습관 이름은 1-10자입니다."),
    body("habits.*.days").optional().isArray({ max: 31 }),
    body("habits.*.days.*").isInt({ min: 1, max: 31 }).toInt(),
    arr("wishes", 4),
    text("wishes.*", DIARY_LIMITS.itemText, false),
  ],
  letters: [arr("quotes", 4), body("quotes.*.text").isString().trim().isLength({ min: 1, max: 60 }), text("quotes.*.by", 20), body("quotes.*.date").optional({ values: "falsy" }).matches(DATE)],
  review: [arr("good", 3), text("good.*", 40, false), text("regret", 60), text("scene", 40), text("toNext", 300)],
};
for (const [name, rules] of Object.entries(sectionRules)) {
  /** PATCH /api/diaries/:id/section/{first|monthly|goals|letters|review} */
  router.patch(`/:id/section/${name}`, [idParam, ...rules, validate], diaryController.setSection(name as keyof typeof sectionRules));
}

/** PUT /api/diaries/:id/weeks/:week */
router.put(
  "/:id/weeks/:week",
  [
    idParam,
    param("week").isInt({ min: 1, max: 6 }).withMessage("주는 1-6입니다."),
    arr("plans", 21),
    body("plans.*.date").matches(DATE),
    text("plans.*.text", 30, false),
    ...checks("todos", 4),
    text("line", 40),
    validate,
  ],
  diaryController.putWeek,
);

/** PUT /api/diaries/:id/days/:date */
router.put(
  "/:id/days/:date",
  [
    idParam,
    param("date").matches(DATE).withMessage("date 는 YYYY-MM-DD 형식입니다."),
    body("weather").optional({ values: "null" }).isIn(DIARY_WEATHERS),
    text("text", DIARY_LIMITS.dayText).withMessage(`하루는 ${DIARY_LIMITS.dayText.toLocaleString()}자까지 쓸 수 있어요.`),
    text("thanks", DIARY_LIMITS.dayThanks),
    arr("letters", DIARY_LIMITS.dayLetters),
    body("letters.*.letterId").isMongoId(),
    body("letters.*.style").isIn(LETTER_STYLES),
    validate,
  ],
  diaryController.putDay,
);

/** PUT /api/diaries/:id/decos/:page — 그 장의 데코 통째 교체 */
router.put(
  "/:id/decos/:page",
  [
    idParam,
    param("page").isString().isLength({ min: 1, max: 20 }),
    body("decos").isArray({ max: DIARY_LIMITS.decosPerPage }).withMessage(`데코는 페이지당 ${DIARY_LIMITS.decosPerPage}개까지입니다.`),
    body("decos.*.id").isString().isLength({ min: 1, max: 40 }),
    body("decos.*.type").isIn(DECO_TYPES),
    body("decos.*.src").optional().isString().isLength({ max: 40 }),
    body("decos.*.x").isFloat({ min: -50, max: 150 }),
    body("decos.*.y").isFloat({ min: -50, max: 200 }),
    body("decos.*.w").isFloat({ min: 2, max: 100 }),
    body("decos.*.rotate").optional().isFloat({ min: -180, max: 180 }),
    body("decos.*.z").optional().isInt({ min: -1000, max: 1000 }),
    body("decos.*.text").optional().isString().isLength({ max: 60 }),
    body("decos.*.color").optional().isString().isLength({ max: 20 }),
    validate,
  ],
  diaryController.putDecos,
);

/** GET /api/diaries/:id/attachable-letters */
router.get("/:id/attachable-letters", [idParam, validate], diaryController.attachableLetters);

/** POST /api/diaries/:id/physical — 책으로 받기 신청(이후 잠금). 주소 규칙은 편지 실물 신청과 동일 */
router.post(
  "/:id/physical",
  [
    idParam,
    body("binding").isIn(DIARY_BINDINGS).withMessage("제본 방식을 선택해주세요."),
    body("copies").isInt({ min: 1, max: 5 }).withMessage("부수는 1-5권입니다.").toInt(),
    body("address.name").isString().trim().isLength({ min: 2, max: 50 }).withMessage("받는 분 성함은 2-50자 이내여야 합니다."),
    body("address.phone").matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/).withMessage("올바른 휴대폰 번호 형식이 아닙니다."),
    body("address.zipCode").matches(/^[0-9]{5}$/).withMessage("우편번호는 5자리 숫자여야 합니다."),
    body("address.address1").isString().trim().isLength({ min: 5, max: 200 }).withMessage("주소는 5-200자 이내여야 합니다."),
    body("address.address2").optional({ values: "falsy" }).isString().trim().isLength({ max: 200 }),
    body("address.memo").optional({ values: "falsy" }).isString().trim().isLength({ max: 500 }),
    validate,
  ],
  diaryController.requestPhysical,
);

export default router;
