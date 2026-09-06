/**
 * 기존 사용자 실명 → 익명 닉네임 마이그레이션
 *
 * - 모든 사용자의 name을 익명 닉네임(예: 귀여운곰42)으로 교체
 * - 기존 실명은 realName 필드에 보존 (실물 편지 발송/어드민용)
 * - 각 사용자가 작성한 Letter(편지/사연)의 authorName도 함께 교체
 * - 이미 realName이 있는 사용자는 건너뜀 (재실행 안전)
 *
 * 실행 방법:
 * npx ts-node scripts/anonymizeUsers.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User";
import Letter from "../src/models/Letter";
import { generateUniqueNickname } from "../src/utils/nickname";

dotenv.config();

async function anonymizeUsers() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI가 환경 변수에 설정되지 않았습니다.");
  }

  console.log("MongoDB 연결 중...");
  await mongoose.connect(mongoUri);
  console.log("✓ MongoDB 연결 성공\n");

  const users = await User.find({ realName: { $exists: false } }, "_id name");
  console.log(`대상 사용자: ${users.length}명\n`);

  for (const user of users) {
    const nickname = await generateUniqueNickname();
    const oldName = user.name;

    await User.updateOne(
      { _id: user._id },
      { $set: { name: nickname, realName: oldName } }
    );
    const letterResult = await Letter.updateMany(
      { userId: user._id },
      { $set: { authorName: nickname } }
    );

    console.log(`${oldName} → ${nickname} (편지/사연 ${letterResult.modifiedCount}건 갱신)`);
  }

  console.log("\n✓ 마이그레이션 완료");
  await mongoose.disconnect();
}

anonymizeUsers().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
