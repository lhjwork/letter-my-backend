/**
 * 기존 Letter 데이터에 type, category 필드 추가 마이그레이션 스크립트
 * 
 * 실행: npx ts-node scripts/migrateCategories.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "";

async function migrate() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const collection = db.collection("letters");

    // type 필드가 없는 문서에 기본값 추가
    const typeResult = await collection.updateMany(
      { type: { $exists: false } },
      { $set: { type: "letter" } }
    );
    console.log(`📝 Updated ${typeResult.modifiedCount} documents with type field`);

    // category 필드가 없는 문서에 기본값 추가
    const categoryResult = await collection.updateMany(
      { category: { $exists: false } },
      { $set: { category: "기타" } }
    );
    console.log(`📝 Updated ${categoryResult.modifiedCount} documents with category field`);

    // status 필드가 없는 문서에 기본값 추가
    const statusResult = await collection.updateMany(
      { status: { $exists: false } },
      { $set: { status: "created" } }
    );
    console.log(`📝 Updated ${statusResult.modifiedCount} documents with status field`);

    // viewCount 필드가 없는 문서에 기본값 추가
    const viewCountResult = await collection.updateMany(
      { viewCount: { $exists: false } },
      { $set: { viewCount: 0 } }
    );
    console.log(`📝 Updated ${viewCountResult.modifiedCount} documents with viewCount field`);

    // likeCount 필드가 없는 문서에 기본값 추가
    const likeCountResult = await collection.updateMany(
      { likeCount: { $exists: false } },
      { $set: { likeCount: 0 } }
    );
    console.log(`📝 Updated ${likeCountResult.modifiedCount} documents with likeCount field`);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

migrate();
