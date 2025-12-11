import { Router } from "express";
import letterController from "../controllers/letterController";
import { authenticate } from "../middleware/auth";
import { createLetterValidation, updateLetterValidation, letterIdValidation } from "../middleware/letterValidation";

const router = Router();

/**
 * @route   POST /api/letters
 * @desc    편지 생성
 * @access  Private
 */
router.post("/", authenticate, createLetterValidation, letterController.createLetter);

/**
 * @route   GET /api/letters/me
 * @desc    내 편지 목록 조회
 * @access  Private
 */
router.get("/me", authenticate, letterController.getMyLetters);

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
