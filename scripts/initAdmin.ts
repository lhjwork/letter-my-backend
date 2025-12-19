import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin, { AdminRole, AdminStatus } from "../src/models/Admin";

dotenv.config();

async function initAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("MongoDB 연결 성공");

    const email = "letter-admin";
    const password = "1234";
    const name = "관리자";

    const existing = await Admin.findByEmail(email);

    if (existing) {
      console.log(`이미 존재하는 관리자입니다: ${email}`);
      await mongoose.disconnect();
      return;
    }

    // 비밀번호 최소 길이 검증 우회를 위해 직접 생성
    const admin = new Admin({
      email,
      password,
      name,
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    });

    // 스키마 검증 우회
    await admin.save({ validateBeforeSave: false });

    console.log("✅ Super Admin 생성 완료");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: super_admin`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  } finally {
    await mongoose.disconnect();
  }
}

initAdmin();
