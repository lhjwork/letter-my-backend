import { Router } from "express";
import letterController from "../controllers/letterController";
import { authenticate } from "../middleware/auth";
import { createLetterValidation, updateLetterValidation, letterIdValidation } from "../middleware/letterValidation";
import { body } from "express-validator";
import { validate } from "../middleware/validation";

const router: Router = Router();

// 사연 생성 Validation
const createStoryValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("content").notEmpty().withMessage("Content is required"),
  body("authorName").optional().trim(),
  body("category")
    .optional()
    .isIn(["가족", "사랑", "우정", "성장", "위로", "추억", "감사", "기타"])
    .withMessage("Invalid category"),
  validate,
];

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
 * @desc    편지 생성
 * @access  Private
 */
router.post("/", authenticate, createLetterValidation, letterController.createLetter);

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
 * @route   GET /api/letters/:id
 * @desc    ID로 편지 조회 (조회수 증가)
 * @access  Public
 */
router.get("/:id", letterIdValidation, letterController.getLetterById);

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

export default router;
