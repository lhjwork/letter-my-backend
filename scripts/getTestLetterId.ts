import mongoose from "mongoose";
import Letter from "../src/models/Letter";

async function getTestLetterId() {
  try {
    // MongoDB 연결
    await mongoose.connect("mongodb://localhost:27017/letter-db");
    console.log("✅ MongoDB 연결 성공");

    // 첫 번째 편지 찾기
    const letter = await Letter.findOne().select("_id title authorName createdAt");

    if (letter) {
      console.log("📝 테스트용 편지 발견:");
      console.log(`ID: ${letter._id}`);
      console.log(`제목: ${letter.title}`);
      console.log(`작성자: ${letter.authorName}`);
      console.log(`생성일: ${letter.createdAt}`);
      return letter._id.toString();
    } else {
      console.log("❌ 편지가 없습니다. 먼저 편지를 생성해주세요.");
      return null;
    }
  } catch (error) {
    console.error("❌ 에러:", error);
    return null;
  } finally {
    await mongoose.disconnect();
  }
}

getTestLetterId().then((id) => {
  if (id) {
    console.log(`\n🎯 테스트에 사용할 편지 ID: ${id}`);
  }
  process.exit(0);
});
