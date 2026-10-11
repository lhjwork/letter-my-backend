import { Router } from "express";
import { body, param } from "express-validator";
import inquiryController from "../controllers/inquiryController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { inquiryLimiter } from "../middleware/rateLimiter";
import { INQUIRY_CATEGORIES, INQUIRY_TITLE_MAX, INQUIRY_CONTENT_MAX } from "../models/Inquiry";

const router: Router = Router();

/** POST /api/inquiries — 문의 남기기 (로그인) */
router.post(
  "/",
  authenticate,
  inquiryLimiter,
  [
    body("category").isString().isIn(INQUIRY_CATEGORIES).withMessage("문의 분류를 골라주세요."),
    body("title").isString().trim().isLength({ min: 1, max: INQUIRY_TITLE_MAX }).withMessage(`제목은 1-${INQUIRY_TITLE_MAX}자 이내여야 합니다.`),
    body("content").isString().trim().isLength({ min: 1, max: INQUIRY_CONTENT_MAX }).withMessage(`내용은 1-${INQUIRY_CONTENT_MAX}자 이내여야 합니다.`),
    validate,
  ],
  inquiryController.create
);

/** GET /api/inquiries/my — 내 문의 (최신순) */
router.get("/my", authenticate, inquiryController.listMine);

/** GET /api/inquiries/my/:id — 내 문의 상세 (본인 것만, 아니면 404) */
router.get("/my/:id", authenticate, [param("id").isMongoId().withMessage("유효하지 않은 문의 ID입니다."), validate], inquiryController.getMine);

export default router;
