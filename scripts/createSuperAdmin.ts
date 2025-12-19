import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin, { AdminRole, AdminStatus } from "../src/models/Admin";

dotenv.config();

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("MongoDB 연결 성공");

    const email = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || "Super Admin";

    if (!email || !password) {
      console.error("Usage: pnpm ts-node scripts/createSuperAdmin.ts <email> <password> [name]");
      process.exit(1);
    }

    if (password.length < 8) {
      console.error("비밀번호는 8자 이상이어야 합니다");
      process.exit(1);
    }

    const existing = await Admin.findByEmail(email);

    if (existing) {
      console.error(`이미 존재하는 이메일입니다: ${email}`);
      process.exit(1);
    }

    const admin = new Admin({
      email,
      password,
      name,
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    });

    await admin.save();

    console.log("✅ Super Admin 생성 완료");
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: super_admin`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createSuperAdmin();
