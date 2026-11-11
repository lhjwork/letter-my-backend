import mongoose from "mongoose";
import Diary, { IDiary, DIARY_SECTIONS, DiarySection } from "../models/Diary";
import Letter from "../models/Letter";
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

/** 제본 신청 후·닫힌 다이어리는 읽기만 */
export function isLocked(d: { status: string; physical?: { status?: string } }): boolean {
  return d.status === "closed" || (d.physical?.status ?? "none") !== "none";
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

/** 일요일 시작 달력 기준 주 수(4~6) */
export function weeksInMonth(month: string): number {
  return Math.ceil((firstDow(month) + daysIn(month)) / 7);
}

/** 날짜가 그 달 몇째 주인지(1부터, 일요일 시작) */
export function weekOf(date: string): number {
  return Math.ceil((firstDow(date.slice(0, 7)) + Number(date.slice(8, 10))) / 7);
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

/** 쓴 흔적이 있어야 제본 신청 가능 */
export function hasContent(d: Pick<IDiary, "days" | "decos" | "monthly" | "weeks">): boolean {
  return d.days.some((x) => x.text.trim() || x.letters.length) || d.decos.length > 0 || d.monthly.events.length > 0 || d.weeks.length > 0;
}

/** 책장 카드: 본문 대신 날짜별 글자 수(쪽 수는 프런트 lib/diary-pages.ts 가 계산) */
export function toDiarySummary(d: IDiary) {
  const last = [...d.days].filter((x) => x.text.trim()).sort((a, b) => b.date.localeCompare(a.date))[0];
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
    days: d.days.map((x) => ({ date: x.date, chars: x.text.length, letters: x.letters.length })),
    lastDay: last ? { date: last.date, text: last.text.slice(0, 120) } : null,
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
    return rows.map(toDiarySummary);
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
      d.set(name, Object.fromEntries(Object.keys(base).map((k) => [k, v[k] ?? base[k as keyof typeof base]])));
    });
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
      if (ids.length && (await letterCards(userId, { _id: { $in: ids } }, ids.length)).length !== ids.length) throw new DiaryError(400, "붙일 수 없는 편지입니다.");
      const rest = d.days.filter((x) => x.date !== date);
      const empty = !value.text.trim() && !value.thanks.trim() && !value.weather && !value.letters.length;
      d.set("days", (empty ? rest : [...rest, { date, ...value }]).sort((a, b) => a.date.localeCompare(b.date)));
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
    return letterCards(userId, { createdAt: { $lt: monthEnd(d.month) } }, 50);
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
    if (input.status !== undefined) d.physical.status = input.status;
    if (input.notes !== undefined) d.physical.notes = input.notes;
    d.physical.updatedAt = new Date();
    await d.save();
    return d.physical;
  }

  async printView(id: string) {
    const d = await Diary.findById(id);
    if (!d) throw new DiaryError(404, "다이어리를 찾을 수 없습니다.");
    return this.withLetters(d);
  }
}

export default new DiaryService();
