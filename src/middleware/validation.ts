import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Validation 결과 확인 미들웨어
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
    return;
  }

  next();
};

// 회원가입 Validation
export const registerValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  validate,
];

// 로그인 Validation
export const loginValidation = [body("email").isEmail().withMessage("Valid email is required").normalizeEmail(), body("password").notEmpty().withMessage("Password is required"), validate];

// OAuth 로그인 Validation
export const oauthLoginValidation = [
  body("provider").isIn(["instagram", "naver", "kakao"]).withMessage("Provider must be instagram, naver, or kakao"),
  body("providerId").notEmpty().withMessage("Provider ID is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("image").optional().isURL().withMessage("Image must be a valid URL"),
  body("accessToken").optional().isString(),
  body("refreshToken").optional().isString(),
  body("profile").optional().isObject(),
  validate,
];

// 사용자 정보 업데이트 Validation
export const updateUserValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("image").optional().isURL().withMessage("Image must be a valid URL"),
  body("email").optional().isEmail().withMessage("Valid email is required").normalizeEmail(),
  validate,
];

// 비밀번호 변경 Validation
export const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("New password must contain at least one uppercase letter, one lowercase letter, and one number"),
  validate,
];

// OAuth 계정 연결 Validation
export const linkOAuthValidation = [
  body("provider").isIn(["instagram", "naver", "kakao"]).withMessage("Provider must be instagram, naver, or kakao"),
  body("providerId").notEmpty().withMessage("Provider ID is required"),
  body("accessToken").optional().isString(),
  body("refreshToken").optional().isString(),
  body("profile").optional().isObject(),
  validate,
];

// OAuth 계정 연결 해제 Validation
export const unlinkOAuthValidation = [param("provider").isIn(["instagram", "naver", "kakao"]).withMessage("Provider must be instagram, naver, or kakao"), validate];

// MongoDB ObjectId Validation
export const mongoIdValidation = [param("id").isMongoId().withMessage("Invalid user ID"), validate];
