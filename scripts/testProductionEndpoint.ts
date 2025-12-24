import axios from "axios";

const PRODUCTION_URL = "https://letter-my-backend.onrender.com";

async function testProductionEndpoint() {
  console.log("🌐 프로덕션 서버 테스트 시작");
  console.log("🎯 서버 URL:", PRODUCTION_URL);

  // 1. 서버 상태 확인
  try {
    console.log("\n1️⃣ 서버 상태 확인...");
    const healthResponse = await axios.get(`${PRODUCTION_URL}/api/health`, {
      timeout: 10000,
    });
    console.log("✅ 서버 상태:", healthResponse.status);
    console.log("📥 응답:", healthResponse.data);
  } catch (error: any) {
    console.log("❌ 서버 상태 확인 실패:", error.message);
    return;
  }

  // 2. CORS 테스트 (OPTIONS 요청)
  try {
    console.log("\n2️⃣ CORS preflight 테스트...");
    const corsResponse = await axios.options(`${PRODUCTION_URL}/api/letters/test/cumulative-physical-request`, {
      headers: {
        Origin: "https://letter-community.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
      timeout: 10000,
    });
    console.log("✅ CORS preflight 성공:", corsResponse.status);
  } catch (error: any) {
    console.log("⚠️ CORS preflight 응답:", error.response?.status || error.message);
  }

  // 3. 실제 API 테스트 (테스트용 편지 ID 사용)
  const testLetterId = "69398f2bcac76158ff45042d"; // 로컬에서 확인한 편지 ID
  const testData = {
    address: {
      name: "테스트 사용자",
      phone: "010-1234-5678",
      zipCode: "12345",
      address1: "서울시 강남구 테스트로 123",
      address2: "테스트빌딩 456호",
    },
  };

  try {
    console.log("\n3️⃣ 누적 실물 편지 API 테스트...");
    console.log("📤 요청 URL:", `${PRODUCTION_URL}/api/letters/${testLetterId}/cumulative-physical-request`);
    console.log("📤 요청 데이터:", JSON.stringify(testData, null, 2));

    const response = await axios.post(`${PRODUCTION_URL}/api/letters/${testLetterId}/cumulative-physical-request`, testData, {
      headers: {
        "Content-Type": "application/json",
        Origin: "https://letter-community.vercel.app",
        "User-Agent": "Production-Test-Script/1.0",
      },
      timeout: 15000,
    });

    console.log("✅ API 호출 성공:", response.status);
    console.log("📥 응답 데이터:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.log("❌ API 에러:", error.response.status);
      console.log("📥 에러 응답:", JSON.stringify(error.response.data, null, 2));
      console.log("📋 응답 헤더:", error.response.headers);
    } else if (error.request) {
      console.log("❌ 네트워크 에러:", error.message);
      console.log("요청이 전송되었지만 응답을 받지 못했습니다.");
    } else {
      console.log("❌ 설정 에러:", error.message);
    }
  }

  // 4. 다른 편지 ID로도 테스트 (존재하지 않는 ID)
  try {
    console.log("\n4️⃣ 존재하지 않는 편지 ID 테스트...");
    const invalidId = "507f1f77bcf86cd799439011"; // 유효한 ObjectId 형식이지만 존재하지 않는 ID

    const response = await axios.post(`${PRODUCTION_URL}/api/letters/${invalidId}/cumulative-physical-request`, testData, {
      headers: {
        "Content-Type": "application/json",
        Origin: "https://letter-community.vercel.app",
      },
      timeout: 10000,
    });

    console.log("⚠️ 예상치 못한 성공:", response.status);
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.log("✅ 올바른 404 에러 응답:", error.response.data);
    } else {
      console.log("❌ 예상치 못한 에러:", error.response?.status || error.message);
    }
  }
}

testProductionEndpoint().catch(console.error);
