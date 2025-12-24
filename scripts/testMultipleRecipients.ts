import mongoose from "mongoose";
import Letter from "../src/models/Letter";
import PhysicalLetterRequest, { PhysicalRequestStatus } from "../src/models/PhysicalLetterRequest";
import multiplePhysicalLetterService from "../src/services/multiplePhysicalLetterService";
import dotenv from "dotenv";

// 환경 변수 로드
dotenv.config();

/**
 * 다중 수신자 실물 편지 시스템 테스트
 */
async function testMultipleRecipients() {
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
      title: "다중 수신자 테스트 편지",
      content: "<p>이것은 다중 수신자 테스트를 위한 편지입니다.</p>",
      contentType: "html",
      plainContent: "이것은 다중 수신자 테스트를 위한 편지입니다.",
      authorName: "테스트 작성자",
      ogPreviewMessage: "테스트 편지입니다",
      ogImageType: "auto",
    });

    await testLetter.save();
    console.log(`✅ 테스트 편지 생성 완료: ${testLetter._id}`);

    // 테스트 수신자 데이터
    const testRecipients = [
      {
        name: "김철수",
        phone: "010-1234-5678",
        zipCode: "12345",
        address1: "서울시 강남구 테헤란로 123",
        address2: "456호",
        memo: "문 앞에 놓아주세요",
      },
      {
        name: "이영희",
        phone: "010-9876-5432",
        zipCode: "54321",
        address1: "부산시 해운대구 해운대로 789",
        address2: "",
        memo: "",
      },
      {
        name: "박민수",
        phone: "010-5555-1234",
        zipCode: "67890",
        address1: "대구시 중구 동성로 456",
        address2: "101동 202호",
        memo: "경비실에 맡겨주세요",
      },
    ];

    const requesterId = new mongoose.Types.ObjectId();

    // 1. 다중 수신자 실물 편지 신청 테스트
    console.log("\n🚀 다중 수신자 실물 편지 신청 테스트...");
    const requestResult = await multiplePhysicalLetterService.requestMultiplePhysicalLetters(testLetter._id.toString(), requesterId.toString(), { recipients: testRecipients });

    console.log("✅ 신청 결과:", {
      letterId: requestResult.letterId,
      totalRecipients: requestResult.totalRecipients,
      totalCost: requestResult.totalCost,
      requestCount: requestResult.requests.length,
    });

    // 2. 편지 상태 확인
    console.log("\n📊 편지 상태 확인...");
    const updatedLetter = await Letter.findById(testLetter._id);
    console.log("✅ 편지 상태:", {
      physicalRequested: updatedLetter?.physicalRequested,
      multipleRecipientsEnabled: updatedLetter?.multipleRecipientsEnabled,
      totalRecipients: updatedLetter?.totalRecipients,
      completedRecipients: updatedLetter?.completedRecipients,
    });

    // 3. 요청 목록 조회 테스트
    console.log("\n📋 요청 목록 조회 테스트...");
    const requestsList = await multiplePhysicalLetterService.getPhysicalLetterRequests(testLetter._id.toString(), requesterId.toString());

    console.log("✅ 요청 목록:", {
      totalRequests: requestsList.summary.totalRequests,
      totalCost: requestsList.summary.totalCost,
      statusCounts: requestsList.summary.statusCounts,
    });

    // 4. 관리자용 목록 조회 테스트
    console.log("\n👨‍💼 관리자용 목록 조회 테스트...");
    const adminList = await multiplePhysicalLetterService.getAdminPhysicalLetterRequests({
      page: 1,
      limit: 10,
    });

    console.log("✅ 관리자 목록:", {
      totalRequests: adminList.pagination.total,
      currentPageRequests: adminList.requests.length,
    });

    // 5. 상태 업데이트 테스트
    if (requestResult.requests.length > 0) {
      console.log("\n🔄 상태 업데이트 테스트...");
      const firstRequestId = requestResult.requests[0].id;
      const adminId = new mongoose.Types.ObjectId();

      const updateResult = await multiplePhysicalLetterService.updatePhysicalLetterRequestStatus(
        firstRequestId,
        {
          status: PhysicalRequestStatus.CONFIRMED,
          adminNotes: "테스트 확인 완료",
          trackingNumber: "TEST123456789",
          shippingCompany: "테스트택배",
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
        },
        adminId.toString()
      );

      console.log("✅ 상태 업데이트 완료:", {
        requestId: updateResult._id,
        status: updateResult.status,
        trackingNumber: updateResult.trackingNumber,
      });
    }

    // 6. 개별 요청 취소 테스트
    if (requestResult.requests.length > 1) {
      console.log("\n❌ 개별 요청 취소 테스트...");
      const secondRequestId = requestResult.requests[1].id;

      const cancelResult = await multiplePhysicalLetterService.cancelPhysicalLetterRequest(secondRequestId, requesterId.toString());

      console.log("✅ 취소 완료:", {
        requestId: cancelResult.requestId,
        recipientName: cancelResult.recipientName,
        status: cancelResult.status,
      });
    }

    // 7. 최종 상태 확인
    console.log("\n📊 최종 상태 확인...");
    const finalRequestsList = await multiplePhysicalLetterService.getPhysicalLetterRequests(testLetter._id.toString(), requesterId.toString());

    console.log("✅ 최종 요청 상태:", {
      totalRequests: finalRequestsList.summary.totalRequests,
      statusCounts: finalRequestsList.summary.statusCounts,
      totalCost: finalRequestsList.summary.totalCost,
    });

    // 8. 데이터베이스 통계
    console.log("\n📈 데이터베이스 통계...");
    const dbStats = await PhysicalLetterRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalCost: { $sum: "$totalCost" },
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
      await PhysicalLetterRequest.deleteMany({ letterId: testLetter._id });
      await Letter.findByIdAndDelete(testLetter._id);
      console.log("✅ 테스트 데이터 정리 완료");
    } else {
      console.log("\n💡 테스트 데이터를 정리하려면 --cleanup 옵션을 사용하세요");
      console.log(`   예: npm run test:multiple-recipients -- --cleanup`);
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
  testMultipleRecipients()
    .then(() => {
      console.log("🎯 테스트 스크립트 실행 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 테스트 스크립트 실행 실패:", error);
      process.exit(1);
    });
}

export default testMultipleRecipients;
