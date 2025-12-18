import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Atlas MongoDB URI (클라우드) - 환경변수 또는 직접 입력
const CLOUD_URI = process.env.CLOUD_MONGODB_URI || "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority";
// 로컬 MongoDB URI
const LOCAL_URI = "mongodb://localhost:27017/letter-db";

async function migrateData() {
  try {
    console.log("🔄 Atlas → Local 데이터 마이그레이션 시작...");

    // Atlas 연결
    const cloudConnection = mongoose.createConnection(CLOUD_URI);
    await cloudConnection.asPromise();
    console.log("✅ Atlas MongoDB 연결 완료");

    // 로컬 연결
    const localConnection = mongoose.createConnection(LOCAL_URI);
    await localConnection.asPromise();
    console.log("✅ Local MongoDB 연결 완료");

    const cloudDb = cloudConnection.db;
    const localDb = localConnection.db;

    if (!cloudDb || !localDb) {
      throw new Error("Database connection failed");
    }

    // 컬렉션 목록 가져오기
    const collections = await cloudDb.listCollections().toArray();
    console.log(`📋 ${collections.length}개 컬렉션 발견`);

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`🔄 마이그레이션 중: ${collectionName}`);

      // Atlas에서 데이터 가져오기
      const cloudCollection = cloudDb.collection(collectionName);
      const documents = await cloudCollection.find({}).toArray();

      if (documents.length > 0) {
        // 로컬에 데이터 삽입
        const localCollection = localDb.collection(collectionName);
        await localCollection.deleteMany({}); // 기존 데이터 삭제
        await localCollection.insertMany(documents);
        console.log(`✅ ${collectionName}: ${documents.length}개 문서 마이그레이션 완료`);
      } else {
        console.log(`⚠️ ${collectionName}: 데이터 없음`);
      }
    }

    console.log("🎉 마이그레이션 완료!");

    await cloudConnection.close();
    await localConnection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  }
}

migrateData();
