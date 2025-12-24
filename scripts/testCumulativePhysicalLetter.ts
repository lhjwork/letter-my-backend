import mongoose from "mongoose";
import Letter, { LetterCategory, LetterStatus, PhysicalLetterStatus, OgImageType } from "../src/models/Letter";
import CumulativePhysicalLetterRequest, { CumulativeRequestStatus } from "../src/models/CumulativePhysicalLetterRequest";
import cumulativePhysicalLetterService from "../src/services/cumulativePhysicalLetterService";
import dotenv from "dotenv";

// 환경 변수 로드
dotenv.config();

/**
 * 누적 실물 편지 시스템 테스트
 */
async function testCumulativePhysicalLetter() {
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
      title: "누적 실물 편지 테스트",
      content: "<p>이것은 누적 실물 편지 테스트를 위한 편지입니다.</p>",
      contentType: "html",
      plainContent: "이것은 누적 실물 편지 테스트를 위한 편지입니다.",
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

    // 테스트 신청 데이터
    const testRequests = [
      {
        sessionId: "session-001",
        userAgent: "Mozilla/5.0 (Test Browser 1)",
        ipAddress: "192.168.1.1",
        address: {
          name: "김철수",
          phone: "010-1234-5678",
          zipCode: "12345",
          address1: "서울시 강남구 테헤란로 123",
          address2: "456호",
          memo: "문 앞에 놓아주세요",
        },
      },
      {
        sessionId: "session-002",
        userAgent: "Mozilla/5.0 (Test Browser 2)",
        ipAddress: "192.168.1.2",
        address: {
          name: "이영희",
          phone: "010-9876-5432",
          zipCode: "54321",
          address1: "부산시 해운대구 해운대로 789",
          address2: "",
          memo: "",
        },
      },
      {
        sessionId: "session-003",
        userAgent: "Mozilla/5.0 (Test Browser 3)",
        ipAddress: "192.168.1.3",
        address: {
          name: "박민수",
          phone: "010-5555-1234",
          zipCode: "67890",
          address1: "대구시 중구 동성로 456",
          address2: "101동 202호",
          memo: "경비실에 맡겨주세요",
        },
      },
    ];

    const requestResults: any[] = [];

    // 1. 누적 실물 편지 신청 테스트
    console.log("\n🚀 누적 실물 편지 신청 테스트...");
    for (let i = 0; i < testRequests.length; i++) {
      const testRequest = testRequests[i];

      try {
        const result = await cumulativePhysicalLetterService.requestPhysicalLetter(testLetter._id.toString(), testRequest.sessionId, testRequest.userAgent, testRequest.ipAddress, {
          address: testRequest.address,
        });

        requestResults.push(result);
        console.log(`✅ 신청 ${i + 1} 완료:`, {
          requestId: result.requestId,
          cost: result.cost,
          status: result.status,
        });
      } catch (error) {
        console.error(`❌ 신청 ${i + 1} 실패:`, error);
      }
    }

    // 2. 편지 상태 확인
    console.log("\n📊 편지 상태 확인...");
    const updatedLetter = await Letter.findById(testLetter._id);
    console.log("✅ 편지 상태:", {
      physicalRequestCount: updatedLetter?.physicalRequestCount,
      title: updatedLetter?.title,
    });

    // 3. 편지별 신청 현황 조회 테스트
    console.log("\n📋 편지별 신청 현황 조회 테스트...");
    const letterRequests = await cumulativePhysicalLetterService.getLetterRequests(testLetter._id.toString(), 1, 10);

    console.log("✅ 신청 현황:", {
      totalRequests: letterRequests.summary.totalRequests,
      totalCost: letterRequests.summary.totalCost,
      statusCounts: letterRequests.summary.statusCounts,
      requestsCount: letterRequests.requests.length,
    });

    // 4. 개별 신청 상태 조회 테스트
    if (requestResults.length > 0) {
      console.log("\n🔍 개별 신청 상태 조회 테스트...");
      const firstRequestId = requestResults[0].requestId;
      const firstSessionId = testRequests[0].sessionId;

      try {
        const requestStatus = await cumulativePhysicalLetterService.getRequestStatus(firstRequestId, firstSessionId);

        console.log("✅ 개별 신청 상태:", {
          requestId: requestStatus._id,
          recipientName: requestStatus.recipientInfo.name,
          status: requestStatus.status,
          cost: requestStatus.cost.totalCost,
        });
      } catch (error) {
        console.error("❌ 개별 신청 상태 조회 실패:", error);
      }
    }

    // 5. 관리자용 목록 조회 테스트
    console.log("\n👨‍💼 관리자용 목록 조회 테스트...");
    const adminRequests = await cumulativePhysicalLetterService.getAdminRequests({
      page: 1,
      limit: 10,
    });

    console.log("✅ 관리자 목록:", {
      totalRequests: adminRequests.pagination.totalRequests,
      currentPageRequests: adminRequests.requests.length,
    });

    // 6. 상태 업데이트 테스트
    if (requestResults.length > 0) {
      console.log("\n🔄 상태 업데이트 테스트...");
      const firstRequestId = requestResults[0].requestId;
      const adminId = "test-admin-id";

      try {
        const updateResult = await cumulativePhysicalLetterService.updateRequestStatus(
          firstRequestId,
          {
            status: CumulativeRequestStatus.CONFIRMED,
            adminNote: "테스트 확인 완료",
            trackingNumber: "TEST123456789",
            shippingCompany: "테스트택배",
          },
          adminId
        );

        console.log("✅ 상태 업데이트 완료:", {
          requestId: updateResult._id,
          status: updateResult.status,
          trackingNumber: updateResult.shipping.trackingNumber,
        });
      } catch (error) {
        console.error("❌ 상태 업데이트 실패:", error);
      }
    }

    // 7. 인기 편지 분석 테스트
    console.log("\n📈 인기 편지 분석 테스트...");
    const popularLetters = await cumulativePhysicalLetterService.getPopularLetters(5);
    console.log("✅ 인기 편지:", {
      count: popularLetters.length,
      topLetter: popularLetters[0] || "없음",
    });

    // 8. 최종 데이터베이스 통계
    console.log("\n📊 최종 데이터베이스 통계...");
    const dbStats = await CumulativePhysicalLetterRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalCost: { $sum: "$cost.totalCost" },
        },
      },
    ]);

    console.log("✅ 전체 요청 통계:");
    dbStats.forEach((stat) => {
      console.log(`  - ${stat._id}: ${stat.count}개, 총 비용: ${stat.totalCost}원`);
    });

    console.log("\n🎉 모든 테스트가 성공적으로 완료되었습니다!");

    // 테스트 데이터 정리 (선택사항)
    const shouldCleanup = process.argv.includes("--cleanup");
    if (shouldCleanup) {
      console.log("\n🧹 테스트 데이터 정리 중...");
      await CumulativePhysicalLetterRequest.deleteMany({ letterId: testLetter._id });
      await Letter.findByIdAndDelete(testLetter._id);
      console.log("✅ 테스트 데이터 정리 완료");
    } else {
      console.log("\n💡 테스트 데이터를 정리하려면 --cleanup 옵션을 사용하세요");
      console.log(`   예: npm run test:cumulative-physical-letter -- --cleanup`);
    }
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
  testCumulativePhysicalLetter()
    .then(() => {
      console.log("🎯 테스트 스크립트 실행 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 테스트 스크립트 실행 실패:", error);
      process.exit(1);
    });
}

export default testCumulativePhysicalLetter;
