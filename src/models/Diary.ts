import mongoose, { Schema, Document } from "mongoose";

/** 다이어리 v2 (계획서 letter-community/docs/01-plan/diary-v2.plan.md). 1권 = 한 달 */
export const DIARY_COVERS = ["cream", "airmail", "kraft", "brick", "forest"] as const;
export const DIARY_PAPERS = ["lined", "grid", "dot", "blank"] as const;
export const DIARY_FONTS = ["jangmi", "pen", "gaegu", "himelody"] as const;
/** 순서 고정. 만들 때 부분집합을 고르고 저장은 늘 이 순서 */
export const DIARY_SECTIONS = ["first", "monthly", "goals", "weekly", "daily", "letters", "review"] as const;
export const DIARY_WEATHERS = ["sun", "cloud", "rain", "snow", "wind"] as const;
export const LETTER_STYLES = ["envelope", "note"] as const;
export const DECO_TYPES = ["sticker", "tape", "label"] as const;
export const DIARY_PHYSICAL_STATUS = ["none", "requested", "approved", "printing", "sent", "delivered", "rejected"] as const;
export const DIARY_BINDINGS = ["spring", "perfect"] as const;

export type DiarySection = (typeof DIARY_SECTIONS)[number];

export const DIARY_LIMITS = {
  title: 30,
  dayText: 3000, // 한 장 1,000자 × 하루 최대 3장
  dayThanks: 30,
  dayLetters: 5,
  decosPerPage: 20,
  eventsPerDay: 3,
  eventText: 20,
  memo: 200,
  itemText: 40, // 목표·할 일·바라는 것 한 줄
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface IDiaryDeco {
  id: string;
  page: string; // 페이지 키: first | monthly | goals | week-N | day-YYYY-MM-DD(-2|-3) | letters | review
  type: (typeof DECO_TYPES)[number];
  src: string;
  x: number; // x·y·w 는 종이 폭 기준 % — 화면·인쇄 크기가 달라도 같은 자리
  y: number;
  w: number;
  rotate: number;
  z: number;
  text?: string;
  color?: string;
}

export interface IDiaryPhysical {
  status: (typeof DIARY_PHYSICAL_STATUS)[number];
  binding: (typeof DIARY_BINDINGS)[number];
  copies: number;
  address?: { name: string; phone: string; zipCode: string; address1: string; address2?: string; memo?: string };
  requestedAt?: Date;
  updatedAt?: Date;
  notes?: string; // 관리자 메모 (사용자에게 노출)
}

type Check = { text: string; done: boolean };

export interface IDiaryDay {
  date: string;
  weather: (typeof DIARY_WEATHERS)[number] | null;
  text: string; // 서식 없는 일반 텍스트
  thanks: string;
  letters: { letterId: mongoose.Types.ObjectId; style: (typeof LETTER_STYLES)[number] }[];
}

/** 습관: id 는 안 바뀌는 식별자(프런트가 만들어 보낸다). 체크한 날은 PUT habits/:habitId/days/:day 로만 바뀐다 */
export interface IDiaryHabit {
  id: string;
  name: string;
  days: number[];
}

export interface IDiary extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  month: string;
  cover: (typeof DIARY_COVERS)[number];
  paper: (typeof DIARY_PAPERS)[number];
  font: (typeof DIARY_FONTS)[number];
  sections: DiarySection[];
  first: { owner: string; resolutions: string[]; word: string; toMe: string };
  monthly: { events: { date: string; text: string }[]; memo: string };
  goals: { goals: Check[]; todos: Check[]; habits: IDiaryHabit[]; wishes: string[] };
  weeks: { week: number; plans: { date: string; text: string }[]; todos: Check[]; line: string }[];
  days: IDiaryDay[];
  letters: { quotes: { text: string; by: string; date: string }[] };
  review: { good: string[]; regret: string; scene: string; toNext: string };
  decos: IDiaryDeco[];
  status: "writing" | "closed";
  physical: IDiaryPhysical;
  createdAt: Date;
  updatedAt: Date;
}

/** 페이지마다 데코 ≤20 */
export function decosPerPageOk(decos: { page: string }[]): boolean {
  const n = new Map<string, number>();
  for (const d of decos) {
    const c = (n.get(d.page) ?? 0) + 1;
    if (c > DIARY_LIMITS.decosPerPage) return false;
    n.set(d.page, c);
  }
  return true;
}

/** 먼슬리 일정 하루 ≤3 */
export function eventsPerDayOk(events: { date: string }[]): boolean {
  const n = new Map<string, number>();
  for (const e of events) {
    const c = (n.get(e.date) ?? 0) + 1;
    if (c > DIARY_LIMITS.eventsPerDay) return false;
    n.set(e.date, c);
  }
  return true;
}

const str = (max: number, trim = true) => ({ type: String, default: "", trim, maxlength: max }); // 여러 줄 글은 trim 안 함(들여쓰기·빈 줄 보존)
const list = <T>(item: T, max: number) => ({ type: [item], default: [], validate: { validator: (a: unknown[]) => a.length <= max, message: `${max}개까지입니다.` } });
const check = (max: number) => ({ _id: false, text: { type: String, required: true, trim: true, maxlength: max }, done: { type: Boolean, default: false } });
const dated = (max: number) => ({ _id: false, date: { type: String, required: true, match: DATE_RE }, text: { type: String, required: true, trim: true, maxlength: max } });

const DecoSchema = new Schema<IDiaryDeco>(
  {
    id: { type: String, required: true, maxlength: 40 },
    page: { type: String, required: true, maxlength: 20 },
    type: { type: String, enum: DECO_TYPES, required: true },
    src: { type: String, default: "", maxlength: 40 },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    rotate: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
    text: { type: String, maxlength: 60 },
    color: { type: String, maxlength: 20 },
  },
  { _id: false },
);

const DiarySchema = new Schema<IDiary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 50 }, // 모델은 v1 한도(50) — v1 긴 제목 문서도 저장되게. 새 입력은 라우트가 30자로 막는다
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    cover: { type: String, enum: DIARY_COVERS, default: "cream" },
    paper: { type: String, enum: DIARY_PAPERS, default: "lined" },
    font: { type: String, enum: DIARY_FONTS, default: "jangmi" },
    sections: {
      type: [{ type: String, enum: DIARY_SECTIONS }],
      default: () => [...DIARY_SECTIONS],
      validate: { validator: (a: string[]) => a.length > 0 && new Set(a).size === a.length, message: "구성을 하나 이상 골라주세요." },
    },
    first: {
      owner: str(20),
      resolutions: list({ type: String, trim: true, maxlength: 40 }, 3),
      word: str(10),
      toMe: str(60),
    },
    monthly: {
      events: { ...list(dated(DIARY_LIMITS.eventText), 31 * DIARY_LIMITS.eventsPerDay), validate: { validator: eventsPerDayOk, message: "일정은 하루 3개까지입니다." } },
      memo: str(DIARY_LIMITS.memo, false),
    },
    goals: {
      goals: list(check(DIARY_LIMITS.itemText), 5),
      todos: list(check(DIARY_LIMITS.itemText), 8),
      habits: list({ _id: false, id: { type: String, required: true, maxlength: 40 }, name: { type: String, required: true, trim: true, maxlength: 10 }, days: { type: [{ type: Number, min: 1, max: 31 }], default: [] } }, 4),
      wishes: list({ type: String, trim: true, maxlength: DIARY_LIMITS.itemText }, 4),
    },
    weeks: list(
      { _id: false, week: { type: Number, required: true, min: 1, max: 6 }, plans: list(dated(30), 21), todos: list(check(DIARY_LIMITS.itemText), 4), line: str(40) },
      6,
    ),
    days: list(
      {
        _id: false,
        date: { type: String, required: true, match: DATE_RE },
        weather: { type: String, enum: DIARY_WEATHERS, default: null }, // null = 안 고름(enum 검사 건너뜀)
        text: str(DIARY_LIMITS.dayText, false),
        thanks: str(DIARY_LIMITS.dayThanks),
        letters: list({ _id: false, letterId: { type: Schema.Types.ObjectId, ref: "Letter", required: true }, style: { type: String, enum: LETTER_STYLES, default: "envelope" } }, DIARY_LIMITS.dayLetters),
      },
      31,
    ),
    letters: {
      quotes: list({ _id: false, text: { type: String, required: true, trim: true, maxlength: 60 }, by: str(20), date: { type: String, default: "" } }, 4),
    },
    review: {
      good: list({ type: String, trim: true, maxlength: 40 }, 3),
      regret: str(60),
      scene: str(40),
      toNext: str(300, false),
    },
    decos: {
      type: [DecoSchema],
      default: [],
      validate: { validator: decosPerPageOk, message: "데코는 페이지당 20개까지입니다." },
    },
    status: { type: String, enum: ["writing", "closed"], default: "writing" },
    physical: {
      status: { type: String, enum: DIARY_PHYSICAL_STATUS, default: "none" },
      binding: { type: String, enum: DIARY_BINDINGS, default: "spring" },
      copies: { type: Number, default: 1, min: 1, max: 5 },
      address: {
        name: { type: String },
        phone: { type: String },
        zipCode: { type: String },
        address1: { type: String },
        address2: { type: String },
        memo: { type: String },
      },
      requestedAt: { type: Date },
      updatedAt: { type: Date },
      notes: { type: String, maxlength: 500 },
    },
  },
  { timestamps: true },
);

DiarySchema.index({ userId: 1, month: 1 }, { unique: true }); // 월 1권
DiarySchema.index({ "physical.status": 1, "physical.requestedAt": -1 });

export default mongoose.model<IDiary>("Diary", DiarySchema);
