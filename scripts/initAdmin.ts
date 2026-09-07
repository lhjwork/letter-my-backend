import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin, { AdminRole, AdminStatus } from "../src/models/Admin";

dotenv.config();

async function initAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("MongoDB 연결 성공");

    // 사용법: ADMIN_USERNAME=... ADMIN_PASSWORD=... pnpm run init-admin (기본값 없음)
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || "관리자";
    if (!username || !password || password.length < 8) {
      throw new Error("ADMIN_USERNAME, ADMIN_PASSWORD(8자 이상) 환경변수가 필요합니다");
    }

    const existing = await Admin.findByUsername(username);

    if (existing) {
      console.log(`이미 존재하는 관리자입니다: ${username}`);
      await mongoose.disconnect();
      return;
    }

    const admin = new Admin({
      username,
      password,
      name,
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    });

    await admin.save();

    console.log("✅ Super Admin 생성 완료");
    console.log(`   Username: ${username}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: super_admin`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  } finally {
    await mongoose.disconnect();
  }
}

initAdmin();
