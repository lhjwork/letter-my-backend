/**
 * 마이페이지 내 기록 카드 구분·배지. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/myRecords.test.ts
 */
import assert from "node:assert/strict";
import { toRecordItem } from "../services/myRecordsService";

const me = "650000000000000000000001";
const other = "650000000000000000000002";
const base = { _id: "650000000000000000000009", title: "t", createdAt: "2026-10-09T00:00:00Z" };

const story = toRecordItem({ ...base, type: "story", userId: me }, me, 3);
assert.deepEqual([story.kind, story.flow, story.label, story.badge?.text], ["story", "story", "나의 사연", "답장 3"]);
assert.equal(toRecordItem({ ...base, type: "story", userId: me }, me, 0).badge?.text, "답장 기다림");

const heart = toRecordItem({ ...base, type: "friend", userId: me }, me);
assert.deepEqual([heart.kind, heart.flow, heart.badge], ["sent", "heart", null]);
assert.equal(toRecordItem({ ...base, type: "friend", userId: me, physicalLetterStats: { totalRequests: 1 } }, me).badge?.text, "실물 신청됨");

const myReply = toRecordItem({ ...base, title: "Re: 마지막 인사", type: "friend", userId: me, replyToId: other, storyTitle: "마지막 인사를 어떻게" }, me);
assert.deepEqual([myReply.kind, myReply.flow, myReply.label, myReply.badge?.text, myReply.title], ["sent", "story", "보낸 · 답장", "검토 중", "‘마지막 인사를 어떻게’에 쓴 답장"]);

const gotReply = toRecordItem({ ...base, type: "friend", userId: other, replyToId: other, adoptedAt: new Date() }, me);
assert.deepEqual([gotReply.kind, gotReply.label, gotReply.badge?.text, gotReply.title], ["received", "받은 · 사연 답장", "채택", "t"]);
const titled = toRecordItem({ ...base, type: "friend", userId: other, replyToId: other, adoptedAt: new Date(), storyTitle: "이사 첫날", physicalLetterStats: { totalRequests: 1 } }, me);
assert.deepEqual([titled.title, titled.storyTitle, titled.physical], ["‘이사 첫날’에 온 답장", "이사 첫날", true]);
const letterReply = toRecordItem({ ...base, type: "friend", userId: other, replyToId: other }, me, 0, new Set([other]));
assert.deepEqual([letterReply.kind, letterReply.badge?.text, letterReply.badge?.tone], ["received", "레터의 답장", "brick"]);

const gotHeart = toRecordItem({ ...base, type: "friend", userId: other }, me);
assert.deepEqual([gotHeart.kind, gotHeart.flow, gotHeart.label], ["received", "heart", "받은 · 마음 편지"]);

console.log("myRecords.test.ts ok");
