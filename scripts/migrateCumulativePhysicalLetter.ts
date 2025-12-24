import mongoose from "mongoose";
import Letter from "../src/models/Letter";
import dotenv from "dotenv";

// 환경 변수 로드
dotenv.config();

/**
 * Letter 모델에 누적 실물 편지 관련 필드 추가 마이그레이션
 */
async function migrateCumulativePhysicalLetter() {
  try {
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/letter-db";
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB 연결 성공");

    // physicalRequestCount 필드가 없는 편지들 찾기
    const letters = await Letter.find({
      physicalRequestCount: { $exists: false },
    });

    console.log(`📝 마이그레이션할 편지 수: ${letters.length}`);

    if (letters.length === 0) {
      console.log("✅ 마이그레이션할 편지가 없습니다.");
      return;
    }

    let updatedCount = 0;

    for (const letter of letters) {
      try {
        // physicalRequestCount 필드 추가 (기본값 0)
        await Letter.findByIdAndUpdate(letter._id, {
          $set: { physicalRequestCount: 0 },
        });

        updatedCount++;

        if (updatedCount % 100 === 0) {
          console.log(`📊 진행률: ${updatedCount}/${letters.length}`);
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
          withPhysicalRequestCount: {
            $sum: { $cond: [{ $gte: ["$physicalRequestCount", 0] }, 1, 0] },
          },
          totalPhysicalRequests: { $sum: "$physicalRequestCount" },
        },
      },
    ]);

    if (verificationResult.length > 0) {
      const stats = verificationResult[0];
      console.log("\n📊 마이그레이션 결과 통계:");
      console.log(`- 전체 편지 수: ${stats.totalLetters}`);
      console.log(`- physicalRequestCount 필드가 있는 편지: ${stats.withPhysicalRequestCount}`);
      console.log(`- 총 누적 실물 편지 신청 수: ${stats.totalPhysicalRequests}`);
    }

    console.log("\n✅ 누적 실물 편지 필드 마이그레이션이 성공적으로 완료되었습니다!");
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
  migrateCumulativePhysicalLetter()
    .then(() => {
      console.log("🎉 스크립트 실행 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 스크립트 실행 실패:", error);
      process.exit(1);
    });
}

export default migrateCumulativePhysicalLetter;
