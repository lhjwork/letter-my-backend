import { body, param } from "express-validator";
import { validate } from "./validation";

// 편지 생성 Validation
export const createLetterValidation = [
  body("content").notEmpty().withMessage("Content is required").isString().withMessage("Content must be a string"),
  body("ogPreviewMessage").optional().isString().withMessage("ogPreviewMessage must be a string"),
  validate,
];

// 편지 업데이트 Validation
export const updateLetterValidation = [
  param("id").isMongoId().withMessage("Invalid letter ID"),
  body("content").optional().isString().withMessage("Content must be a string"),
  body("ogPreviewMessage").optional().isString().withMessage("ogPreviewMessage must be a string"),
  validate,
];

// 편지 ID Validation
export const letterIdValidation = [param("id").isMongoId().withMessage("Invalid letter ID"), validate];
