/**
 * 데이터베이스 인덱스 생성 스크립트
 *
 * 성능 최적화를 위한 필수 인덱스들을 생성합니다.
 *
 * 실행 방법:
 * npx ts-node scripts/createIndexes.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User";
import Letter from "../src/models/Letter";

dotenv.config();

async function createIndexes() {
  try {
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI가 환경 변수에 설정되지 않았습니다.");
    }

    console.log("MongoDB 연결 중...");
    await mongoose.connect(mongoUri);
    console.log("✓ MongoDB 연결 성공\n");

    // User 컬렉션 인덱스
    console.log("User 컬렉션 인덱스 생성 중...");
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log("✓ users.email 인덱스 생성 완료");

    await User.collection.createIndex({ name: 1 });
    console.log("✓ users.name 인덱스 생성 완료");

    await User.collection.createIndex({ status: 1 });
    console.log("✓ users.status 인덱스 생성 완료");

    await User.collection.createIndex({
      "oauthAccounts.provider": 1,
      "oauthAccounts.providerId": 1,
    });
    console.log("✓ users.oauthAccounts 복합 인덱스 생성 완료");

    // Letter 컬렉션 인덱스
    console.log("\nLetter 컬렉션 인덱스 생성 중...");
    await Letter.collection.createIndex({ userId: 1 });
    console.log("✓ letters.userId 인덱스 생성 완료");

    await Letter.collection.createIndex({ status: 1 });
    console.log("✓ letters.status 인덱스 생성 완료");

    await Letter.collection.createIndex({ createdAt: -1 });
    console.log("✓ letters.createdAt 인덱스 생성 완료");

    await Letter.collection.createIndex({ type: 1 });
    console.log("✓ letters.type 인덱스 생성 완료");

    await Letter.collection.createIndex({ category: 1 });
    console.log("✓ letters.category 인덱스 생성 완료");

    // 복합 인덱스 (사용자별 편지 조회 최적화)
    await Letter.collection.createIndex({ userId: 1, status: 1, createdAt: -1 });
    console.log("✓ letters.userId + status + createdAt 복합 인덱스 생성 완료");

    // 인덱스 목록 확인
    console.log("\n생성된 인덱스 목록:");
    const userIndexes = await User.collection.listIndexes().toArray();
    console.log("\n[User 컬렉션]");
    userIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    const letterIndexes = await Letter.collection.listIndexes().toArray();
    console.log("\n[Letter 컬렉션]");
    letterIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log("\n✓ 모든 인덱스 생성 완료!");
  } catch (error) {
    console.error("✗ 인덱스 생성 실패:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB 연결 종료");
  }
}

// 스크립트 실행
createIndexes();
