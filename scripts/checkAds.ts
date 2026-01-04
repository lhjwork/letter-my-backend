import mongoose from "mongoose";
import Advertisement from "../src/models/Advertisement";
import dotenv from "dotenv";

// 환경변수 로드
dotenv.config();

async function checkAds() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ MongoDB 연결 성공");

    // 모든 광고 조회
    const ads = await Advertisement.find({});
    console.log(`📊 총 광고 수: ${ads.length}`);

    if (ads.length > 0) {
      ads.forEach((ad, index) => {
        console.log(`\n🔍 광고 ${index + 1}:`);
        console.log(`  ID: ${ad._id}`);
        console.log(`  이름: ${ad.name}`);
        console.log(`  슬러그: ${ad.slug}`);
        console.log(`  상태: ${ad.status}`);
        console.log(`  노출 설정:`, ad.displayControl || "없음");
        console.log(`  캠페인 기간: ${ad.campaign.startDate} ~ ${ad.campaign.endDate}`);
        console.log(`  현재 시간: ${new Date().toISOString()}`);
        
        // 노출 가능 여부 확인
        const isDisplayable = ad.isDisplayable ? ad.isDisplayable() : "메서드 없음";
        console.log(`  노출 가능: ${isDisplayable}`);
      });
    } else {
      console.log("❌ 등록된 광고가 없습니다.");
    }

  } catch (error) {
    console.error("❌ 에러:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAds();