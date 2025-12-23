import mongoose from "mongoose";
import Letter from "../src/models/Letter";
import { extractPlainText, generatePreviewText, isHtmlContent, textToHtml } from "../src/utils/htmlProcessor";
import { connectDatabase } from "../src/config/database";

async function migrateExistingLetters() {
  try {
    console.log("🔄 기존 편지 데이터 마이그레이션 시작...");

    // 데이터베이스 연결
    await connectDatabase();

    // contentType이 없는 기존 편지들 찾기
    const letters = await Letter.find({
      $or: [{ contentType: { $exists: false } }, { contentType: null }, { plainContent: { $exists: false } }, { plainContent: null }],
    });

    console.log(`📊 마이그레이션할 편지 수: ${letters.length}`);

    let processedCount = 0;
    let htmlCount = 0;
    let textCount = 0;

    for (const letter of letters) {
      try {
        // 기존 content가 HTML인지 일반 텍스트인지 판단
        const isHtml = isHtmlContent(letter.content);

        if (isHtml) {
          // 이미 HTML 형식인 경우
          letter.contentType = "html";
          letter.plainContent = extractPlainText(letter.content);
          htmlCount++;
        } else {
          // 일반 텍스트인 경우
          letter.plainContent = letter.content;
          // 줄바꿈을 <br>로 변환하여 HTML 형식으로 저장
          letter.content = textToHtml(letter.content);
          letter.contentType = "html";
          textCount++;
        }

        // OG 미리보기 텍스트가 없으면 생성
        if (!letter.ogPreviewText) {
          letter.ogPreviewText = generatePreviewText(letter.content);
        }

        await letter.save();
        processedCount++;

        if (processedCount % 10 === 0) {
          console.log(`📝 처리 완료: ${processedCount}/${letters.length}`);
        }
      } catch (error) {
        console.error(`❌ 편지 ${letter._id} 처리 실패:`, error);
      }
    }

    console.log("✅ 마이그레이션 완료!");
    console.log(`📊 처리 결과:`);
    console.log(`  - 총 처리된 편지: ${processedCount}`);
    console.log(`  - HTML 형식이었던 편지: ${htmlCount}`);
    console.log(`  - 텍스트에서 HTML로 변환된 편지: ${textCount}`);
  } catch (error) {
    console.error("❌ 마이그레이션 실패:", error);
  } finally {
    // 데이터베이스 연결 종료
    await mongoose.connection.close();
    console.log("🔌 데이터베이스 연결 종료");
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateExistingLetters()
    .then(() => {
      console.log("🎉 마이그레이션 스크립트 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 마이그레이션 스크립트 실패:", error);
      process.exit(1);
    });
}

export default migrateExistingLetters;
