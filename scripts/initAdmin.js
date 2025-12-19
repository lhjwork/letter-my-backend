const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function initAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB 연결 성공");

    const AdminSchema = new mongoose.Schema(
      {
        username: String,
        password: String,
        name: String,
        role: String,
        permissions: [String],
        department: String,
        status: String,
        lastLoginAt: Date,
      },
      { timestamps: true }
    );

    const Admin = mongoose.model("Admin", AdminSchema);

    // 기존 데이터 삭제
    await Admin.deleteMany({});
    console.log("기존 관리자 데이터 삭제 완료");

    const username = "letter-admin";
    const password = "1234";
    const name = "관리자";

    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      username,
      password: hashedPassword,
      name,
      role: "super_admin",
      permissions: [],
      status: "active",
    });

    await admin.save();

    console.log("✅ Super Admin 생성 완료");
    console.log(`   Username: ${username}`);
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
