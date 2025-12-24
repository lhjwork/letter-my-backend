import mongoose from "mongoose";
import Letter, { LetterCategory, LetterStatus, PhysicalLetterStatus, OgImageType } from "../src/models/Letter";
import cumulativePhysicalLetterService from "../src/services/cumulativePhysicalLetterService";
import dotenv from "dotenv";

// 환경 변수 로드
dotenv.config();

/**
 * 특정 주소 데이터 테스트
 */
async function testSpecificAddress() {
  try {
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/letter-db";
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB 연결 성공");

    // 테스트용 편지 생성
    console.log("\n📝 테스트용 편지 생성 중...");
    const testLetter = new Letter({
      type: "friend",
      userId: new mongoose.Types.ObjectId(),
      title: "특정 주소 테스트 편지",
      content: "<p>특정 주소 테스트를 위한 편지입니다.</p>",
      contentType: "html",
      plainContent: "특정 주소 테스트를 위한 편지입니다.",
      authorName: "테스트 작성자",
      category: LetterCategory.OTHER,
      status: LetterStatus.PUBLISHED,
      viewCount: 0,
      likeCount: 0,
      isPublic: true,
      shareableUrl: true,
      ogBgColor: "#FFF5F5",
      ogIllustration: "💌",
      ogFontSize: 48,
      ogImageType: OgImageType.AUTO,
      ogPreviewText: "테스트 편지입니다",
      physicalRequested: false,
      physicalStatus: PhysicalLetterStatus.NONE,
      physicalRequestCount: 0,
      multipleRecipientsEnabled: false,
      totalRecipients: 0,
      completedRecipients: 0,
      aiMetadata: {
        titleGenerated: false,
      },
    });

    await testLetter.save();
    console.log(`✅ 테스트 편지 생성 완료: ${testLetter._id}`);

    // 제공된 주소 데이터
    const testAddress = {
      name: "이한진",
      phone: "01096571355",
      zipCode: "50573",
      address1: "경남 양산시 신기강변로 78-1",
      address2: "301호",
    };

    console.log("\n🧪 제공된 주소 데이터 테스트...");
    console.log("주소 데이터:", testAddress);

    // 1. 주소 유효성 검사 테스트
    try {
      const result = await cumulativePhysicalLetterService.requestPhysicalLetter(testLetter._id.toString(), "test-session-specific", "Mozilla/5.0 (Test Browser)", "192.168.1.100", {
        address: testAddress,
      });

      console.log("✅ 신청 성공:", {
        requestId: result.requestId,
        cost: result.cost,
        status: result.status,
      });

      // 2. 비용 계산 확인
      console.log("\n💰 비용 계산 확인:");
      console.log(`우편번호 ${testAddress.zipCode}는 경남 지역으로 기타 지역 요금 적용`);
      console.log("배송비: 3,500원 + 편지 작성비: 2,000원 = 총 5,500원");
      console.log(`실제 계산된 비용: ${result.cost}원`);

      // 3. 신청 상태 조회
      const requestStatus = await cumulativePhysicalLetterService.getRequestStatus(result.requestId, "test-session-specific");

      console.log("\n📋 신청 상태 조회:");
      console.log("수신자 정보:", requestStatus.recipientInfo);
      console.log("비용 정보:", requestStatus.cost);
    } catch (error: any) {
      console.error("❌ 신청 실패:", error.message);

      // 상세 오류 분석
      if (error.message.includes("휴대폰")) {
        console.log("\n🔍 휴대폰 번호 분석:");
        console.log(`원본: ${testAddress.phone}`);
        console.log(`하이픈 제거: ${testAddress.phone.replace(/-/g, "")}`);
        console.log("정규식 테스트:", /^01[0-9][0-9]{3,4}[0-9]{4}$/.test(testAddress.phone.replace(/-/g, "")));
      }
    }

    // 테스트 데이터 정리
    console.log("\n🧹 테스트 데이터 정리 중...");
    await Letter.findByIdAndDelete(testLetter._id);
    console.log("✅ 테스트 데이터 정리 완료");
  } catch (error) {
    console.error("❌ 테스트 실패:", error);
    process.exit(1);
  } finally {
    // MongoDB 연결 종료
    await mongoose.disconnect();
    console.log("🔌 MongoDB 연결 종료");
  }
}

// 스크립트 실행
if (require.main === module) {
  testSpecificAddress()
    .then(() => {
      console.log("🎯 특정 주소 테스트 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 테스트 실패:", error);
      process.exit(1);
    });
}

export default testSpecificAddress;
