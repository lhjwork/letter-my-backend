/**
 * 다이어리 v2: 모델 검증(이어 쓰기 3,000자·페이지당 데코 20·일정 하루 3) + 구성 부분집합 + 페이지 키 + 잠금. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/diary.test.ts
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Diary from "../models/Diary";
import { habitDayUpdate, mergeHabits, withHabitIds, applyAdminPhysicalStatus, isLocked, normalizeSections, dateInMonth, weeksInMonth, weekOf, isValidPageKey, monthEnd, hasContent, lastAttached, toDiarySummary, daySheetCount, dropShrunkDecos } from "../services/diaryService";

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
assert.ok(new Diary({ ...base, goals: { habits: Array.from({ length: 5 }, (_, i) => ({ id: `h${i}`, name: "물" })) } }).validateSync()?.errors["goals.habits"], "습관 5개 거부");
assert.ok(new Diary({ ...base, goals: { habits: [{ name: "물" }] } }).validateSync()?.errors["goals.habits.0.id"], "습관 id 필수");

// 습관: id 로 짝짓기. 체크한 날은 서버 값 유지, 새 id 는 빈 기록, 빠진 id 는 기록째 삭제
const H = [
  { id: "a", name: "물 한 잔", days: [1, 2, 3] },
  { id: "b", name: "걷기", days: [3] },
];
assert.deepEqual(mergeHabits(H, [{ id: "b", name: "걷기" }, { id: "c", name: "물 한 잔" }]), [
  { id: "b", name: "걷기", days: [3] },
  { id: "c", name: "물 한 잔", days: [] },
], "지우고 같은 이름 새로 = 빈 기록");
const twins = [
  { id: "s1", name: "산책", days: [1] },
  { id: "s2", name: "산책", days: [2] },
];
assert.deepEqual(mergeHabits(twins, [{ id: "s2", name: "산책" }]), [{ id: "s2", name: "산책", days: [2] }], "같은 이름 둘 중 첫째 지우기");
assert.deepEqual(mergeHabits(H, [{ id: "b", name: "걷기 40분" }])?.[0].days, [3], "이름 바꿔도 기록 유지");
assert.equal(mergeHabits(H, [{ id: "a", name: "x" }, { id: "a", name: "y" }]), null, "id 중복 거부");
// 지운 뒤 다른 습관 체크: id 하나만 겨눈다(순서·이름과 무관)
assert.deepEqual(habitDayUpdate("b", 5, true), { update: { $addToSet: { "goals.habits.$[h].days": 5 } }, arrayFilters: [{ "h.id": "b" }] });
assert.deepEqual(habitDayUpdate("s2", 2, false).update, { $pull: { "goals.habits.$[h].days": 2 } });
// 옛 데이터 정규화
assert.equal(withHabitIds(H), null, "다 있으면 그대로");
const norm = withHabitIds([{ name: "물", days: [1] } as unknown as (typeof H)[number], H[1]])!;
assert.ok(norm[0].id && norm[1].id === "b" && norm[0].days[0] === 1, "없는 id 만 붙임");

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
// 주 = 월요일 시작, 주 수 = 그 달 월요일 수, 첫 월요일 앞은 1주
assert.equal(weeksInMonth("2026-11"), 5, "2026-11 월요일 5개(2·9·16·23·30)");
for (const [d, w] of [["01", 1], ["02", 1], ["08", 1], ["09", 2], ["29", 4], ["30", 5]] as const) assert.equal(weekOf(`2026-11-${d}`), w, `11/${d}`);
assert.equal(weeksInMonth("2026-12"), 4, "2026-12 월요일 4개(7·14·21·28)");
for (const [d, w] of [["01", 1], ["06", 1], ["07", 1], ["13", 1], ["14", 2], ["28", 4], ["31", 4]] as const) assert.equal(weekOf(`2026-12-${d}`), w, `12/${d}`);
assert.equal(weeksInMonth("2026-06"), 5, "1일이 월요일(2026-06-01)");
assert.equal(weekOf("2026-06-07"), 1);
assert.equal(weekOf("2026-06-08"), 2);
assert.equal(weeksInMonth("2027-02"), 4, "2027-02 월요일 1·8·15·22");
assert.equal(isValidPageKey("week-5", "2026-12", ["weekly"]), false, "12월은 4주");
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

// 책장 "어제는 '…'을 붙였어요": 가장 최근 날짜의 마지막 편지, 제목 모르면(권한 밖·삭제) null
const [l1, l2, l3] = [0, 1, 2].map(() => new mongoose.Types.ObjectId());
const withLetters = new Diary({
  ...base,
  days: [
    { date: "2026-11-02", text: "", letters: [{ letterId: l1 }] },
    { date: "2026-11-10", text: "", letters: [{ letterId: l2, style: "note" }, { letterId: l3 }] },
    { date: "2026-11-11", text: "오늘은 편지 없음" },
  ],
});
assert.deepEqual(lastAttached(withLetters), { date: "2026-11-10", letterId: String(l3) });
assert.equal(lastAttached(new Diary({ ...base, days: [day("글만")] })), null);
assert.deepEqual(toDiarySummary(withLetters, new Map([[String(l3), "엄마의 답장"]])).lastLetter, { date: "2026-11-10", title: "엄마의 답장" });
assert.equal(toDiarySummary(withLetters).lastLetter, null, "제목 모르면 줄 없음");
assert.equal(toDiarySummary(new Diary(base)).lastLetter, null);

// 데일리 장 수(프런트 lib/diary-pages sheetStarts 와 같은 사례)
assert.equal(daySheetCount(""), 1);
assert.equal(daySheetCount("가".repeat(1000)), 1);
assert.equal(daySheetCount("가".repeat(1001)), 2);
assert.equal(daySheetCount("가".repeat(5000)), 3);
assert.equal(daySheetCount(Array.from({ length: 30 }, (_, i) => `줄${i}`).join("\n")), 2, "24줄 넘으면 다음 장");
assert.equal(daySheetCount(("가".repeat(43) + "\n").repeat(12) + "끝"), 2, "42자 넘는 줄은 두 줄");
assert.equal(toDiarySummary(new Diary({ ...base, days: [day("가".repeat(1500))] })).days[0].sheets, 2);
// 글이 줄어 없어진 이어 쓴 장의 데코는 빠진다(다른 날·첫 장·다른 섹션은 그대로)
const pages = ["day-2026-11-03", "day-2026-11-03-2", "day-2026-11-03-3", "day-2026-11-04-2", "monthly"].map((page) => ({ page }));
assert.deepEqual(dropShrunkDecos(pages, "2026-11-03", "가".repeat(1500)).map((x) => x.page), ["day-2026-11-03", "day-2026-11-03-2", "day-2026-11-04-2", "monthly"]);
assert.deepEqual(dropShrunkDecos(pages, "2026-11-03", "").map((x) => x.page), ["day-2026-11-03", "day-2026-11-04-2", "monthly"]);
console.log("diary.test.ts ok");
