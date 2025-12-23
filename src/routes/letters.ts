import { Router } from "express";
import letterController from "../controllers/letterController";
import likeController from "../controllers/likeController";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import { updateLetterValidation, letterIdValidation } from "../middleware/letterValidation";
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

// 새로운 편지 생성 Validation
const createLetterNewValidation = [
  body("title").trim().isLength({ min: 1, max: 100 }).withMessage("제목은 1-100자 이내여야 합니다."),
  body("content").trim().isLength({ min: 1, max: 10000 }).withMessage("내용은 1-10000자 이내여야 합니다."),
  body("type").isIn(["story", "friend"]).withMessage("올바른 편지 타입을 선택해주세요."),
  body("category").optional().trim(),
  body("ogTitle").optional().trim(),
  body("ogPreviewText").optional().trim(),
  body("aiGenerated").optional().isBoolean(),
  body("aiModel").optional().trim(),
  validate,
];

/**
 * @route   POST /api/letters/create
 * @desc    편지 생성 (새로운 URL 공유 방식)
 * @access  Private
 */
router.post("/create", authenticate, createLetterNewValidation, letterController.createLetterNew);

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
router.post("/story", createStoryValidation, letterController.createStory);

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
router.post("/", authenticate, createLetterNewValidation, letterController.createLetterNew);

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

export default router;
