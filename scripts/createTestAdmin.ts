import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "../src/models/Admin";

async function createTestAdmin() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ MongoDB 연결 성공");

    // 기존 테스트 관리자 확인
    const existingAdmin = await Admin.findOne({ username: "testadmin" });
    if (existingAdmin) {
      console.log("✅ 테스트 관리자가 이미 존재합니다");
      console.log("Username: testadmin");
      console.log("Password: testpass123");
      return;
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash("testpass123", 12);

    // 테스트 관리자 생성
    const testAdmin = new Admin({
      username: "testadmin",
      password: hashedPassword,
      name: "테스트 관리자",
      email: "test@admin.com",
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