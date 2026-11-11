/**
 * 다이어리 v2: 모델 검증(이어 쓰기 3,000자·페이지당 데코 20·일정 하루 3) + 구성 부분집합 + 페이지 키 + 잠금. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/diary.test.ts
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Diary from "../models/Diary";
import { applyAdminPhysicalStatus, isLocked, normalizeSections, dateInMonth, weeksInMonth, weekOf, isValidPageKey, monthEnd, hasContent } from "../services/diaryService";

const userId = new mongoose.Types.ObjectId();
const base = { userId, title: "11월의 기록", month: "2026-11" };
const day = (text: string) => ({ date: "2026-11-03", text });
const deco = (i: number, page = "day-2026-11-03") => ({ id: `d${i}`, page, type: "sticker", src: "heart", x: 10, y: 10, w: 20 });

// 기본값
const d0 = new Diary(base);
assert.equal(d0.validateSync(), undefined);
assert.deepEqual([...d0.sections], ["first", "monthly", "goals", "weekly", "daily", "letters", "review"]);
assert.equal(d0.status, "writing");
assert.equal(d0.physical.status, "none");
assert.ok(new Diary({ ...base, month: "2026-13" }).validateSync()?.errors.month, "13월 거부");
assert.ok(new Diary({ ...base, title: "가".repeat(31) }).validateSync()?.errors.title, "제목 31자 거부");
assert.ok(new Diary({ ...base, cover: "pink" }).validateSync()?.errors.cover, "없는 표지 거부");

// 이어 쓰기: 하루 3,000자까지
assert.equal(new Diary({ ...base, days: [day("가".repeat(3000))] }).validateSync(), undefined, "3,000자 허용");
assert.ok(new Diary({ ...base, days: [day("가".repeat(3001))] }).validateSync()?.errors["days.0.text"], "3,001자 거부");
assert.equal(new Diary({ ...base, days: [day("  들여쓰기\n\n")] }).days[0].text, "  들여쓰기\n\n", "본문은 trim 안 함");
assert.ok(new Diary({ ...base, days: [{ date: "2026-11-03", weather: "fog" }] }).validateSync(), "없는 날씨 거부");
assert.equal(new Diary({ ...base, days: [{ date: "2026-11-03", weather: null }] }).validateSync(), undefined, "날씨 null 허용");

// 데코: 페이지당 20개 (다른 페이지는 따로 센다)
const twenty = Array.from({ length: 20 }, (_, i) => deco(i));
assert.equal(new Diary({ ...base, decos: [...twenty, deco(99, "monthly")] }).validateSync(), undefined, "페이지당 20 + 다른 장 허용");
assert.ok(new Diary({ ...base, decos: [...twenty, deco(20)] }).validateSync()?.errors.decos, "한 장 21개 거부");

// 먼슬리 일정 하루 3개
const ev = (n: number) => Array.from({ length: n }, (_, i) => ({ date: "2026-11-14", text: `일정${i}` }));
assert.equal(new Diary({ ...base, monthly: { events: ev(3) } }).validateSync(), undefined);
assert.ok(new Diary({ ...base, monthly: { events: ev(4) } }).validateSync()?.errors["monthly.events"], "하루 4개 거부");
assert.ok(new Diary({ ...base, goals: { habits: Array.from({ length: 5 }, () => ({ name: "물" })) } }).validateSync()?.errors["goals.habits"], "습관 5개 거부");

// 구성: 부분집합 → 고정 순서
assert.deepEqual(normalizeSections(["review", "daily", "first"]), ["first", "daily", "review"]);
assert.equal(normalizeSections([]), null, "빈 구성 거부");
assert.equal(normalizeSections(["daily", "daily"]), null, "중복 거부");
assert.equal(normalizeSections(["daily", "cover"]), null, "모르는 섹션 거부");
assert.equal(normalizeSections("daily"), null, "배열 아님 거부");
assert.ok(new Diary({ ...base, sections: [] }).validateSync()?.errors.sections, "모델도 빈 구성 거부");

// 날짜·주·페이지 키
assert.equal(dateInMonth("2026-11-30", "2026-11"), true);
assert.equal(dateInMonth("2026-11-31", "2026-11"), false, "없는 날");
assert.equal(dateInMonth("2026-12-01", "2026-11"), false, "다른 달");
assert.equal(weeksInMonth("2026-11"), 5, "2026-11 은 일요일 시작 5주");
assert.equal(weeksInMonth("2026-08"), 6, "2026-08 은 토요일 시작 6주");
assert.equal(weekOf("2026-11-07"), 1);
assert.equal(weekOf("2026-11-08"), 2);
const all = ["first", "monthly", "goals", "weekly", "daily", "letters", "review"];
for (const k of ["first", "monthly", "goals", "letters", "review", "week-5", "day-2026-11-03", "day-2026-11-03-2", "day-2026-11-03-3"]) assert.equal(isValidPageKey(k, "2026-11", all), true, k);
for (const k of ["week-6", "week-0", "day-2026-11-31", "day-2026-11-03-4", "day-2026-12-01", "cover", "toc"]) assert.equal(isValidPageKey(k, "2026-11", all), false, k);
assert.equal(isValidPageKey("day-2026-11-03", "2026-11", ["first"]), false, "고르지 않은 구성의 장");
assert.equal(monthEnd("2026-12").toISOString(), "2026-12-31T15:00:00.000Z", "KST 다음 달 1일");

// 잠금
assert.equal(isLocked({ status: "writing", physical: { status: "none" } }), false);
assert.equal(isLocked({ status: "closed", physical: { status: "none" } }), true);
assert.equal(isLocked({ status: "writing", physical: { status: "requested" } }), true);
assert.equal(isLocked({ status: "writing", physical: { status: "rejected" } }), false, "반려되면 다시 열림");
assert.equal(isLocked({ status: "closed", physical: { status: "rejected" } }), true);
assert.equal(isLocked({ status: "writing", physical: { status: "printing" } }), true);

// 관리자 상태 변경: none 금지, rejected → writing, 그 외 closed
assert.equal(applyAdminPhysicalStatus("none"), null);
assert.deepEqual(applyAdminPhysicalStatus("rejected"), { physical: "rejected", status: "writing" });
assert.deepEqual(applyAdminPhysicalStatus("printing"), { physical: "printing", status: "closed" });
const rejected = applyAdminPhysicalStatus("rejected")!;
assert.equal(isLocked({ status: rejected.status!, physical: { status: rejected.physical } }), false, "반려 적용 후 열림");

// 제본 신청 조건
assert.equal(hasContent(new Diary(base)), false);
assert.equal(hasContent(new Diary({ ...base, days: [day("오늘")] })), true);
assert.equal(hasContent(new Diary({ ...base, days: [day("   ")] })), false);
assert.equal(hasContent(new Diary({ ...base, weeks: [{ week: 1 }] })), false, "빈 주는 내용 아님");
assert.equal(hasContent(new Diary({ ...base, weeks: [{ week: 1, line: "  " }] })), false);
assert.equal(hasContent(new Diary({ ...base, weeks: [{ week: 1, line: "잘 버텼다" }] })), true);
assert.equal(hasContent(new Diary({ ...base, weeks: [{ week: 2, todos: [{ text: "장보기" }] }] })), true);
assert.equal(hasContent(new Diary({ ...base, weeks: [{ week: 1, plans: [{ date: "2026-11-02", text: "치과" }] }] })), true);

console.log("diary.test.ts ok");
