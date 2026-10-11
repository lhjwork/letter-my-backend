/**
 * 댓글 모델 검증(0자·101자 거부) + 삭제 권한(본인/관리자) 순수 함수 + 공개 직렬화. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/comments.test.ts
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Comment from "../models/Comment";
import { canDeleteComment, toPublicComment } from "../services/commentService";

const letterId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();

assert.equal(new Comment({ letterId, userId, content: "늦지 않았어요." }).validateSync(), undefined);
assert.equal(new Comment({ letterId, userId, content: "가".repeat(100) }).validateSync(), undefined);
assert.ok(new Comment({ letterId, userId, content: "" }).validateSync()?.errors.content, "0자 거부");
assert.ok(new Comment({ letterId, userId, content: "   " }).validateSync()?.errors.content, "공백만 거부(trim)");
assert.ok(new Comment({ letterId, userId, content: "가".repeat(101) }).validateSync()?.errors.content, "101자 거부");
assert.ok(new Comment({ letterId, content: "x" }).validateSync()?.errors.userId, "userId 필수");

// 내 댓글만 삭제. 관리자는 전부
const mine = { userId };
assert.equal(canDeleteComment(mine, String(userId), false), true);
assert.equal(canDeleteComment(mine, String(new mongoose.Types.ObjectId()), false), false);
assert.equal(canDeleteComment(mine, String(new mongoose.Types.ObjectId()), true), true);

// 공개 응답: 닉네임만, userId·이메일 없음, isMine 계산
const pub = toPublicComment({ _id: "c1", userId: { _id: userId, name: "느린 우체부", email: "x@y.z" }, content: "힘내요", createdAt: new Date() }, String(userId));
assert.deepEqual(Object.keys(pub).sort(), ["_id", "content", "createdAt", "isMine", "nickname"]);
assert.equal(pub.nickname, "느린 우체부");
assert.equal(pub.isMine, true);
assert.equal(toPublicComment({ _id: "c2", userId: null, content: "x", createdAt: new Date() }).nickname, "익명");

console.log("comments.test.ts ok");
