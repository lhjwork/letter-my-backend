import mongoose from "mongoose";
import Letter, { LetterStatus, LetterType } from "../models/Letter";
import User from "../models/User";
import { isAdminEmail } from "../utils/adminUser";

/**
 * 마이페이지 "내 기록" — 보낸 편지(마음 편지·답장) / 받은 편지(저장한 마음 편지·내 사연에 온 레터의 답장·채택된 답장) / 나의 사연.
 * 모두 Letter 컬렉션이라 $or 한 번으로 최신순 목록을 만든다.
 */
export const RECORD_TABS = ["all", "sent", "received", "stories"] as const;
export const RECORD_FLOWS = ["all", "story", "heart"] as const;
export type RecordTab = (typeof RECORD_TABS)[number];
export type RecordFlow = (typeof RECORD_FLOWS)[number];

type Kind = "sent" | "received" | "story";
type Tone = "blue" | "green" | "brick" | "muted";

export interface RecordRow {
  _id: mongoose.Types.ObjectId | string;
  type: string;
  userId?: mongoose.Types.ObjectId | string;
  title: string;
  recipientName?: string;
  replyToId?: mongoose.Types.ObjectId | string | null;
  /** 답장이면 원래 사연 제목 (서비스가 붙인다) */
  storyTitle?: string;
  adoptedAt?: Date | null;
  physicalRequested?: boolean;
  physicalLetterStats?: { totalRequests?: number };
  createdAt: Date | string;
}

export interface RecordItem {
  _id: string;
  kind: Kind;
  flow: "story" | "heart";
  label: string;
  badge: { text: string; tone: Tone } | null;
  recipientName?: string;
  title: string;
  /** 답장이면 원래 사연 제목(우편함 "받은 답장" 카드가 길이에 맞춰 자른다) */
  storyTitle?: string;
  /** 받은 답장을 실물 편지로 신청했는지(신청은 사연자 본인만 가능) */
  physical?: boolean;
  createdAt: string;
}

/** 카드 머리 구분·배지. 보드 v8-MyPage 카드 문구 그대로 */
/** adminIds: 레터(관리자) 계정 id. 내 사연에 레터가 쓴 답장은 채택 전에도 받은 편지 */
export function toRecordItem(row: RecordRow, userId: string, replyCount = 0, adminIds: Set<string> = new Set()): RecordItem {
  const mine = String(row.userId) === userId;
  const isReply = !!row.replyToId;
  const kind: Kind = row.type === LetterType.STORY ? "story" : mine ? "sent" : "received";
  const flow = row.type === LetterType.STORY || isReply ? "story" : "heart";

  let title = row.title;
  let physical: boolean | undefined;
  let label: string;
  let badge: RecordItem["badge"];
  if (kind === "story") {
    label = "나의 사연";
    badge = replyCount > 0 ? { text: `답장 ${replyCount}`, tone: "green" } : { text: "답장 기다림", tone: "brick" };
  } else if (isReply) {
    if (kind === "sent") {
      label = "보낸 · 답장";
      badge = row.adoptedAt ? { text: "채택", tone: "green" } : { text: "검토 중", tone: "muted" };
      if (row.storyTitle) title = `‘${row.storyTitle}’에 쓴 답장`;
    } else {
      label = "받은 · 사연 답장";
      badge = adminIds.has(String(row.userId)) ? { text: "레터의 답장", tone: "brick" } : { text: "채택", tone: "green" };
      if (row.storyTitle) title = `‘${row.storyTitle}’에 온 답장`;
      physical = (row.physicalLetterStats?.totalRequests ?? 0) > 0;
    }
  } else if (kind === "sent") {
    label = "보낸 · 마음 편지";
    const physical = row.physicalRequested || (row.physicalLetterStats?.totalRequests ?? 0) > 0;
    badge = physical ? { text: "실물 신청됨", tone: "green" } : null; // 링크 공유 여부는 추적하지 않아 배지 없음
  } else {
    label = "받은 · 마음 편지";
    badge = null; // 받은 편지는 늘 읽은 상태라 배지가 정보가 없다
  }

  return {
    _id: String(row._id),
    kind,
    flow,
    label,
    badge,
    recipientName: row.recipientName || undefined,
    title,
    storyTitle: isReply ? row.storyTitle : undefined,
    physical,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

const OWN = { $ne: LetterStatus.DELETED };
const VISIBLE = { $nin: [LetterStatus.HIDDEN, LetterStatus.DELETED] };

class MyRecordsService {
  async getMyRecords(userId: string, opts: { tab: RecordTab; flow: RecordFlow; limit: number }) {
    const me = new mongoose.Types.ObjectId(userId);
    const [myStoryIds, adminIds] = await Promise.all([
      Letter.find({ userId: me, type: LetterType.STORY, status: OWN }).distinct("_id"),
      process.env.ADMIN_EMAIL
        ? User.find({ email: process.env.ADMIN_EMAIL.toLowerCase() }).select("_id email").lean().then((us) => us.filter((u) => isAdminEmail(u.email)).map((u) => u._id))
        : Promise.resolve([] as mongoose.Types.ObjectId[]),
    ]);

    const sent = { userId: me, type: LetterType.FRIEND, status: OWN };
    const received = {
      userId: { $ne: me },
      status: VISIBLE,
      $or: [
        { type: LetterType.FRIEND, replyToId: null, "savedBy.userId": me },
        { replyToId: { $in: myStoryIds }, $or: [{ adoptedAt: { $ne: null } }, { userId: { $in: adminIds } }] },
      ],
    };
    const stories = { userId: me, type: LetterType.STORY, status: OWN };
    const byTab = { sent, received, stories, all: { $or: [sent, received, stories] } }[opts.tab];

    const byFlow =
      opts.flow === "story"
        ? { $or: [{ type: LetterType.STORY }, { replyToId: { $ne: null } }] }
        : opts.flow === "heart"
          ? { type: LetterType.FRIEND, replyToId: null }
          : {};
    const query = { $and: [byTab, byFlow] };

    const [rows, total, sentN, receivedN, physicalN] = await Promise.all([
      Letter.find(query)
        .sort({ createdAt: -1 })
        .limit(opts.limit)
        .select("_id type userId title recipientName replyToId adoptedAt physicalRequested physicalLetterStats.totalRequests createdAt")
        .lean<RecordRow[]>(),
      Letter.countDocuments(query),
      Letter.countDocuments(sent),
      Letter.countDocuments(received),
      Letter.countDocuments({ userId: me, status: OWN, $or: [{ physicalRequested: true }, { "physicalLetterStats.totalRequests": { $gt: 0 } }] }),
    ]);

    // 나의 사연 카드 "답장 N". 숨김·삭제 답장은 세지 않는다
    const storyIds = rows.filter((r) => r.type === LetterType.STORY).map((r) => r._id);
    const adminSet = new Set(adminIds.map(String));
    // 답장 카드 제목 "‘사연 제목’에 쓴 답장"(내가 쓴) / "‘사연 제목’에 온 답장"(받은)
    const myReplyTargets = rows.filter((r) => r.replyToId).map((r) => r.replyToId!);
    const storyTitles = myReplyTargets.length ? await Letter.find({ _id: { $in: myReplyTargets } }).select("title").lean() : [];
    const titleMap = new Map(storyTitles.map((t) => [String(t._id), t.title]));
    for (const r of rows) if (r.replyToId) r.storyTitle = titleMap.get(String(r.replyToId));
    const replyCounts = storyIds.length
      ? await Letter.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
          { $match: { replyToId: { $in: storyIds }, status: VISIBLE } },
          { $group: { _id: "$replyToId", n: { $sum: 1 } } },
        ])
      : [];
    const replyMap = new Map(replyCounts.map((c) => [String(c._id), c.n]));

    return {
      data: rows.map((r) => toRecordItem(r, userId, replyMap.get(String(r._id)) ?? 0, adminSet)),
      total,
      counts: { sent: sentN, received: receivedN, stories: myStoryIds.length, physical: physicalN },
    };
  }
}

export default new MyRecordsService();
