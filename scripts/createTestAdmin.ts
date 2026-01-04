import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "../src/models/Admin";

// Load environment variables
dotenv.config();

async function createTestAdmin() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ MongoDB 연결 성공");

    // 기존 테스트 관리자 삭제
    await Admin.deleteOne({ username: "testadmin" });
    console.log("🗑️ 기존 테스트 관리자 삭제");

    // 테스트 관리자 생성 (비밀번호는 pre-save hook에서 자동 해시화됨)
    const testAdmin = new Admin({
      username: "testadmin",
      password: "testpass123", // 평문으로 저장하면 pre-save hook에서 해시화됨
      name: "테스트 관리자",
      role: "super_admin",
      permissions: ["all"],
      status: "active",
    });

    await testAdmin.save();
    console.log("✅ 테스트 관리자 생성 완료");
    console.log("Username: testadmin");
    console.log("Password: testpass123");

  } catch (error) {
    console.error("❌ 에러:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestAdmin();