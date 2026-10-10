import { body, param } from "express-validator";
import { validate } from "./validation";

// 편지 생성 Validation
export const createLetterValidation = [
  body("title").notEmpty().withMessage("Title is required").isString().withMessage("Title must be a string"),
  body("content").notEmpty().withMessage("Content is required").isString().withMessage("Content must be a string"),
  body("authorName").notEmpty().withMessage("Author name is required").isString().withMessage("Author name must be a string"),
  body("ogPreviewMessage").optional().isString().withMessage("ogPreviewMessage must be a string"),
  body("ogBgColor").optional().isString().withMessage("ogBgColor must be a string"),
  body("ogIllustration").optional().isString().withMessage("ogIllustration must be a string"),
  body("ogFontSize").optional().isInt({ min: 12, max: 100 }).withMessage("ogFontSize must be between 12 and 100"),
  body("category").optional().isString().withMessage("category must be a string"),
  body("isPublic").optional().isBoolean().withMessage("isPublic must be a boolean"),
  body("ogTitle").optional().isString(),
  body("ogPreviewText").optional().isString(),
  validate,
];

// 편지 업데이트 Validation
export const updateLetterValidation = [
  param("id").isMongoId().withMessage("Invalid letter ID"),
  body("title").optional().isString().withMessage("Title must be a string"),
  body("content").optional().isString().withMessage("Content must be a string"),
  body("authorName").optional().isString().withMessage("Author name must be a string"),
  body("category").optional().isIn(["가족", "사랑", "우정", "성장", "위로", "추억", "감사", "기타"]).withMessage("Invalid category"),
  body("contentType").optional().isIn(["text", "html"]).withMessage("contentType 은 text 또는 html 이어야 합니다."),
  body("envelope").optional().isIn(["seongsu", "myeongdong"]).withMessage("봉투는 seongsu 또는 myeongdong 이어야 합니다."),
  body("isAnonymous").optional().isBoolean().withMessage("isAnonymous 는 boolean 이어야 합니다.").toBoolean(),
  body("recipientName").optional({ values: "falsy" }).trim().isLength({ max: 50 }).withMessage("받는 사람은 50자 이내여야 합니다."),
  body("ogPreviewMessage").optional().isString().withMessage("ogPreviewMessage must be a string"),
  body("ogBgColor").optional().isString().withMessage("ogBgColor must be a string"),
  body("ogIllustration").optional().isString().withMessage("ogIllustration must be a string"),
  body("ogFontSize").optional().isInt({ min: 12, max: 100 }).withMessage("ogFontSize must be between 12 and 100"),
  validate,
];

// 편지 ID Validation
export const letterIdValidation = [param("id").isMongoId().withMessage("Invalid letter ID"), validate];
