import rateLimit from "express-rate-limit";

/**
 * 일반 API 요청 제한: 15분에 100회
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." },
  },
});

/**
 * 인증 관련 제한: 15분에 10회 (로그인, OAuth)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요." },
  },
});

/**
 * 편지 작성 제한: 1시간에 30회
 */
export const letterCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "편지 작성 횟수를 초과했습니다. 잠시 후 다시 시도해주세요." },
  },
});

/**
 * 관리자 로그인 제한: 15분에 5회
 */
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "관리자 로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요." },
  },
});
