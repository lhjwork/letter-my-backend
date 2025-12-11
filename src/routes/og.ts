import { Router } from "express";
import ogController from "../controllers/ogController";
import { uploadCustomImageValidation, autoGenerateValidation, getOgImageValidation } from "../middleware/ogValidation";

const router: Router = Router();

/**
 * @route   POST /api/og/upload
 * @desc    커스텀 OG 이미지 업로드
 * @access  Public
 */
router.post("/upload", uploadCustomImageValidation, ogController.uploadCustomImage);

/**
 * @route   PATCH /api/og/auto-generate
 * @desc    자동 생성된 OG 이미지 URL 저장
 * @access  Public
 */
router.patch("/auto-generate", autoGenerateValidation, ogController.autoGenerate);

/**
 * @route   GET /api/og/:letterId
 * @desc    OG 이미지 URL 조회
 * @access  Public
 */
router.get("/:letterId", getOgImageValidation, ogController.getOgImageUrl);

export default router;
