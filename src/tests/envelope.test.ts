/**
 * envelope / isAnonymous / contentType 최소 검증. DB 없이 모델 validateSync 로만 확인.
 * 실행: npx ts-node-dev --transpile-only src/tests/envelope.test.ts
 */
import assert from "node:assert/strict";
import Letter from "../models/Letter";
import DraftLetter from "../models/DraftLetter";

const base = { type: "friend", title: "t", content: "안녕\n두 줄", authorName: "a" };

// 기본값
const l1 = new Letter(base);
assert.equal(l1.envelope, "seongsu");
assert.equal(l1.isAnonymous, false);
assert.equal(l1.validateSync(), undefined);

// 허용 값
assert.equal(new Letter({ ...base, envelope: "myeongdong" }).validateSync(), undefined);

// 잘못된 봉투는 거부
const bad = new Letter({ ...base, envelope: "gangnam" }).validateSync();
assert.ok(bad?.errors.envelope, "envelope enum 검증이 걸려야 한다");

// 기존 category 값 8개 그대로 통과
for (const c of ["가족", "사랑", "우정", "성장", "위로", "추억", "감사", "기타"]) {
  assert.equal(new Letter({ ...base, category: c }).validateSync(), undefined, c);
}

// DraftLetter 도 같은 필드
const d = new DraftLetter({ authorId: "507f1f77bcf86cd799439011", content: "x" });
assert.equal(d.envelope, "seongsu");
assert.equal(d.recipientName, "");
assert.ok(new DraftLetter({ authorId: "507f1f77bcf86cd799439011", envelope: "x" }).validateSync()?.errors.envelope);

console.log("envelope.test.ts ok");

// 공개 직렬화: 익명이면 실명·userId 가 나가지 않는다
import { toPublic } from "../services/letterService";
const pub = toPublic({ _id: "x", userId: "u1", isAnonymous: true, senderName: "홍길동", authorName: "익명", title: "t" });
assert.equal((pub as { userId?: unknown }).userId, undefined);
assert.equal(pub.senderName, "익명");
const pub2 = toPublic({ _id: "y", userId: "u1", isAnonymous: false, senderName: "홍길동", authorName: "홍길동" });
assert.equal(pub2.senderName, "홍길동");
assert.equal((pub2 as { userId?: unknown }).userId, undefined);
console.log("toPublic ok");
