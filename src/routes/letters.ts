import { Router } from "express";
import letterController from "../controllers/letterController";
import { authenticate } from "../middleware/auth";
import { createLetterValidation, updateLetterValidation, letterIdValidation } from "../middleware/letterValidation";

const router: Router = Router();

/**
 * @route   POST /api/letters
 * @desc    편지 생성
 * @access  Private
 */
router.post("/", authenticate, createLetterValidation, letterController.createLetter);

/**
 * @route   GET /api/letters/my
 * @desc    내 편지 목록 조회 (주의: /my는 /:id보다 위에 있어야 함)
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
 * @desc    ID로 편지 조회
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
