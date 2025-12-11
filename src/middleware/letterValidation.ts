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
  validate,
];

// 편지 업데이트 Validation
export const updateLetterValidation = [
  param("id").isMongoId().withMessage("Invalid letter ID"),
  body("title").optional().isString().withMessage("Title must be a string"),
  body("content").optional().isString().withMessage("Content must be a string"),
  body("authorName").optional().isString().withMessage("Author name must be a string"),
  body("ogPreviewMessage").optional().isString().withMessage("ogPreviewMessage must be a string"),
  body("ogBgColor").optional().isString().withMessage("ogBgColor must be a string"),
  body("ogIllustration").optional().isString().withMessage("ogIllustration must be a string"),
  body("ogFontSize").optional().isInt({ min: 12, max: 100 }).withMessage("ogFontSize must be between 12 and 100"),
  validate,
];

// 편지 ID Validation
export const letterIdValidation = [param("id").isMongoId().withMessage("Invalid letter ID"), validate];
