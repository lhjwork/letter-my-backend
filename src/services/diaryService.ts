import mongoose from "mongoose";
import Diary, { IDiary, IDiaryHabit, DIARY_SECTIONS, DiarySection } from "../models/Diary";
import Letter, { LetterStatus } from "../models/Letter";
import { recordScopes, attachStoryTitles, toRecordItem, RecordRow } from "./myRecordsService";
import { extractPlainText } from "../utils/htmlProcessor";

/** 컨트롤러가 status 로 바꿔 응답하는 에러 */
export class DiaryError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ===== 순수 함수 (src/tests/diary.test.ts) =====

/** 제본 신청 후는 읽기만. 신청 전(none)·반려(rejected)이고 writing 이면 열림 */
export function isLocked(d: { status: string; physical?: { status?: string } }): boolean {
  const p = d.physical?.status ?? "none";
  return !(d.status === "writing" && (p === "none" || p === "rejected"));
}

/** 관리자 상태 변경 결과. none 으로 되돌리기는 금지(null), rejected 면 다시 쓸 수 있게 writing */
export function applyAdminPhysicalStatus(next: string): { physical: string; status?: "writing" | "closed" } | null {
  if (next === "none") return null;
  return next === "rejected" ? { physical: next, status: "writing" } : { physical: next, status: "closed" };
}

/** 구성 부분집합 → 고정 순서로 정렬. 비었거나 모르는 값·중복이면 null */
export function normalizeSections(input: unknown): DiarySection[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const set = new Set(input);
  if (set.size !== input.length || input.some((s) => !DIARY_SECTIONS.includes(s))) return null;
  return DIARY_SECTIONS.filter((s) => set.has(s));
}

/** "YYYY-MM-DD" 가 실제 날짜이고 그 달에 속하는지 */
export function dateInMonth(date: string, month: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !date.startsWith(month + "-")) return false;
  const d = new Date(date + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

const firstDow = (month: string) => new Date(month + "-01T00:00:00Z").getUTCDay();
const daysIn = (month: string) => new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();

/** 그 달 첫 월요일의 날짜(1~7) */
const firstMonday = (month: string) => 1 + ((8 - firstDow(month)) % 7);

/** 주 수 = 그 달의 월요일 수(4~5). week N = N번째 월요일~일요일, 첫 월요일 앞 날짜는 1주, 달 끝에서 잘림 */
export function weeksInMonth(month: string): number {
  return Math.floor((daysIn(month) - firstMonday(month)) / 7) + 1;
}

/** 날짜가 그 달 몇째 주인지(1부터, 월요일 시작, 첫 월요일 앞은 1주) */
export function weekOf(date: string): number {
  const m1 = firstMonday(date.slice(0, 7));
  const d = Number(date.slice(8, 10));
  return d < m1 ? 1 : Math.floor((d - m1) / 7) + 1;
}

const PAGE_SECTION: Record<string, DiarySection> = { first: "first", monthly: "monthly", goals: "goals", letters: "letters", review: "review" };

/** 페이지 키가 그 다이어리에 있는 장인지: first|monthly|goals|letters|review|week-N|day-YYYY-MM-DD(-2|-3) */
export function isValidPageKey(key: string, month: string, sections: readonly string[]): boolean {
  if (PAGE_SECTION[key]) return sections.includes(PAGE_SECTION[key]);
  const w = /^week-([1-6])$/.exec(key);
  if (w) return sections.includes("weekly") && Number(w[1]) <= weeksInMonth(month);
  const d = /^day-(\d{4}-\d{2}-\d{2})(-[23])?$/.exec(key);
  return !!d && sections.includes("daily") && dateInMonth(d[1], month);
}

/** 그 달의 끝(KST 다음 달 1일 0시) */
export function monthEnd(month: string): Date {
  const y = +month.slice(0, 4);
  const m = +month.slice(5, 7);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return new Date(`${next}-01T00:00:00+09:00`);
}

// 데일리 장 나누기 — 프런트 letter-community lib/diary-pages.ts sheetStarts 와 같은 값·같은 식(바꾸면 둘 다).
// 한 줄 39자 = 가장 좁은 글씨체(개구 40자, 438px 칸 실측) - 여유 1. 7단계 인쇄도 같은 기준
const SHEET_CHARS = 1000;
const SHEET_LINES = 24;
const LINE_CHARS = 39;
export const MAX_DAY_SHEETS = 3;

/**
 * 글자 폭(한글 음절 = 20, 1/20칸 단위). 네 글씨체 실측(QA 4·5 합본 1·2차, 438px 칸)에서 음절보다 넓던 것만 넓게 센다(여유 포함):
 * 한자 = 22(1.1칸, "漢"×936 이 25줄), 가나 = 26(1.3칸, 실측 약 1.24),
 * 한글 낱자(ㅋ·ㅠ)·전각 문자·CJK 기호(、。)·화살표·도형(♡★) 등 = 25(1.25칸, 펜 "ㅋ"×10+띄어쓰기가 한 줄 3묶음이 안 됨),
 * 대시(— 등, 개구 1.33칸)·말줄임표(…, 개구 1.3칸 넘음) = 30, 그 밖의 일반 구두점(“ ” 등) = 25
 */
function charWidth(c: number): number {
  if ((c >= 0x2010 && c <= 0x2015) || c === 0x2026 || c === 0x2e3a || c === 0x2e3b) return 30;
  if ((c >= 0x3040 && c <= 0x30ff) || (c >= 0x31f0 && c <= 0x31ff)) return 26;
  if ((c >= 0x3400 && c <= 0x4dbf) || (c >= 0x4e00 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff)) return 22;
  if (c >= 0x2016 && c <= 0x206f) return 25;
  if (c >= 0x2190 && c <= 0x2bff) return 25;
  if ((c >= 0x1100 && c <= 0x11ff) || (c >= 0x3000 && c <= 0x303f) || (c >= 0x3130 && c <= 0x318f) || (c >= 0xa960 && c <= 0xa97f) || (c >= 0xd7b0 && c <= 0xd7ff) || (c >= 0xff00 && c <= 0xffef)) return 25;
  return 20;
}

/**
 * 하루 글이 차지하는 인쇄 장 수(넘침 포함, 자르지 않음). 한 장 1,000자 또는 24줄까지.
 * 줄은 꽉 찬 칸 CSS(pre-wrap · keep-all · overflow-wrap:anywhere) 흉내: 남은 칸에 안 드는 어절은 다음 줄, 한 줄보다 긴 어절은 쪼갬, 줄 끝 공백은 매달림.
 * 한 줄 = 한글 음절 39자 폭, 낱자·기호는 charWidth 로 넓게(프런트와 같은 값)
 */
/** 어절 끝: 공백·줄바꿈, 그리고 keep-all 이 뒤에서 끊는 CJK 닫는 구두점(프런트 sheetStarts 와 같은 값) */
const WORD_END = /[ \t\n、。，．！？」』）〉》】〕｡､]/;
export function daySheetsRaw(text: string): number {
  let sheets = 1;
  const LINE = LINE_CHARS * 20;
  let n = 0;
  let line = 1;
  let col = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nl = ch === "\n";
    const sp = ch === " " || ch === "\t";
    const w = charWidth(text.charCodeAt(i));
    if (!nl && !sp) {
      // 어절 첫 글자: 남은 칸에 어절이 안 들어가면 줄을 넘긴다
      if (col > 0 && (i === 0 || WORD_END.test(text[i - 1]))) {
        let wide = 0;
        for (let j = i; j < text.length && !/[ \t\n]/.test(text[j]); j++) {
          wide += charWidth(text.charCodeAt(j));
          if (WORD_END.test(text[j])) break;
        }
        if (col + wide > LINE) {
          line++;
          col = 0;
        }
      }
      // 한 줄보다 긴 어절은 칸 끝에서 쪼갠다
      if (col > 0 && col + w > LINE) {
        line++;
        col = 0;
      }
    }
    if (n === SHEET_CHARS || line > SHEET_LINES) {
      sheets++;
      n = 0;
      line = 1;
      col = 0;
    }
    n++;
    if (nl) {
      line++;
      col = 0;
    } else col = Math.min(LINE, col + w); // 줄 끝 공백은 매달린다
  }
  return sheets;
}

/** PUT days 검증: 글자 수(3,000자)와 별도로 3장 안에 드는지(줄바꿈 많은 글). 프런트 editDay 와 같은 한도 */
export const dayTextFits = (text: unknown) => typeof text !== "string" || daySheetsRaw(text) <= MAX_DAY_SHEETS;

/** 하루 글이 차지하는 인쇄 장 수(1~3) */
export const daySheetCount = (text: string) => Math.min(MAX_DAY_SHEETS, daySheetsRaw(text));

/** 그날 글이 줄어 없어진 이어 쓴 장(day-날짜-2|-3)의 데코를 뺀다 */
export function dropShrunkDecos<T extends { page: string }>(decos: T[], date: string, text: string): T[] {
  const sheets = daySheetCount(text);
  return decos.filter((x) => {
    const m = /^day-(\d{4}-\d{2}-\d{2})-([23])$/.exec(x.page);
    return !m || m[1] !== date || Number(m[2]) <= sheets;
  });
}

/** id 없는 옛 습관에 id 를 붙인다. 바뀐 게 없으면 null */
export function withHabitIds(habits: IDiaryHabit[]): IDiaryHabit[] | null {
  if (habits.every((h) => h.id)) return null;
  return habits.map((h) => ({ id: h.id || new mongoose.Types.ObjectId().toString(), name: h.name, days: [...h.days] }));
}

/**
 * goals 통째 저장의 습관: 이름·순서만 받은 값, 체크한 날은 서버 값을 id 로 이어 받는다.
 * 새 id 는 빈 기록, 빠진 id 는 기록째 지워진다. id 가 겹치면 null(400)
 */
export function mergeHabits(server: IDiaryHabit[], incoming: { id: string; name: string }[]): IDiaryHabit[] | null {
  if (new Set(incoming.map((h) => h.id)).size !== incoming.length) return null;
  return incoming.map((h) => ({ id: h.id, name: h.name, days: [...(server.find((s) => s.id === h.id)?.days ?? [])] }));
}

/** 습관 한 칸 켜기·끄기(원자적). id 가 맞는 습관 하나만 */
export function habitDayUpdate(habitId: string, day: number, on: boolean) {
  const path = "goals.habits.$[h].days";
  return { update: on ? { $addToSet: { [path]: day } } : { $pull: { [path]: day } }, arrayFilters: [{ "h.id": habitId }] };
}

/** 쓴 흔적이 있어야 제본 신청 가능 */
export function hasContent(d: Pick<IDiary, "days" | "decos" | "monthly" | "weeks">): boolean {
  const weekFilled = d.weeks.some((w) => w.plans.length || w.todos.length || w.line.trim());
  return d.days.some((x) => x.text.trim() || x.letters.length) || d.decos.length > 0 || d.monthly.events.length > 0 || weekFilled;
}

/** 가장 최근 날짜에 붙인 편지(그날 마지막 것). 붙인 시각은 저장하지 않아 날짜 기준 */
export function lastAttached(d: Pick<IDiary, "days">): { date: string; letterId: string } | null {
  const day = [...d.days].filter((x) => x.letters.length).sort((a, b) => b.date.localeCompare(a.date))[0];
  return day ? { date: day.date, letterId: String(day.letters[day.letters.length - 1].letterId) } : null;
}

/** 책장 카드: 본문 대신 날짜별 글자 수·장 수(쪽 번호는 프런트 lib/diary-pages.ts 가 계산). titles: 편지 id → 제목(list 가 한 번에 조회) */
export function toDiarySummary(d: IDiary, titles: Map<string, string> = new Map()) {
  const last = [...d.days].filter((x) => x.text.trim()).sort((a, b) => b.date.localeCompare(a.date))[0];
  const attached = lastAttached(d);
  const lastTitle = attached && titles.get(attached.letterId);
  return {
    _id: String(d._id),
    title: d.title,
    month: d.month,
    cover: d.cover,
    paper: d.paper,
    font: d.font,
    sections: d.sections,
    status: d.status,
    physicalStatus: d.physical?.status ?? "none",
    days: d.days.map((x) => ({ date: x.date, chars: x.text.length, sheets: daySheetCount(x.text), letters: x.letters.length })),
    lastDay: last ? { date: last.date, text: last.text.slice(0, 120) } : null,
    lastLetter: attached && lastTitle ? { date: attached.date, title: lastTitle } : null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

// ===== 편지 붙이기 =====

type LetterRow = RecordRow & { content: string; contentType?: string };
const LETTER_FIELDS = "_id type userId title recipientName replyToId adoptedAt physicalLetterStats.totalRequests createdAt content contentType";

async function letterCards(userId: string, extra: object, limit: number) {
  const { sent, received, stories, adminIds } = await recordScopes(userId);
  const rows = await Letter.find({ $and: [{ $or: [sent, received, stories] }, extra] })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(LETTER_FIELDS)
    .lean<LetterRow[]>();
  await attachStoryTitles(rows);
  const admins = new Set(adminIds.map(String));
  return rows.map((r) => ({
    ...toRecordItem(r, userId, 0, admins),
    content: r.contentType === "html" ? extractPlainText(r.content) : r.content,
  }));
}

const isReceivedHeart = (c: { kind: string; flow: string }) => c.kind === "received" && c.flow === "heart";

/** 받은 마음 편지에만 replied(답장했는지)를 단다. 나머지 카드는 그대로 */
export function markReplied<T extends { _id: string; kind: string; flow: string }>(cards: T[], repliedIds: string[]): (T & { replied?: boolean })[] {
  const done = new Set(repliedIds);
  return cards.map((c) => (isReceivedHeart(c) ? { ...c, replied: done.has(c._id) } : c));
}

// ===== DB =====

/** 섹션 통째 교체 시 빠진 칸은 빈 값. 모르는 키는 버린다 */
const SECTION_DEFAULTS = {
  first: { owner: "", resolutions: [], word: "", toMe: "" },
  monthly: { events: [], memo: "" },
  goals: { goals: [], todos: [], habits: [], wishes: [] },
  letters: { quotes: [] },
  review: { good: [], regret: "", scene: "", toNext: "" },
};

const FORBIDDEN_LOCKED = "책으로 신청한 다이어리는 고칠 수 없어요.";

class DiaryService {
  async list(userId: string) {
    const rows = await Diary.find({ userId }).select("title month cover paper font sections status physical.status days createdAt updatedAt").sort({ month: -1 });
    // 최근 붙인 편지 제목: 권마다 한 통씩 모아 한 번에 조회(소유자 범위 안의 편지만 제목이 나온다)
    const ids = [...new Set(rows.map((d) => lastAttached(d)?.letterId).filter((x): x is string => !!x))];
    const cards = ids.length ? await letterCards(userId, { _id: { $in: ids } }, ids.length) : [];
    const titles = new Map(cards.map((c) => [String(c._id), c.title]));
    return rows.map((d) => toDiarySummary(d, titles));
  }

  async create(userId: string, input: Pick<IDiary, "title" | "month"> & Partial<Pick<IDiary, "cover" | "paper" | "font" | "sections">>) {
    try {
      return await Diary.create({ userId, ...input });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw new DiaryError(409, "이 달 다이어리는 이미 있어요.");
      throw e;
    }
  }

  private async own(userId: string, id: string) {
    const d = await Diary.findOne({ _id: id, userId });
    if (!d) throw new DiaryError(404, "다이어리를 찾을 수 없습니다.");
    // 옛 데이터 정규화: id 없는 습관에 id 를 붙여 바로 저장(다른 칸 검증과 상관없이 이 배열만)
    const habits = withHabitIds(d.goals.habits);
    if (habits) {
      await Diary.updateOne({ _id: d._id }, { $set: { "goals.habits": habits } });
      d.set("goals.habits", habits);
    }
    return d;
  }

  /** 본인 것 + 잠금 확인 후 고치고 저장 */
  private async edit(userId: string, id: string, mutate: (d: IDiary) => void | Promise<void>) {
    const d = await this.own(userId, id);
    if (isLocked(d)) throw new DiaryError(423, FORBIDDEN_LOCKED);
    await mutate(d);
    await d.save();
    return d;
  }

  /** 전체 + 붙인 편지 본문(소유자 범위 안의 편지만 풀어준다) */
  async withLetters(d: IDiary) {
    const ids = [...new Set(d.days.flatMap((x) => x.letters.map((l) => String(l.letterId))))];
    const attachedLetters = ids.length ? await letterCards(String(d.userId), { _id: { $in: ids } }, ids.length) : [];
    return { ...d.toObject(), attachedLetters };
  }

  async get(userId: string, id: string) {
    return this.withLetters(await this.own(userId, id));
  }

  async remove(userId: string, id: string) {
    const d = await this.own(userId, id);
    if (isLocked(d)) throw new DiaryError(423, FORBIDDEN_LOCKED);
    await d.deleteOne();
  }

  updateSettings(userId: string, id: string, input: Partial<Pick<IDiary, "title" | "cover" | "paper" | "font" | "sections">>) {
    return this.edit(userId, id, (d) => {
      for (const k of ["title", "cover", "paper", "font", "sections"] as const) if (input[k] !== undefined) d.set(k, input[k]);
    });
  }

  /** first|monthly|goals|letters|review 통째 교체 */
  setSection(userId: string, id: string, name: "first" | "monthly" | "goals" | "letters" | "review", value: object) {
    return this.edit(userId, id, (d) => {
      if (!d.sections.includes(name)) throw new DiaryError(400, "이 다이어리에 없는 구성입니다.");
      if (name === "monthly") {
        const events = (value as { events?: { date: string }[] }).events ?? [];
        if (events.some((e) => !dateInMonth(e.date, d.month))) throw new DiaryError(400, "이 달에 없는 날짜입니다.");
      }
      const base = SECTION_DEFAULTS[name];
      const v = value as Record<string, unknown>;
      if (name === "goals") {
        const habits = mergeHabits(d.goals.habits, (v.habits as { id: string; name: string }[] | undefined) ?? []);
        if (!habits) throw new DiaryError(400, "같은 습관이 두 번 있어요.");
        v.habits = habits;
      }
      d.set(name, Object.fromEntries(Object.keys(base).map((k) => [k, v[k] ?? base[k as keyof typeof base]])));
    });
  }

  /** 습관 한 칸(그 달 날짜). 지워진 습관이면 404 */
  async setHabitDay(userId: string, id: string, habitId: string, day: number, on: boolean) {
    const d = await this.own(userId, id);
    if (isLocked(d)) throw new DiaryError(423, FORBIDDEN_LOCKED);
    if (!d.sections.includes("goals")) throw new DiaryError(400, "이 다이어리에 없는 구성입니다.");
    if (day > daysIn(d.month)) throw new DiaryError(400, "이 달에 없는 날짜입니다.");
    const { update, arrayFilters } = habitDayUpdate(habitId, day, on);
    // 잠금 조건을 필터에 다시 넣어 읽은 뒤 신청돼도 쓰지 않는다
    const r = await Diary.updateOne({ _id: d._id, userId, status: "writing", "physical.status": { $in: ["none", "rejected"] }, "goals.habits.id": habitId }, update, { arrayFilters });
    if (!r.matchedCount) throw new DiaryError(404, "습관을 찾을 수 없어요.");
  }

  putWeek(userId: string, id: string, week: number, value: { plans: { date: string }[]; todos: object[]; line: string }) {
    return this.edit(userId, id, (d) => {
      if (!d.sections.includes("weekly")) throw new DiaryError(400, "이 다이어리에 없는 구성입니다.");
      if (week > weeksInMonth(d.month)) throw new DiaryError(400, "이 달에 없는 주입니다.");
      if (value.plans.some((p) => !dateInMonth(p.date, d.month) || weekOf(p.date) !== week)) throw new DiaryError(400, "이 주에 없는 날짜입니다.");
      const rest = d.weeks.filter((w) => w.week !== week);
      d.set("weeks", [...rest, { week, ...value }].sort((a, b) => a.week - b.week));
    });
  }

  putDay(userId: string, id: string, date: string, value: { weather: string | null; text: string; thanks: string; letters: { letterId: string; style: string }[] }) {
    return this.edit(userId, id, async (d) => {
      if (!d.sections.includes("daily")) throw new DiaryError(400, "이 다이어리에 없는 구성입니다.");
      if (!dateInMonth(date, d.month)) throw new DiaryError(400, "이 달에 없는 날짜입니다.");
      const ids = [...new Set(value.letters.map((l) => l.letterId))];
      if (ids.length !== value.letters.length) throw new DiaryError(400, "같은 편지를 두 번 붙일 수 없어요.");
      if (ids.length && (await letterCards(userId, { _id: { $in: ids }, createdAt: { $lt: monthEnd(d.month) } }, ids.length)).length !== ids.length) throw new DiaryError(400, "붙일 수 없는 편지입니다.");
      const rest = d.days.filter((x) => x.date !== date);
      const empty = !value.text.trim() && !value.thanks.trim() && !value.weather && !value.letters.length;
      d.set("days", (empty ? rest : [...rest, { date, ...value }]).sort((a, b) => a.date.localeCompare(b.date)));
      const decos = dropShrunkDecos(d.decos, date, value.text);
      if (decos.length !== d.decos.length) d.set("decos", decos);
    });
  }

  putDecos(userId: string, id: string, page: string, decos: object[]) {
    return this.edit(userId, id, (d) => {
      if (!isValidPageKey(page, d.month, d.sections)) throw new DiaryError(400, "이 다이어리에 없는 장입니다.");
      d.set("decos", [...d.decos.filter((x) => x.page !== page), ...decos.map((x) => ({ ...x, page }))]);
    });
  }

  /** 붙일 수 있는 편지: 내가 쓴 편지·사연, 받은 답장·마음 편지 중 그 달 말까지 쓰인 최근 50통 */
  async attachableLetters(userId: string, id: string) {
    const d = await this.own(userId, id);
    // ponytail: 최근 50통 고정. 더 필요하면 커서 페이지네이션
    const cards = await letterCards(userId, { createdAt: { $lt: monthEnd(d.month) } }, 50);
    // 받은 마음 편지에 내가 답장했는지(이 달의 편지 "아직 답장 못 한 편지")
    const heart = cards.filter(isReceivedHeart).map((c) => c._id);
    const replied = heart.length
      ? await Letter.distinct("replyToId", { userId: new mongoose.Types.ObjectId(userId), replyToId: { $in: heart }, status: { $ne: LetterStatus.DELETED } })
      : [];
    return markReplied(cards, replied.map(String));
  }

  async requestPhysical(userId: string, id: string, input: Pick<IDiary["physical"], "binding" | "copies" | "address">) {
    const d = await this.own(userId, id);
    if (d.physical.status !== "none" && d.physical.status !== "rejected") throw new DiaryError(409, "이미 신청한 다이어리입니다.");
    if (!hasContent(d)) throw new DiaryError(400, "쓴 장이 있어야 신청할 수 있어요.");
    const now = new Date();
    d.physical = { status: "requested", binding: input.binding, copies: input.copies, address: input.address, requestedAt: now, updatedAt: now };
    d.status = "closed";
    await d.save();
    return d.physical;
  }

  // ===== 관리자 =====
  listPhysical(status?: IDiary["physical"]["status"]) {
    const filter = status ? { "physical.status": status } : { "physical.status": { $ne: "none" as const } };
    return Diary.find(filter)
      .select("userId title month cover paper font sections status physical createdAt updatedAt")
      .populate("userId", "name realName email")
      .sort({ "physical.requestedAt": -1 })
      .limit(200)
      .lean();
  }

  async updatePhysical(id: string, input: { status?: IDiary["physical"]["status"]; notes?: string }) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new DiaryError(404, "다이어리를 찾을 수 없습니다.");
    const d = await Diary.findById(id);
    if (!d) throw new DiaryError(404, "다이어리를 찾을 수 없습니다.");
    if (input.status !== undefined) {
      const next = applyAdminPhysicalStatus(input.status);
      if (!next) throw new DiaryError(400, "신청 전 상태로 되돌릴 수 없습니다.");
      d.physical.status = input.status;
      if (next.status) d.status = next.status;
    }
    if (input.notes !== undefined) d.physical.notes = input.notes;
    d.physical.updatedAt = new Date();
    await d.save();
    return d.physical;
  }

  /** 인쇄 링크는 신청된 다이어리만 */
  async assertPrintable(id: string) {
    const d = await Diary.findById(id).select("physical.status");
    if (!d) throw new DiaryError(404, "다이어리를 찾을 수 없습니다.");
    if (d.physical.status === "none") throw new DiaryError(409, "책으로 받기 신청이 없는 다이어리입니다.");
  }

  /** 인쇄 열람: 배송지는 빼고 */
  async printView(id: string) {
    const d = await Diary.findById(id);
    if (!d) throw new DiaryError(404, "다이어리를 찾을 수 없습니다.");
    const v = await this.withLetters(d);
    const { address: _address, ...physical } = v.physical; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...v, physical };
  }
}

export default new DiaryService();
