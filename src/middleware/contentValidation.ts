import { Request, Response, NextFunction } from "express";
import { validateContentSize } from "../utils/htmlProcessor";

/**
 * 콘텐츠 크기 제한 미들웨어
 */
export const contentSizeLimit = (maxSize: number = 50000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body.content && !validateContentSize(req.body.content, maxSize)) {
      return res.status(400).json({
        success: false,
        message: `편지 내용이 너무 깁니다. 최대 ${Math.floor(maxSize / 1000)}KB까지 가능합니다.`,
        errorType: "CONTENT_TOO_LARGE",
      });
    }
    next();
  };
};

/**
 * HTML 콘텐츠 보안 검증 미들웨어
 */
export const validateHtmlContent = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.content) {
    // 기본적인 HTML 태그 검증
    const dangerousTags = /<(script|object|embed|form|input|iframe|link|meta)[^>]*>/gi;
    if (dangerousTags.test(req.body.content)) {
      return res.status(400).json({
        success: false,
        message: "허용되지 않는 HTML 태그가 포함되어 있습니다.",
        errorType: "INVALID_HTML_CONTENT",
      });
    }
  }
  next();
};
