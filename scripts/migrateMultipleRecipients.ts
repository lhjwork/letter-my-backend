import mongoose from "mongoose";
import Letter from "../src/models/Letter";
import dotenv from "dotenv";

// 환경 변수 로드
dotenv.config();

/**
 * Letter 모델에 다중 수신자 관련 필드 추가 마이그레이션
 */
async function migrateMultipleRecipients() {
  try {
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/letter-db";
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB 연결 성공");

    // 다중 수신자 필드가 없는 편지들 찾기
    const letters = await Letter.find({
      $or: [{ multipleRecipientsEnabled: { $exists: false } }, { totalRecipients: { $exists: false } }, { completedRecipients: { $exists: false } }],
    });

    console.log(`📝 마이그레이션할 편지 수: ${letters.length}`);

    if (letters.length === 0) {
      console.log("✅ 마이그레이션할 편지가 없습니다.");
      return;
    }

    let updatedCount = 0;

    for (const letter of letters) {
      try {
        // 기본값 설정
        const updateData: any = {};

        if (letter.multipleRecipientsEnabled === undefined) {
          updateData.multipleRecipientsEnabled = false;
        }

        if (letter.totalRecipients === undefined) {
          updateData.totalRecipients = 0;
        }

        if (letter.completedRecipients === undefined) {
          updateData.completedRecipients = 0;
        }

        // 업데이트 실행
        if (Object.keys(updateData).length > 0) {
          await Letter.findByIdAndUpdate(letter._id, { $set: updateData });
          updatedCount++;

          if (updatedCount % 100 === 0) {
            console.log(`📊 진행률: ${updatedCount}/${letters.length}`);
          }
        }
      } catch (error) {
        console.error(`❌ 편지 ${letter._id} 업데이트 실패:`, error);
      }
    }

    console.log(`✅ 마이그레이션 완료: ${updatedCount}개 편지 업데이트`);

    // 마이그레이션 결과 확인
    const verificationResult = await Letter.aggregate([
      {
        $group: {
          _id: null,
          totalLetters: { $sum: 1 },
          withMultipleRecipientsEnabled: {
            $sum: { $cond: [{ $eq: ["$multipleRecipientsEnabled", true] }, 1, 0] },
          },
          withTotalRecipients: {
            $sum: { $cond: [{ $gt: ["$totalRecipients", 0] }, 1, 0] },
          },
          withCompletedRecipients: {
            $sum: { $cond: [{ $gt: ["$completedRecipients", 0] }, 1, 0] },
          },
        },
      },
    ]);

    if (verificationResult.length > 0) {
      const stats = verificationResult[0];
      console.log("\n📊 마이그레이션 결과 통계:");
      console.log(`- 전체 편지 수: ${stats.totalLetters}`);
      console.log(`- 다중 수신자 활성화된 편지: ${stats.withMultipleRecipientsEnabled}`);
      console.log(`- 총 수신자가 있는 편지: ${stats.withTotalRecipients}`);
      console.log(`- 완료된 수신자가 있는 편지: ${stats.withCompletedRecipients}`);
    }

    console.log("\n✅ 다중 수신자 필드 마이그레이션이 성공적으로 완료되었습니다!");
  } catch (error) {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  } finally {
    // MongoDB 연결 종료
    await mongoose.disconnect();
    console.log("🔌 MongoDB 연결 종료");
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateMultipleRecipients()
    .then(() => {
      console.log("🎉 스크립트 실행 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 스크립트 실행 실패:", error);
      process.exit(1);
    });
}

export default migrateMultipleRecipients;
