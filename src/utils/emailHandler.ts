import User from "../models/User";

/**
 * 받는 사람 이메일을 결정하는 함수
 * @param senderId - 보내는 사람 ID
 * @returns 받는 사람 이메일
 */
export async function determineReceiverEmail(senderId: string): Promise<string> {
  const mode = process.env.LETTER_RECEIVER_MODE || "admin";

  switch (mode) {
    case "admin":
      // 옵션 1: 관리자 이메일로 고정
      return process.env.ADMIN_EMAIL || "admin@letter-community.com";

    case "user_default":
      // 옵션 2: 사용자 기본 설정에서 가져오기
      try {
        const user = await User.findById(senderId);
        return user?.letterSettings?.defaultReceiverEmail || process.env.ADMIN_EMAIL || "admin@letter-community.com";
      } catch (error) {
        console.error("사용자 기본 설정 조회 실패:", error);
        return process.env.ADMIN_EMAIL || "admin@letter-community.com";
      }

    case "anonymous":
      // 옵션 3: 랜덤 익명 편지함
      return generateAnonymousEmail();

    default:
      // 기본값: 관리자 이메일
      return process.env.ADMIN_EMAIL || "admin@letter-community.com";
  }
}

/**
 * 익명 편지함 이메일 생성
 * @returns 익명 이메일
 */
function generateAnonymousEmail(): string {
  const randomId = Math.random().toString(36).substring(2, 8);
  return `anonymous-${randomId}@letter-community.com`;
}

/**
 * 사용자별 일일 편지 전송 제한 확인
 * @param senderId - 보내는 사람 ID
 * @throws Error - 제한 초과 시
 */
export async function checkLetterLimit(senderId: string): Promise<void> {
  const limit = parseInt(process.env.LETTER_LIMIT_PER_DAY || "10");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const Letter = require("../models/Letter").default;

  const letterCount = await Letter.countDocuments({
    userId: senderId,
    type: "letter", // friend 편지만 카운트
    createdAt: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  if (letterCount >= limit) {
    throw new Error(`일일 편지 전송 한도(${limit}개)를 초과했습니다.`);
  }
}
