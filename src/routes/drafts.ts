import { Router } from "express";
import draftLetterController from "../controllers/draftLetterController";
import { authenticate } from "../middleware/auth";
import { body } from "express-validator";
import { validate } from "../middleware/validation";

const router: Router = Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticate);

// 임시저장 생성/수정 Validation
const saveDraftValidation = [
  body("title").optional().trim().isLength({ max: 200 }).withMessage("제목은 200자 이내여야 합니다."),
  body("content").optional().trim().isLength({ max: 10000 }).withMessage("내용은 10,000자 이내여야 합니다."),
  body("type").optional().isIn(["friend", "story"]).withMessage("올바른 편지 타입을 선택해주세요."),
  body("category").optional().trim().isLength({ max: 50 }).withMessage("카테고리는 50자 이내여야 합니다."),
  body("draftId").optional().isMongoId().withMessage("올바른 임시저장 ID가 아닙니다."),
  // recipientAddresses 검증
  body("recipientAddresses").optional().isArray().withMessage("수신자 주소는 배열이어야 합니다."),
  body("recipientAddresses.*.name").optional().trim().isLength({ min: 2, max: 50 }).withMessage("받는 분 성함은 2-50자 이내여야 합니다."),
  body("recipientAddresses.*.phone")
    .optional()
    .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .withMessage("올바른 휴대폰 번호 형식이 아닙니다."),
  body("recipientAddresses.*.zipCode")
    .optional()
    .matches(/^[0-9]{5}$/)
    .withMessage("우편번호는 5자리 숫자여야 합니다."),
  body("recipientAddresses.*.address1").optional().trim().isLength({ min: 5, max: 200 }).withMessage("주소는 5-200자 이내여야 합니다."),
  body("recipientAddresses.*.address2").optional().trim().isLength({ max: 200 }).withMessage("상세주소는 200자 이내여야 합니다."),
  body("recipientAddresses.*.memo").optional().trim().isLength({ max: 500 }).withMessage("메모는 500자 이내여야 합니다."),
  validate,
];

// 발행 Validation
const publishDraftValidation = [
  body("title").optional().trim().isLength({ min: 1, max: 200 }).withMessage("제목은 1-200자 이내여야 합니다."),
  body("content").optional().trim().isLength({ min: 1, max: 10000 }).withMessage("내용은 1-10,000자 이내여야 합니다."),
  body("type").optional().isIn(["friend", "story"]).withMessage("올바른 편지 타입을 선택해주세요."),
  body("category").optional().trim().isLength({ max: 50 }).withMessage("카테고리는 50자 이내여야 합니다."),
  validate,
];

/**
 * @route   GET /api/drafts/stats
 * @desc    임시저장 통계 조회
 * @access  Private
 */
router.get("/stats", draftLetterController.getDraftStats);

/**
 * @route   POST /api/drafts/cleanup
 * @desc    오래된 임시저장 정리 (관리자용)
 * @access  Private
 */
router.post("/cleanup", draftLetterController.cleanupOldDrafts);

/**
 * @route   POST /api/drafts
 * @desc    임시저장 생성
 * @access  Private
 */
router.post("/", saveDraftValidation, draftLetterController.saveDraft);

/**
 * @route   GET /api/drafts
 * @desc    임시저장 목록 조회
 * @access  Private
 * @query   page, limit, sort, type
 */
router.get("/", draftLetterController.getDrafts);

/**
 * @route   GET /api/drafts/:draftId
 * @desc    임시저장 상세 조회
 * @access  Private
 */
router.get("/:draftId", draftLetterController.getDraft);

/**
 * @route   PUT /api/drafts/:draftId
 * @desc    임시저장 수정
 * @access  Private
 */
router.put("/:draftId", saveDraftValidation, draftLetterController.updateDraft);

/**
 * @route   DELETE /api/drafts/:draftId
 * @desc    임시저장 삭제
 * @access  Private
 */
router.delete("/:draftId", draftLetterController.deleteDraft);

/**
 * @route   POST /api/drafts/:draftId/publish
 * @desc    임시저장 → 정식 발행
 * @access  Private
 */
router.post("/:draftId/publish", publishDraftValidation, draftLetterController.publishDraft);

export default router;
