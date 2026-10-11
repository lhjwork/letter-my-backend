/**
 * 관리자 답장 목록 한 줄 변환. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/adminReplies.test.ts
 */
import assert from "node:assert/strict";
process.env.ADMIN_EMAIL = "team@letter.test";
import { toReplyRow } from "../services/adminService";

const base = { _id: "a1", status: "published", createdAt: new Date() };
const team = toReplyRow({ ...base, authorName: "레터", email: "team@letter.test", plainContent: "짧은 답장" });
assert.equal(team.isAdminReply, true);
assert.equal(team.isAdopted, false);
assert.equal(team.preview, "짧은 답장");

const html = toReplyRow({ ...base, contentType: "html", content: "<p>첫 줄</p><p>둘째 줄</p>", adoptedAt: new Date(), email: "x@y.z" });
assert.equal(html.isAdminReply, false);
assert.equal(html.isAdopted, true);
assert.equal(html.authorName, "익명");
assert.ok(html.preview.includes("첫 줄") && !html.preview.includes("<"));

const long = toReplyRow({ ...base, plainContent: "가".repeat(100) });
assert.equal(long.preview.length, 81);
console.log("adminReplies.test.ts ok");
