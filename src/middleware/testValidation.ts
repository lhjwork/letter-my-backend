import { body, param } from "express-validator";
import { validate } from "./validation";

// 테스트 생성 Validation
export const createTestValidation = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ min: 3, max: 100 }).withMessage("Title must be between 3 and 100 characters"),
  body("description").trim().notEmpty().withMessage("Description is required").isLength({ min: 10 }).withMessage("Description must be at least 10 characters long"),
  body("priority").optional().isInt({ min: 1, max: 5 }).withMessage("Priority must be between 1 and 5"),
  body("status").optional().isIn(["pending", "in-progress", "completed"]).withMessage("Status must be pending, in-progress, or completed"),
  validate,
];

// 테스트 업데이트 Validation
export const updateTestValidation = [
  body("title").optional().trim().isLength({ min: 3, max: 100 }).withMessage("Title must be between 3 and 100 characters"),
  body("description").optional().trim().isLength({ min: 10 }).withMessage("Description must be at least 10 characters long"),
  body("priority").optional().isInt({ min: 1, max: 5 }).withMessage("Priority must be between 1 and 5"),
  body("status").optional().isIn(["pending", "in-progress", "completed"]).withMessage("Status must be pending, in-progress, or completed"),
  validate,
];

// 테스트 상태 변경 Validation
export const changeStatusValidation = [body("status").isIn(["pending", "in-progress", "completed"]).withMessage("Status must be pending, in-progress, or completed"), validate];

// MongoDB ObjectId Validation
export const testIdValidation = [param("id").isMongoId().withMessage("Invalid test ID"), validate];

// 상태 파라미터 Validation
export const statusParamValidation = [param("status").isIn(["pending", "in-progress", "completed"]).withMessage("Status must be pending, in-progress, or completed"), validate];
