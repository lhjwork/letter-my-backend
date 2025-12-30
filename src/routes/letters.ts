import { Router } from "express";
import letterController from "../controllers/letterController";
import likeController from "../controllers/likeController";
import recipientLetterController from "../controllers/recipientLetterController";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import { updateLetterValidation, letterIdValidation } from "../middleware/letterValidation";
import { contentSizeLimit, validateHtmlContent } from "../middleware/contentValidation";
import { body } from "express-validator";
import { validate } from "../middleware/validation";

const router: Router = Router();

// 사연 생성 Validation
const createStoryValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("content").notEmpty().withMessage("Content is required"),
  body("authorName").optional().trim(),
  body("category").optional().isIn(["가족", "사랑", "우정", "성장", "위로", "추억", "감사", "기타"]).withMessage("Invalid category"),
  validate,
];

// 실물 편지 신청 Validation
const physicalLetterRequestValidation = [
  body("address.name").trim().isLength({ min: 2, max: 50 }).withMessage("받는 분 성함은 2-50자 이내여야 합니다."),
  body("address.phone")
    .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .withMessage("올바른 휴대폰 번호 형식이 아닙니다."),
  body("address.zipCode")
    .matches(/^[0-9]{5}$/)
    .withMessage("우편번호는 5자리 숫자여야 합니다."),
  body("address.address1").trim().isLength({ min: 5, max: 200 }).withMessage("주소는 5-200자 이내여야 합니다."),
  body("address.address2").optional().trim().isLength({ max: 200 }).withMessage("상세주소는 200자 이내여야 합니다."),
  validate,
];

// 새로운 편지 생성 Validation
const createLetterNewValidation = [
  body("title").trim().isLength({ min: 1, max: 100 }).withMessage("제목은 1-100자 이내여야 합니다."),
  body("content").trim().isLength({ min: 1, max: 50000 }).withMessage("내용은 1-50000자 이내여야 합니다."),
  body("type").isIn(["story", "friend"]).withMessage("올바른 편지 타입을 선택해주세요."),
  body("category").optional().trim(),
  body("ogTitle").optional().trim(),
  body("ogPreviewText").optional().trim(),
  body("aiGenerated").optional().isBoolean(),
  body("aiModel").optional().trim(),
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

/**
 * @route   POST /api/letters/create
 * @desc    편지 생성 (새로운 URL 공유 방식)
 * @access  Private
 */
router.post("/create", authenticate, contentSizeLimit(50000), validateHtmlContent, createLetterNewValidation, letterController.createLetterNew);

/**
 * @route   POST /api/letters/test-create
 * @desc    편지 생성 테스트 (디버깅용)
 * @access  Private
 */
router.post("/test-create", authenticate, (req, res) => {
  console.log("=== TEST CREATE ENDPOINT ===");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("User:", req.user);

  res.json({
    success: true,
    message: "테스트 엔드포인트 작동 중",
    data: {
      receivedBody: req.body,
      user: req.user,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * @route   GET /api/letters/stats
 * @desc    편지 생성 통계 조회
 * @access  Private
 */
router.get("/stats", authenticate, letterController.getLetterStats);

/**
 * @route   POST /api/letters/story
 * @desc    사연 등록
 * @access  Public
 */
router.post("/story", contentSizeLimit(50000), validateHtmlContent, createStoryValidation, letterController.createStory);

/**
 * @route   GET /api/letters/stories
 * @desc    사연 목록 조회 (페이지네이션, 검색, 정렬, 카테고리 필터)
 * @access  Public
 * @query   page, limit, search, sort, category
 */
router.get("/stories", letterController.getStories);

/**
 * @route   GET /api/letters/categories/stats
 * @desc    카테고리별 사연 통계 조회
 * @access  Public
 */
router.get("/categories/stats", letterController.getCategoryStats);

/**
 * @route   POST /api/letters
 * @desc    편지 생성 (기존 방식 - 하위 호환성)
 * @access  Private
 */
router.post("/", authenticate, contentSizeLimit(50000), validateHtmlContent, createLetterNewValidation, letterController.createLetterNew);

/**
 * @route   GET /api/letters/my
 * @desc    내 편지 목록 조회
 * @access  Private
 */
router.get("/my", authenticate, letterController.getMyLetters);

/**
 * @route   GET /api/letters
 * @desc    모든 편지 조회 (페이지네이션)
 * @access  Public
 */
router.get("/", letterController.getAllLetters);

/**
 * @route   GET /api/letters/:letterId
 * @desc    편지 조회 (새로운 URL 공유 방식)
 * @access  Public (로그인 시 본인 글 조회수 제외)
 */
router.get("/:letterId", optionalAuthenticate, letterController.getLetterByIdNew);

/**
 * @route   GET /api/letters/legacy/:id
 * @desc    ID로 편지 조회 (기존 방식 - 하위 호환성)
 * @access  Public (로그인 시 본인 글 조회수 제외)
 */
router.get("/legacy/:id", optionalAuthenticate, letterIdValidation, letterController.getLetterById);

/**
 * @route   PATCH /api/letters/:id
 * @desc    편지 업데이트
 * @access  Private
 */
router.patch("/:id", authenticate, updateLetterValidation, letterController.updateLetter);

/**
 * @route   DELETE /api/letters/:id
 * @desc    편지 삭제
 * @access  Private
 */
router.delete("/:id", authenticate, letterIdValidation, letterController.deleteLetter);

/**
 * @route   POST /api/letters/:id/like
 * @desc    좋아요 추가
 * @access  Private
 */
router.post("/:id/like", authenticate, letterIdValidation, likeController.addLike);

/**
 * @route   DELETE /api/letters/:id/like
 * @desc    좋아요 취소
 * @access  Private
 */
router.delete("/:id/like", authenticate, letterIdValidation, likeController.removeLike);

/**
 * @route   GET /api/letters/:id/like
 * @desc    좋아요 상태 확인
 * @access  Private
 */
router.get("/:id/like", authenticate, letterIdValidation, likeController.checkLikeStatus);

/**
 * @route   POST /api/letters/:letterId/physical-request
 * @desc    실물 편지 신청 (Letter의 recipientAddresses 사용)
 * @access  Public
 */
router.post("/:letterId/physical-request", physicalLetterRequestValidation, recipientLetterController.requestPhysicalLetter);

/**
 * @route   GET /api/letters/:letterId/physical-status
 * @desc    실물 편지 상태 조회 (Letter의 recipientAddresses 사용)
 * @access  Public
 */
router.get("/:letterId/physical-status", recipientLetterController.getPhysicalRequests);

/**
 * @route   GET /api/letters/:letterId/physical-status/simple
 * @desc    편지별 간단한 실물 편지 상태 조회 (사용자 기반)
 * @access  Private (로그인 필요)
 */
router.get("/:letterId/physical-status/simple", authenticate, recipientLetterController.getSimplePhysicalStatus);

/**
 * @route   GET /api/letters/:letterId/physical-status/user
 * @desc    사용자별 실물 편지 발송 상태 조회 (세션 기반)
 * @access  Public (세션 필요)
 */
router.get("/:letterId/physical-status/user", recipientLetterController.getPhysicalStatusForUser);

/**
 * @route   GET /api/letters/:letterId/recipients
 * @desc    작성자용 수신자 목록 조회 (편지 작성자만 접근 가능)
 * @access  Private (작성자만)
 */
router.get("/:letterId/recipients", authenticate, recipientLetterController.getAuthorRecipients);

// ==================== 작성자 승인 시스템 라우트 (Letter 기반) ====================

/**
 * @route   PATCH /api/letters/:letterId/physical-requests/:requestId/approval
 * @desc    편지 작성자용 신청 승인/거절 (Letter의 recipientAddresses 사용)
 * @access  Private (작성자만)
 */
router.patch(
  "/:letterId/physical-requests/:requestId/approval",
  authenticate,
  [
    body("action").isIn(["approve", "reject"]).withMessage("action은 approve 또는 reject이어야 합니다."),
    body("rejectionReason").optional().trim().isLength({ max: 500 }).withMessage("거절 사유는 500자 이내여야 합니다."),
    validate,
  ],
  recipientLetterController.processApproval
);

/**
 * @route   GET /api/letters/physical-requests/:requestId/status
 * @desc    개별 신청 상태 조회 (requestId 기반 - 세션 불필요)
 * @access  Public
 */
router.get("/physical-requests/:requestId/status", recipientLetterController.getRequestStatusByRequestId);

// ==================== 수신자 주소 관리 라우트 ====================

/**
 * @route   POST /api/letters/:id/recipient-addresses
 * @desc    편지에 수신자 주소 추가
 * @access  Private (작성자만)
 */
router.post(
  "/:id/recipient-addresses",
  authenticate,
  [
    body("name").trim().isLength({ min: 2, max: 50 }).withMessage("받는 분 성함은 2-50자 이내여야 합니다."),
    body("phone")
      .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
      .withMessage("올바른 휴대폰 번호 형식이 아닙니다."),
    body("zipCode")
      .matches(/^[0-9]{5}$/)
      .withMessage("우편번호는 5자리 숫자여야 합니다."),
    body("address1").trim().isLength({ min: 5, max: 200 }).withMessage("주소는 5-200자 이내여야 합니다."),
    body("address2").optional().trim().isLength({ max: 200 }).withMessage("상세주소는 200자 이내여야 합니다."),
    body("memo").optional().trim().isLength({ max: 500 }).withMessage("메모는 500자 이내여야 합니다."),
    validate,
  ],
  letterController.addRecipientAddress
);

/**
 * @route   GET /api/letters/:id/recipient-addresses
 * @desc    편지의 수신자 주소 목록 조회
 * @access  Private (작성자만)
 */
router.get("/:id/recipient-addresses", authenticate, letterController.getRecipientAddresses);

/**
 * @route   PUT /api/letters/:id/recipient-addresses/:addressId
 * @desc    편지의 수신자 주소 수정
 * @access  Private (작성자만)
 */
router.put(
  "/:id/recipient-addresses/:addressId",
  authenticate,
  [
    body("name").trim().isLength({ min: 2, max: 50 }).withMessage("받는 분 성함은 2-50자 이내여야 합니다."),
    body("phone")
      .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
      .withMessage("올바른 휴대폰 번호 형식이 아닙니다."),
    body("zipCode")
      .matches(/^[0-9]{5}$/)
      .withMessage("우편번호는 5자리 숫자여야 합니다."),
    body("address1").trim().isLength({ min: 5, max: 200 }).withMessage("주소는 5-200자 이내여야 합니다."),
    body("address2").optional().trim().isLength({ max: 200 }).withMessage("상세주소는 200자 이내여야 합니다."),
    body("memo").optional().trim().isLength({ max: 500 }).withMessage("메모는 500자 이내여야 합니다."),
    validate,
  ],
  letterController.updateRecipientAddress
);

/**
 * @route   DELETE /api/letters/:id/recipient-addresses/:addressId
 * @desc    편지의 수신자 주소 삭제
 * @access  Private (작성자만)
 */
router.delete("/:id/recipient-addresses/:addressId", authenticate, letterController.deleteRecipientAddress);

export default router;
