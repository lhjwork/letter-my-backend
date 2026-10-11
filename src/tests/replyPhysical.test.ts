/**
 * 사연 답장 실물 신청 자격. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/replyPhysical.test.ts
 */
import assert from "node:assert/strict";
import { replyPhysicalBlock } from "../services/recipientLetterService";

assert.equal(replyPhysicalBlock(undefined, "a", true, false)?.[0], 401); // 비로그인
assert.equal(replyPhysicalBlock("b", "a", true, false)?.[0], 403); // 남의 사연
assert.equal(replyPhysicalBlock("a", undefined, true, true)?.[0], 403); // 사연 작성자 없음(탈퇴 등)
assert.equal(replyPhysicalBlock("a", "a", false, false)?.[0], 400); // 채택 안 된 일반 답장
assert.equal(replyPhysicalBlock("a", "a", true, false), null); // 레터 답장
assert.equal(replyPhysicalBlock("a", "a", false, true), null); // 채택 답장
console.log("replyPhysical.test.ts ok");
