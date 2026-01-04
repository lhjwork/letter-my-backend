import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Advertisement 스키마 직접 정의 (모델 import 문제 방지)
const advertisementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    status: { type: String, default: "active" },
    advertiser: {
      name: { type: String, required: true },
      logo: String,
      contactEmail: String,
      contactPhone: String,
    },
    content: {
      headline: { type: String, required: true },
      description: { type: String, required: true },
      ctaText: { type: String, default: "자세히 보기" },
      targetUrl: { type: String, required: true },
      backgroundImage: String,
      backgroundColor: { type: String, default: "#ffffff" },
      theme: { type: String, default: "general" },
    },
    campaign: {
      name: String,
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    linkedLetters: [],
    stats: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
      avgDwellTime: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

async function createTestAd() {
  try {
    console.log("🔗 MongoDB 연결 중...");
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ MongoDB 연결 성공");

    const Advertisement = mongoose.model("Advertisement", advertisementSchema);

    // 기존 테스트 광고 삭제
    await Advertisement.deleteMany({ slug: "test-bookstore-promo" });
    console.log("🗑️ 기존 테스트 광고 삭제");

    // 새 테스트 광고 생성
    const testAd = new Advertisement({
      name: "테스트 서점 프로모션",
      slug: "test-bookstore-promo",
      status: "active",
      advertiser: {
        name: "테스트 서점",
        logo: "https://via.placeholder.com/120x60",
        contactEmail: "test@bookstore.com",
      },
      content: {
        headline: "신간 도서 10% 할인!",
        description: "Letter Community 회원을 위한 특별 할인 혜택입니다.",
        ctaText: "할인 받으러 가기",
        targetUrl: "https://example.com/bookstore-promo",
        backgroundColor: "#f0f9ff",
        theme: "general",
      },
      campaign: {
        name: "2024 신간 프로모션",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2026-12-31"),
      },
    });

    await testAd.save();

    console.log("\n✅ 테스트 광고 생성 완료!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📌 adId: ${testAd._id}`);
    console.log(`📌 adSlug: ${testAd.slug}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n프론트엔드에서 이 값을 사용하세요:");
    console.log(`adId: "${testAd._id}"`);
    console.log(`adSlug: "${testAd.slug}"`);

  } catch (error) {
    console.error("❌ 에러:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB 연결 종료");
  }
}

createTestAd();
