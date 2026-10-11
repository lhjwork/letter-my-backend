/**
 * 공지·문의: 모델 검증 + 페이징 + 입력 필터 + 응답 직렬화(관리자 id·이메일 미노출) + 권한. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/noticeInquiry.test.ts
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Notice from "../models/Notice";
import Inquiry from "../models/Inquiry";
import { ROLE_PERMISSIONS, AdminRole, PERMISSIONS } from "../models/Admin";
import { parsePaging, pickNoticeInput } from "../services/noticeService";
import { toMyInquiry, toAdminInquiryItem } from "../services/inquiryService";

// 공지 모델
assert.equal(new Notice({ title: "점검 안내", content: "줄1\n줄2" }).validateSync(), undefined);
assert.equal(new Notice({ title: "a", content: "b" }).isPublished, true, "기본 게시");
assert.equal(new Notice({ title: "a", content: "b" }).isPinned, false, "기본 고정 아님");
assert.ok(new Notice({ title: "가".repeat(101), content: "b" }).validateSync()?.errors.title, "제목 101자 거부");
assert.ok(new Notice({ title: "a", content: "가".repeat(5001) }).validateSync()?.errors.content, "본문 5001자 거부");

// 문의 모델
const userId = new mongoose.Types.ObjectId();
assert.equal(new Inquiry({ userId, category: "실물 편지", title: "배송", content: "언제 와요?" }).validateSync(), undefined);
assert.equal(new Inquiry({ userId, category: "기타", title: "a", content: "b" }).status, "open");
assert.ok(new Inquiry({ category: "기타", title: "a", content: "b" }).validateSync()?.errors.userId, "userId 필수");
assert.ok(new Inquiry({ userId, category: "환불", title: "a", content: "b" }).validateSync()?.errors.category, "없는 분류 거부");
assert.ok(new Inquiry({ userId, category: "기타", title: "a", content: "가".repeat(2001) }).validateSync()?.errors.content, "내용 2001자 거부");
assert.ok(new Inquiry({ userId, category: "기타", title: "a", content: "b", answer: "가".repeat(3001) }).validateSync()?.errors.answer, "답변 3001자 거부");

// 페이징
assert.deepEqual(parsePaging({}), { page: 1, limit: 20, skip: 0 });
assert.deepEqual(parsePaging({ page: "3", limit: "10" }), { page: 3, limit: 10, skip: 20 });
assert.deepEqual(parsePaging({ page: "-1", limit: "999" }), { page: 1, limit: 50, skip: 0 });
assert.deepEqual(parsePaging({ page: "abc", limit: "0" }), { page: 1, limit: 20, skip: 0 });

// 공지 입력: 허용 필드만, 타입 안 맞으면 버림
assert.deepEqual(pickNoticeInput({ title: "t", content: "c", isPinned: true, isPublished: "yes", _id: "x", createdAt: 1 }), { title: "t", content: "c", isPinned: true });

// 내 문의 응답: userId·answeredBy 없음, 답변 없으면 answer 키 없음
const adminId = new mongoose.Types.ObjectId();
const now = new Date();
const mine = toMyInquiry({ _id: "i1", userId, category: "계정", title: "t", content: "c", status: "answered", answer: "답", answeredAt: now, answeredBy: adminId, createdAt: now });
assert.deepEqual(Object.keys(mine).sort(), ["_id", "answer", "answeredAt", "category", "content", "createdAt", "status", "title"]);
assert.equal("answer" in toMyInquiry({ _id: "i2", category: "기타", title: "t", status: "open", createdAt: now }), false);

// 관리자 목록: 닉네임만, 이메일 없음
const item = toAdminInquiryItem({ _id: "i3", userId: { _id: userId, name: "느린 우체부", email: "x@y.z" }, category: "기타", title: "t", status: "open", createdAt: now });
assert.equal(item.nickname, "느린 우체부");
assert.equal(JSON.stringify(item).includes("x@y.z"), false);
assert.equal(toAdminInquiryItem({ _id: "i4", userId: null, category: "기타", title: "t", status: "open", createdAt: now }).nickname, "탈퇴한 사용자");

// 권한: super_admin 은 전부, manager 는 문의 읽기만
assert.ok(ROLE_PERMISSIONS[AdminRole.SUPER_ADMIN].includes(PERMISSIONS.NOTICES_WRITE));
assert.ok(ROLE_PERMISSIONS[AdminRole.SUPER_ADMIN].includes(PERMISSIONS.INQUIRIES_WRITE));
assert.ok(ROLE_PERMISSIONS[AdminRole.MANAGER].includes(PERMISSIONS.INQUIRIES_READ));
assert.equal(ROLE_PERMISSIONS[AdminRole.MANAGER].includes(PERMISSIONS.INQUIRIES_WRITE), false);

console.log("noticeInquiry.test.ts ok");
