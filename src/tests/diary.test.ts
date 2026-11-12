/**
 * 다이어리 v2: 모델 검증(이어 쓰기 3,000자·페이지당 데코 20·일정 하루 3) + 구성 부분집합 + 페이지 키 + 잠금. DB 없이 실행.
 * 실행: npx ts-node-dev --transpile-only src/tests/diary.test.ts
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Diary from "../models/Diary";
import User from "../models/User";
import { habitDayUpdate, mergeHabits, withHabitIds, applyAdminPhysicalStatus, isLocked, normalizeSections, dateInMonth, weeksInMonth, weekOf, isValidPageKey, monthEnd, hasContent, lastAttached, toDiarySummary, daySheetCount, dropShrunkDecos, dayTextFits, textLines, FIELD_CHARS, fitsOrKept, ONE_LINE, TO_ME_LINES } from "../services/diaryService";
import { physicalRules, sectionRules } from "../routes/diaries";
import diaryController from "../controllers/diaryController";
import diaryService from "../services/diaryService";
import jwt from "jsonwebtoken";
import { diaryPhysicalKey } from "../middleware/rateLimiter";
import { validationResult } from "express-validator";

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
// 한 줄 39자(가장 좁은 글씨체 기준) → 띄어쓰기 없는 글은 24 × 39 = 936자에서 찬다
assert.equal(daySheetCount("가".repeat(936)), 1);
assert.equal(daySheetCount("가".repeat(937)), 2);
assert.equal(daySheetCount("가".repeat(1000)), 2, "띄어쓰기 없는 1,000자는 25줄");
assert.equal(daySheetCount(("가".repeat(42) + "\n").repeat(23)), 2, "가×42 줄 23개 = 46줄");
assert.equal(daySheetCount(("가".repeat(39) + "\n").repeat(23) + "가".repeat(39)), 1, "39자 줄 24개는 한 장");
assert.equal(daySheetCount("가".repeat(5000)), 3);
assert.equal(daySheetCount(Array.from({ length: 30 }, (_, i) => `줄${i}`).join("\n")), 2, "24줄 넘으면 다음 장");
assert.equal(daySheetCount(("가".repeat(40) + "\n").repeat(12) + "끝"), 2, "39자 넘는 줄은 두 줄");
// 어절 단위 줄바꿈(keep-all): 프런트 check 와 같은 사례
const words = (k: number, n: number) => ("가".repeat(k) + " ").repeat(n);
assert.equal(daySheetCount(words(8, 96)), 1, "8자 어절 96개 = 24줄");
assert.equal(daySheetCount(words(8, 97)), 2);
assert.equal(daySheetCount(words(15, 48)), 1, "15자 어절 한 줄 2개");
assert.equal(daySheetCount(words(15, 49)), 2);
assert.equal(daySheetCount(words(20, 24)), 1, "20자 어절 한 줄 1개");
assert.equal(daySheetCount(words(20, 25)), 2);
assert.equal(daySheetCount(words(50, 12)), 1, "50자 어절 = 두 줄");
assert.equal(daySheetCount(words(50, 13)), 2);
// 음절보다 넓은 글자: 프런트 check 와 같은 사례
assert.equal(daySheetCount("ㅋ".repeat(744)), 1);
assert.equal(daySheetCount("ㅋ".repeat(745)), 2);
assert.equal(daySheetCount("—".repeat(624)), 1);
assert.equal(daySheetCount("—".repeat(625)), 2);
assert.equal(daySheetCount("♡".repeat(745)), 2);
assert.equal(daySheetCount(("ㅋ".repeat(10) + " ").repeat(48)), 1);
assert.equal(daySheetCount(("ㅋ".repeat(10) + " ").repeat(49)), 2);
// 가나·한자·말줄임표: 프런트 check 와 같은 사례
assert.equal(daySheetCount("あ".repeat(720)), 1);
assert.equal(daySheetCount("あ".repeat(721)), 2);
// 띄어쓰기 없는 일본어는 、。 뒤에서만 줄이 바뀐다(QA 4·5 합본 3차, 실제 36·29·26줄)
{
  const ja = (s: string, n: number) => s.repeat(Math.ceil(n / s.length)).slice(0, n);
  assert.equal(daySheetCount(ja("コーヒーショップでアルバイトをしている。", 720)), 2);
  assert.equal(daySheetCount(ja("今日は郵便受けを開けたら、母からの返事が届いていた。", 755)), 2);
  assert.equal(daySheetCount(ja("２０２６年１１月１２日、晴れ。", 768)), 2);
}
assert.equal(daySheetCount("漢".repeat(840)), 1);
assert.equal(daySheetCount("漢".repeat(841)), 2);
assert.equal(daySheetCount("…".repeat(624)), 1);
assert.equal(daySheetCount("…".repeat(625)), 2);
// PUT days 검증: 3,000자 안이어도 3장(72줄)을 넘치면 받지 않는다
assert.equal(dayTextFits("\n".repeat(71)), true);
assert.equal(dayTextFits("\n".repeat(80) + "끝"), false);
assert.equal(dayTextFits("가".repeat(3 * 936)), true);
assert.equal(dayTextFits("가".repeat(3 * 936 + 1)), false);
assert.equal(dayTextFits(undefined), true);
assert.equal(toDiarySummary(new Diary({ ...base, days: [day("가".repeat(1500))] })).days[0].sheets, 2);
// 글이 줄어 없어진 이어 쓴 장의 데코는 빠진다(다른 날·첫 장·다른 섹션은 그대로)
const pages = ["day-2026-11-03", "day-2026-11-03-2", "day-2026-11-03-3", "day-2026-11-04-2", "monthly"].map((page) => ({ page }));
assert.deepEqual(dropShrunkDecos(pages, "2026-11-03", "가".repeat(1500)).map((x) => x.page), ["day-2026-11-03", "day-2026-11-03-2", "day-2026-11-04-2", "monthly"]);
assert.deepEqual(dropShrunkDecos(pages, "2026-11-03", "").map((x) => x.page), ["day-2026-11-03", "day-2026-11-04-2", "monthly"]);
// 이 달의 편지·돌아보기 칸 줄 셈: 프런트 check 와 같은 사례
// 한 줄 칸 폭(ONE_LINE): 칸에 드는 글만, 단 저장돼 있던 긴 글 그대로는 통과(옛 한도로 쓴 글이 다른 칸 저장을 막지 않게)
assert.deepEqual(ONE_LINE, { owner: 9, resolution: 14, toMe: 15, memo: 6, item: 13, wish: 15, habit: 5, plan: 13, weekLine: 16, thanks: 13, quoteBy: 10 }, "프런트 lib/diary-pages ONE_LINE 과 같은 값");
assert.equal(fitsOrKept("가".repeat(9), "", ONE_LINE.owner), true);
assert.equal(fitsOrKept("가".repeat(10), "", ONE_LINE.owner), false, "칸보다 긴 새 글 거부");
assert.equal(fitsOrKept("가".repeat(20), "가".repeat(20), ONE_LINE.owner), true, "저장돼 있던 긴 글 그대로");
assert.equal(fitsOrKept("가".repeat(21), "가".repeat(20), ONE_LINE.owner), false, "긴 글을 더 늘리면 거부");
assert.equal(fitsOrKept(["짧게", "가".repeat(30) + " "], ["가".repeat(30)], ONE_LINE.item), true, "여러 줄 가운데 옛 글(끝 띄어쓰기 무시)");
assert.equal(fitsOrKept("가".repeat(15), "가".repeat(20), ONE_LINE.owner), true, "긴 글을 줄이는 중(아직 칸보다 김)");
assert.equal(fitsOrKept("あ".repeat(9), "가".repeat(9), ONE_LINE.owner), false, "저장된 글이 칸에 들던 것이면 예외 없음(넓은 글자)");
assert.equal(fitsOrKept(["짧게", "나".repeat(14)], ["짧게"], ONE_LINE.item), false);
assert.equal(fitsOrKept("가".repeat(30), "", ONE_LINE.toMe, TO_ME_LINES), true, "나에게 한 줄 2줄");
assert.equal(fitsOrKept("가".repeat(31), "", ONE_LINE.toMe, TO_ME_LINES), false);
assert.equal(fitsOrKept(undefined, undefined, 5), true, "안 보낸 칸");
assert.equal(textLines("", FIELD_CHARS), 1);
assert.equal(textLines("가".repeat(17), FIELD_CHARS), 1);
assert.equal(textLines("가".repeat(18), FIELD_CHARS), 2);
assert.equal(textLines("가".repeat(15) + " 나다라", FIELD_CHARS), 2);
assert.equal(textLines("한 줄\n\n셋째 줄", FIELD_CHARS), 3);

// PATCH section/letters·review 검증(이 달의 편지·돌아보기)
const check = async (name: keyof typeof sectionRules, body: object) => {
  const req = { body, params: {}, query: {}, headers: {} };
  for (const r of sectionRules[name]) await r.run(req);
  return validationResult(req).isEmpty();
};
(async () => {
  assert.equal(await check("letters", { quotes: [{ text: "네 글씨 보니 좋더라.", by: "엄마", date: "2026-11-03" }, { text: "천천히 가도 도착은 해.", by: "", date: "" }] }), true);
  assert.equal(await check("letters", { quotes: [{ text: "  ", by: "엄마" }] }), false, "빈 문장 거부");
  assert.equal(await check("letters", { quotes: [{ text: "가".repeat(61) }] }), false, "61자 거부");
  assert.equal(await check("letters", { quotes: [{ text: "가", date: "11월 3일" }] }), false, "날짜 형식");
  assert.equal(await check("letters", { quotes: Array.from({ length: 5 }, () => ({ text: "가" })) }), false, "5개 거부");
  assert.equal(await check("review", { good: ["이사 집을 정했다", "", ""], regret: "가".repeat(51), scene: "성수 팝업 날", toNext: "가".repeat(170) }), true);
  assert.equal(await check("review", { good: ["a", "b", "c", "d"] }), false, "좋았던 일 4개 거부");
  assert.equal(await check("review", { toNext: "가".repeat(301) }), false, "301자 거부");
  assert.equal(await check("review", { scene: "가".repeat(41) }), false);
  // 종이 줄 넘침(QA 6단계 2·3·6)
  assert.equal(await check("letters", { quotes: [{ text: "가", date: "2026-13-40" }] }), false, "없는 날짜");
  assert.equal(await check("letters", { quotes: [{ text: "가", date: "2026-02-30" }] }), false, "없는 날짜 2.30");
  assert.equal(await check("letters", { quotes: Array.from({ length: 4 }, () => ({ text: "가".repeat(60) })) }), false, "60자 넷 = 20줄");
  assert.equal(await check("letters", { quotes: Array.from({ length: 4 }, () => ({ text: "가".repeat(34) })) }), true, "2줄씩 넷 = 12줄");
  assert.equal(await check("review", { toNext: "가".repeat(171) }), false, "다음 달에게 11줄");
  assert.equal(await check("review", { toNext: "한 줄\n".repeat(10) + "넘침" }), false, "줄바꿈 11줄");
  assert.equal(await check("review", { regret: "가".repeat(52) }), false, "아쉬웠던 일 4줄");
  assert.equal(await check("review", { good: ["가".repeat(18), "", ""] }), false, "좋았던 일 2줄");
  assert.equal(await check("review", { scene: "가".repeat(12) }), false, "한 장면 2줄");

  // POST physical 검증(책으로 받기): 제본·부수·배송지
  const bind = async (body: object) => {
    const req = { body, params: {}, query: {}, headers: {} };
    for (const r of physicalRules) await r.run(req);
    return validationResult(req).isEmpty();
  };
  const addr = { name: "김하늘", phone: "010-1234-5678", zipCode: "04790", address1: "서울 성동구 성수이로 12" };
  assert.equal(await bind({ binding: "spring", copies: 1, address: addr }), true);
  assert.equal(await bind({ binding: "perfect", copies: 5, address: { ...addr, address2: "3층", memo: "문 앞에 놓아 주세요" } }), true);
  assert.equal(await bind({ binding: "hard", copies: 1, address: addr }), false, "없는 제본");
  assert.equal(await bind({ binding: "spring", copies: 6, address: addr }), false, "6권 거부");
  assert.equal(await bind({ binding: "spring", copies: 0, address: addr }), false, "0권 거부");
  assert.equal(await bind({ binding: "spring", copies: 1 }), false, "배송지 없음");
  assert.equal(await bind({ binding: "spring", copies: 1, address: { ...addr, name: "김" } }), false, "이름 1자");
  assert.equal(await bind({ binding: "spring", copies: 1, address: { ...addr, phone: "" } }), false, "연락처 없음");
  assert.equal(await bind({ binding: "spring", copies: 1, address: { ...addr, phone: "02-123-4567" } }), false, "휴대폰 아님");
  assert.equal(await bind({ binding: "spring", copies: 1, address: { ...addr, phone: ["010-1234-5678"] } }), false, "연락처 배열");
  assert.equal(await bind({ binding: "spring", copies: 1, address: { ...addr, zipCode: "0479" } }), false, "우편번호 4자리");
  assert.equal(await bind({ binding: "spring", copies: 1, address: { ...addr, address1: "서울" } }), false, "주소 짧음");

  // 인쇄 열람(print-view): 토큰은 그 다이어리 하나에만, 응답에 배송지 없음. DB 대신 findById 만 바꿔 끼운다
  const printed = new Diary({ ...base, days: [day("오늘은 비가 왔다.")], physical: { status: "requested", binding: "spring", copies: 1, address: addr, requestedAt: new Date() } });
  const pid = String(printed._id);
  const findById = Diary.findById;
  (Diary as unknown as { findById: unknown }).findById = async (x: string) => (x === pid ? printed : null);
  // 표지 이름: 첫 장 주인 이름이 비면 계정 닉네임. 계정에서는 name 만 고른다(실명·이메일은 응답에 없다)
  const findUser = User.findById;
  let picked = "";
  (User as unknown as { findById: unknown }).findById = (x: unknown) => ({
    select: (f: string) => ((picked = f), { lean: async () => (String(x) === String(userId) ? { name: "가을편지" } : null) }),
  });
  const view = await diaryService.printView(pid);
  assert.equal(view.coverName, "가을편지", "주인 이름 칸이 비면 닉네임");
  assert.equal(picked, "name", "계정에서 닉네임만 읽는다");
  printed.first.owner = "가을";
  assert.equal((await diaryService.printView(pid)).coverName, "가을", "주인 이름 칸이 먼저");
  printed.first.owner = "";
  assert.equal(/realName|email/.test(JSON.stringify(view)), false, "실명·이메일 없음");
  assert.equal("address" in view.physical, false, "인쇄 열람에 배송지 없음");
  assert.equal(JSON.stringify(view).includes("010-1234-5678"), false);
  assert.equal(view.physical.status, "requested");
  assert.equal(view.days[0].text, "오늘은 비가 왔다.");

  process.env.JWT_SECRET = "test-secret";
  const sign = (payload: object, expiresIn: number | string = "15m") => jwt.sign(payload, "test-secret", { expiresIn: expiresIn as jwt.SignOptions["expiresIn"], algorithm: "HS256" });
  const open = async (t: string) => {
    const res = { code: 0, body: null as unknown, status(c: number) { this.code = c; return this; }, json(b: unknown) { this.body = b; return this; } };
    await diaryController.printView({ params: { id: pid }, query: { t } } as never, res as never);
    return res;
  };
  const ok = await open(sign({ type: "diary-print", diaryId: pid }));
  assert.equal(ok.code, 200);
  assert.equal(JSON.stringify(ok.body).includes("성수이로"), false, "토큰 열람 응답에 주소 없음");
  assert.equal((await open(sign({ type: "diary-print", diaryId: String(new mongoose.Types.ObjectId()) }))).code, 401, "다른 다이어리 토큰");
  assert.equal((await open(sign({ type: "diary-print", diaryId: pid }, -10))).code, 401, "만료");
  assert.equal((await open(sign({ userId: String(userId), diaryId: pid }))).code, 401, "로그인 토큰 등 다른 종류");
  assert.equal((await open(jwt.sign({ type: "diary-print", diaryId: pid }, "other-secret"))).code, 401, "서명 다름");
  assert.equal((await open("")).code, 401);

  // 관리자 상태 변경: 신청 없는 다이어리는 409(저장하지 않음), 신청한 것은 바뀐다
  const plain = new Diary({ ...base, days: [day("가")] });
  let saved = 0;
  plain.save = (async () => void saved++) as never;
  printed.save = (async () => void saved++) as never;
  (Diary as unknown as { findById: unknown }).findById = async (x: string) => (x === pid ? printed : x === String(plain._id) ? plain : null);
  await assert.rejects(() => diaryService.updatePhysical(String(plain._id), { status: "requested" }), (e: { status?: number }) => e.status === 409, "신청 없음 → 409");
  await assert.rejects(() => diaryService.updatePhysical(String(plain._id), { notes: "메모만" }), (e: { status?: number }) => e.status === 409);
  assert.equal(plain.physical.status, "none");
  assert.equal(plain.status, "writing");
  assert.equal(saved, 0);
  assert.equal((await diaryService.updatePhysical(pid, { status: "approved" })).status, "approved");
  assert.equal(saved, 1);
  // 신청 횟수는 사용자 id 로 센다(같은 IP 라도 사람마다 따로)
  const key = (userId: string) => diaryPhysicalKey({ ip: "::1", user: { userId } } as never);
  assert.notEqual(key("u1"), key("u2"));
  assert.equal(key("u1"), key("u1"));
  (Diary as unknown as { findById: unknown }).findById = findById;
  (User as unknown as { findById: unknown }).findById = findUser;

  console.log("diary.test.ts ok");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
