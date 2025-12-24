import axios from "axios";

const BASE_URL = "http://localhost:5001";

async function testCumulativePhysicalLetterEndpoint() {
  console.log("🧪 누적 실물 편지 엔드포인트 테스트 시작");

  // 테스트용 편지 ID (실제 존재하는 편지 ID)
  const testLetterId = "694b92d65c6d02132a1bfa04";

  // 테스트 데이터
  const testData = {
    address: {
      name: "최우댜",
      phone: "010-9321-4343",
      zipCode: "40158",
      address1: "경북 고령군 쌍림면 광주대구고속도로 151",
      address2: "123",
    },
  };

  try {
    console.log("📤 요청 데이터:", JSON.stringify(testData, null, 2));
    console.log("🎯 요청 URL:", `${BASE_URL}/api/letters/${testLetterId}/cumulative-physical-request`);

    const response = await axios.post(`${BASE_URL}/api/letters/${testLetterId}/cumulative-physical-request`, testData, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Test-Script/1.0",
      },
      timeout: 10000,
    });

    console.log("✅ 성공 응답:", response.status);
    console.log("📥 응답 데이터:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.log("❌ HTTP 에러:", error.response.status);
      console.log("📥 에러 응답:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log("❌ 네트워크 에러:", error.message);
      console.log("요청이 전송되었지만 응답을 받지 못했습니다.");
    } else {
      console.log("❌ 설정 에러:", error.message);
    }
  }
}

// 서버 상태 확인
async function checkServerStatus() {
  try {
    console.log("🔍 서버 상태 확인 중...");
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    console.log("✅ 서버 상태:", response.status, response.data);
    return true;
  } catch (error) {
    console.log("❌ 서버에 연결할 수 없습니다.");
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerStatus();
  if (serverRunning) {
    await testCumulativePhysicalLetterEndpoint();
  } else {
    console.log("서버를 먼저 시작해주세요: npm run dev");
  }
}

main().catch(console.error);
