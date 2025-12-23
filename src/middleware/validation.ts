import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Validation 결과 확인 미들웨어
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // 첫 번째 에러 메시지를 주 메시지로 사용
    const firstError = errors.array()[0];
    const mainMessage = firstError.msg || "Validation failed";

    res.status(400).json({
      success: false,
      message: mainMessage,
      errors: errors.array(),
      details: errors.array().map((err) => ({
        field: "path" in err ? err.path : "param" in err ? err.param : "unknown",
        message: err.msg,
        value: "value" in err ? err.value : undefined,
      })),
    });
    return;
  }

  next();
};

// OAuth 로그인 Validation
export const oauthLoginValidation = [
  body("provider").isIn(["instagram", "naver", "kakao"]).withMessage("Provider must be instagram, naver, or kakao"),
  body("providerId").notEmpty().withMessage("Provider ID is required"),
  body("email")
    .if((value, { req }) => {
      // Kakao provider일 경우 email이 없으면 validation 건너뜀
      if (req.body.provider === "kakao" && !value) return false;
      return true;
    })
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
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

// 편지 생성/수정 Validation
export const letterValidation = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 100 }).withMessage("Title must be less than 100 characters"),
  body("content").notEmpty().withMessage("Content is required"),
  body("authorName").trim().notEmpty().withMessage("Author name is required"),
  validate,
];
