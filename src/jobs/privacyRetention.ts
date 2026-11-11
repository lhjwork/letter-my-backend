import cron from "node-cron";
import Letter from "../models/Letter";
import Inquiry from "../models/Inquiry";
import Diary from "../models/Diary";

/**
 * 개인정보처리방침 제2조 보유 기간을 지키는 정리 작업. 매일 새벽 3시.
 * - 실물 편지 신청 배송 정보: 신청일부터 1년이 지나고 끝난 신청(거절·발송·도착)은 이름·연락처·주소를 지운다.
 *   신청 기록(상태·요청 ID)은 통계와 중복 확인 때문에 남기고 내용만 비운다.
 * - 다이어리 책으로 받기 배송지: 같은 기준(신청일 1년 + 끝난 신청)으로 physical.address 를 비운다.
 * - 문의: 답변일부터 1년이 지나면 문서째 지운다.
 */
export const RETENTION_DAYS = 365;
export const PURGED = "파기됨";
const ENDED = ["rejected", "sent", "delivered"] as ("rejected" | "sent" | "delivered")[];

export const cutoffFrom = (now: Date) => new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

/** 지울 배송지 조건(배열 원소 기준). 이미 지운 것은 다시 건드리지 않는다 */
export const expiredAddress = (cutoff: Date) => ({
  physicalStatus: { $in: ENDED },
  physicalRequestDate: { $lt: cutoff },
  address1: { $ne: PURGED },
});

/** 배송지 원소의 개인정보를 비우는 update. 스키마 필수값(name·zipCode·address1)은 표시용 값으로 채운다 */
export const purgeAddressUpdate = {
  $set: {
    "recipientAddresses.$[r].name": PURGED,
    "recipientAddresses.$[r].phone": "",
    "recipientAddresses.$[r].zipCode": PURGED,
    "recipientAddresses.$[r].address1": PURGED,
    "recipientAddresses.$[r].address2": "",
    "recipientAddresses.$[r].memo": "",
  },
  $unset: {
    "recipientAddresses.$[r].sessionId": "",
    "recipientAddresses.$[r].userAgent": "",
    "recipientAddresses.$[r].ipAddress": "",
  },
};

/** 다이어리 배송지 조건. Letter 와 같은 ENDED·기간 */
export const expiredDiaryAddress = (cutoff: Date) => ({
  "physical.status": { $in: ENDED },
  "physical.requestedAt": { $lt: cutoff },
  "physical.address.address1": { $exists: true, $ne: PURGED },
});

export const purgeDiaryAddressUpdate = {
  $set: {
    "physical.address.name": PURGED,
    "physical.address.phone": "",
    "physical.address.zipCode": PURGED,
    "physical.address.address1": PURGED,
    "physical.address.address2": "",
    "physical.address.memo": "",
  },
};

export const expiredInquiry = (cutoff: Date) => ({ status: "answered" as const, answeredAt: { $lt: cutoff } });

export async function purgeExpiredPersonalData(now = new Date()) {
  const cutoff = cutoffFrom(now);
  const addr = expiredAddress(cutoff);
  const letters = await Letter.updateMany({ recipientAddresses: { $elemMatch: addr } }, purgeAddressUpdate, {
    arrayFilters: [Object.fromEntries(Object.entries(addr).map(([k, v]) => [`r.${k}`, v]))],
  });
  const diaries = await Diary.updateMany(expiredDiaryAddress(cutoff), purgeDiaryAddressUpdate);
  const inquiries = await Inquiry.deleteMany(expiredInquiry(cutoff));
  return { letters: letters.modifiedCount, diaries: diaries.modifiedCount, inquiries: inquiries.deletedCount };
}

export const setupPrivacyRetentionJob = () => {
  cron.schedule("0 3 * * *", async () => {
    try {
      const r = await purgeExpiredPersonalData();
      console.log(`🧹 [CRON] Privacy retention: letters with purged addresses ${r.letters}, diaries ${r.diaries}, inquiries deleted ${r.inquiries}`);
    } catch (error) {
      console.error("❌ [CRON] Privacy retention job failed:", error);
    }
  });
  console.log("⏰ [CRON] Privacy retention job scheduled to run daily at 3:00 AM");
};
