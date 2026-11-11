import rateLimit from "express-rate-limit";
import type { Request } from "express";

/** 다이어리 신청 횟수를 세는 키: 로그인 사용자 id (테스트: src/tests/diary.test.ts) */
export const diaryPhysicalKey = (req: Request): string => `diary-physical:${req.user!.userId}`;

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
 * 실물 편지 신청 제한: 1시간에 5회 (주소 수집 남용 방지)
 */
export const physicalRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "실물 편지 신청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요." },
  },
});

/**
 * 다이어리 책으로 받기 신청 제한: 사용자마다 1시간에 5회. authenticate 뒤에 둔다.
 * 프런트 서버 액션이 백엔드를 직접 불러 IP 가 모두 같으므로 IP 가 아니라 사용자 id 로 센다
 */
export const diaryPhysicalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: diaryPhysicalKey,
  message: {
    success: false,
    error: { message: "책으로 받기 신청 횟수를 초과했습니다. 한 시간 뒤 다시 시도해주세요." },
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

/**
 * 댓글 작성 제한: 1분에 10회
 */
export const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "댓글을 너무 자주 남기고 있어요. 잠시 후 다시 시도해주세요." },
  },
});

/**
 * 1:1 문의 작성 제한: 1시간에 10회
 */
export const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "문의를 너무 자주 남기고 있어요. 잠시 후 다시 시도해주세요." },
  },
});
