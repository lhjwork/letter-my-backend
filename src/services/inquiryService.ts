import mongoose from "mongoose";
import Inquiry, { InquiryCategory, InquiryStatus } from "../models/Inquiry";
import { pagination } from "./noticeService";

type InquiryRow = {
  _id: unknown;
  userId?: unknown;
  category: string;
  title: string;
  content?: string;
  status: string;
  answer?: string;
  answeredAt?: Date;
  answeredBy?: unknown;
  createdAt: Date;
};

/** 사용자 응답: userId·answeredBy(관리자 id) 미노출. 순수 함수(테스트용) */
export function toMyInquiry(r: InquiryRow) {
  return {
    _id: String(r._id),
    category: r.category,
    title: r.title,
    ...(r.content !== undefined && { content: r.content }),
    status: r.status,
    ...(r.answer && { answer: r.answer, answeredAt: r.answeredAt }),
    createdAt: r.createdAt,
  };
}

/** 관리자 목록: 작성자는 닉네임만(이메일 없음). 순수 함수(테스트용) */
export function toAdminInquiryItem(r: InquiryRow) {
  const u = r.userId as { name?: string } | null;
  return { _id: String(r._id), category: r.category, title: r.title, status: r.status, nickname: u?.name || "탈퇴한 사용자", createdAt: r.createdAt, answeredAt: r.answeredAt };
}

class InquiryService {
  create(userId: string, input: { category: InquiryCategory; title: string; content: string }) {
    return Inquiry.create({ userId, category: input.category, title: input.title, content: input.content });
  }

  async listMine(userId: string) {
    // ponytail: 최근 100개만. 한 사람이 그 이상 쓰면 페이지네이션 추가
    const rows = await Inquiry.find({ userId }).sort({ createdAt: -1 }).limit(100).select("category title status createdAt").lean();
    return rows.map(toMyInquiry);
  }

  async getMine(userId: string, id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const r = await Inquiry.findOne({ _id: id, userId }).lean();
    return r ? toMyInquiry(r) : null;
  }

  async listForAdmin(status: InquiryStatus | undefined, page: number, limit: number, skip: number) {
    const filter = status ? { status } : {};
    const [rows, total] = await Promise.all([
      Inquiry.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).select("userId category title status createdAt answeredAt").populate("userId", "name").lean(),
      Inquiry.countDocuments(filter),
    ]);
    return { items: rows.map(toAdminInquiryItem), pagination: pagination(page, limit, total) };
  }

  async getForAdmin(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const r = await Inquiry.findById(id).populate("userId", "name email").populate("answeredBy", "name").lean();
    if (!r) return null;
    const u = r.userId as unknown as { _id?: unknown; name?: string; email?: string } | null;
    const a = r.answeredBy as unknown as { name?: string } | null;
    return {
      ...toAdminInquiryItem(r),
      content: r.content,
      answer: r.answer,
      answeredByName: a?.name,
      userId: u?._id ? String(u._id) : undefined,
      email: u?.email,
    };
  }

  async answer(id: string, adminId: string, answer: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Inquiry.findByIdAndUpdate(id, { answer, status: "answered", answeredAt: new Date(), answeredBy: adminId }, { new: true, runValidators: true }).lean();
  }
}

export default new InquiryService();
