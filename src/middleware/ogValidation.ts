import { body, param } from "express-validator";
import { validate } from "./validation";

// 커스텀 OG 이미지 업로드 Validation
export const uploadCustomImageValidation = [
  body("letterId").notEmpty().withMessage("letterId is required").isMongoId().withMessage("Invalid letter ID"),
  body("file").notEmpty().withMessage("Image file is required"),
  body("ogPreviewMessage").optional().isString().withMessage("ogPreviewMessage must be a string"),
  body("style").optional().isString().withMessage("style must be a string"),
  validate,
];

// 자동 생성 OG 이미지 Validation
export const autoGenerateValidation = [
  body("letterId").notEmpty().withMessage("letterId is required").isMongoId().withMessage("Invalid letter ID"),
  body("ogImageUrl").notEmpty().withMessage("ogImageUrl is required").isURL().withMessage("ogImageUrl must be a valid URL"),
  validate,
];

// OG 이미지 URL 조회 Validation
export const getOgImageValidation = [param("letterId").isMongoId().withMessage("Invalid letter ID"), validate];
