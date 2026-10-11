/**
 * 관리자 비밀번호 재설정. 비밀번호는 화면에 안 보이게 입력받는다(명령줄·셸 기록에 남지 않음).
 * 실행: npx ts-node-dev --transpile-only scripts/resetAdminPassword.ts <아이디>
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import readline from "node:readline";
import Admin, { AdminStatus } from "../src/models/Admin";

dotenv.config();

function askHidden(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  out._writeToOutput = (s) => out.output.write(s.startsWith(q) ? s : s.includes("\n") ? "\n" : "");
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
}

async function main() {
  const username = (process.argv[2] || "").trim().toLowerCase();
  if (!username) throw new Error("사용법: scripts/resetAdminPassword.ts <아이디>");

  const pw = await askHidden("새 비밀번호(8자 이상): ");
  if (pw.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다");
  if (pw !== (await askHidden("한 번 더: "))) throw new Error("두 비밀번호가 다릅니다");

  await mongoose.connect(process.env.MONGODB_URI!);
  const admin = await Admin.findByUsername(username);
  if (!admin) throw new Error(`없는 아이디입니다: ${username}`);

  admin.password = pw; // pre("save") 가 bcrypt 로 바꾼다
  admin.failedLoginAttempts = 0;
  admin.lockedUntil = undefined;
  await admin.save();
  console.log(`✅ ${username} 비밀번호를 바꿨어요. 상태: ${admin.status}${admin.status !== AdminStatus.ACTIVE ? " (활성 아님 — 로그인 불가)" : ""}`);
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
