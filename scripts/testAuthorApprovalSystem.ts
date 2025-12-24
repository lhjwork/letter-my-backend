import axios from "axios";

const BASE_URL = "http://localhost:5001";

async function testAuthorApprovalSystem() {
  console.log("🧪 작성자 승인 시스템 테스트 시작");

  // 테스트용 편지 ID (실제 존재하는 편지 ID)
  const testLetterId = "694b92d65c6d02132a1bfa04";

  // 테스트 데이터
  const testRequestData = {
    address: {
      name: "테스트 사용자",
      phone: "010-1234-5678",
      zipCode: "12345",
      address1: "서울시 강남구 테스트로 123",
      address2: "테스트빌딩 456호",
      memo: "테스트 메모입니다.",
    },
  };

  try {
    // 1. 서버 상태 확인
    console.log("\n1️⃣ 서버 상태 확인...");
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log("✅ 서버 상태:", healthResponse.status);

    // 2. 요청 제한 체크
    console.log("\n2️⃣ 요청 제한 체크...");
    const limitResponse = await axios.get(`${BASE_URL}/api/letters/${testLetterId}/request-limit-check`);
    console.log("✅ 요청 제한 정보:", limitResponse.data);

    // 3. 실물 편지 신청 (작성자 승인 시스템)
    console.log("\n3️⃣ 실물 편지 신청...");
    const requestResponse = await axios.post(`${BASE_URL}/api/letters/${testLetterId}/physical-requests`, testRequestData, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Test-Script/1.0",
      },
      withCredentials: true, // 세션 쿠키 포함
    });
    console.log("✅ 신청 성공:", requestResponse.data);
    const requestId = requestResponse.data.data.requestId;

    // 비용이 0원(완전 무료)인지 확인
    if (requestResponse.data.data.cost === 0) {
      console.log("✅ 비용 확인: 완전 무료 버전 (0원)");
    } else {
      console.log("⚠️ 예상과 다른 비용:", requestResponse.data.data.cost);
    }

    // 4. 공개 신청 현황 조회
    console.log("\n4️⃣ 공개 신청 현황 조회...");
    const publicResponse = await axios.get(`${BASE_URL}/api/letters/${testLetterId}/physical-requests/public`);
    console.log("✅ 공개 현황:", publicResponse.data);

    // 5. 개별 신청 상태 조회
    console.log("\n5️⃣ 개별 신청 상태 조회...");
    const statusResponse = await axios.get(`${BASE_URL}/api/letters/physical-requests/${requestId}/status`, {
      withCredentials: true, // 세션 쿠키 포함
    });
    console.log("✅ 신청 상태:", statusResponse.data);

    // 6. 추가 신청 테스트 (제한 확인)
    console.log("\n6️⃣ 추가 신청 테스트...");
    const additionalRequestData = {
      address: {
        name: "추가 테스트",
        phone: "010-9876-5432",
        zipCode: "54321",
        address1: "부산시 해운대구 테스트로 456",
        address2: "테스트아파트 789호",
      },
    };

    const additionalResponse = await axios.post(`${BASE_URL}/api/letters/${testLetterId}/physical-requests`, additionalRequestData, {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });
    console.log("✅ 추가 신청 성공:", additionalResponse.data);

    console.log("\n🎉 모든 테스트 완료!");
  } catch (error: any) {
    if (error.response) {
      console.log("❌ API 에러:", error.response.status);
      console.log("📥 에러 응답:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log("❌ 네트워크 에러:", error.message);
    } else {
      console.log("❌ 설정 에러:", error.message);
    }
  }
}

// 작성자 기능 테스트 (JWT 토큰 필요)
async function testAuthorFeatures() {
  console.log("\n🔐 작성자 기능 테스트 (JWT 토큰 필요)");

  // 실제 테스트 시에는 유효한 JWT 토큰이 필요합니다
  const testToken = "your_jwt_token_here";
  const testLetterId = "694b92d65c6d02132a1bfa04";

  if (testToken === "your_jwt_token_here") {
    console.log("⚠️ JWT 토큰이 설정되지 않았습니다. 작성자 기능 테스트를 건너뜁니다.");
    return;
  }

  try {
    // 1. 작성자 신청 목록 조회
    console.log("\n1️⃣ 작성자 신청 목록 조회...");
    const authorRequestsResponse = await axios.get(`${BASE_URL}/api/letters/${testLetterId}/physical-requests/author`, {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });
    console.log("✅ 작성자 신청 목록:", authorRequestsResponse.data);

    // 2. 편지 설정 업데이트
    console.log("\n2️⃣ 편지 설정 업데이트...");
    const settingsResponse = await axios.patch(
      `${BASE_URL}/api/letters/${testLetterId}/settings`,
      {
        authorSettings: {
          allowPhysicalRequests: true,
          autoApprove: false,
          maxRequestsPerPerson: 3,
          requireApprovalMessage: "실물 편지 신청을 검토 중입니다.",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${testToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ 설정 업데이트:", settingsResponse.data);
  } catch (error: any) {
    console.log("❌ 작성자 기능 테스트 실패:", error.response?.data || error.message);
  }
}

async function main() {
  await testAuthorApprovalSystem();
  await testAuthorFeatures();
}

main().catch(console.error);
