import mongoose from "mongoose";
import Notice from "../models/Notice";

/** page/limit 쿼리 정리. 순수 함수(테스트용) */
export function parsePaging(query: { page?: unknown; limit?: unknown }, defLimit = 20, maxLimit = 50) {
  const page = Math.max(1, parseInt(String(query.page)) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit)) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export type NoticeInput = { title?: string; content?: string; isPinned?: boolean; isPublished?: boolean };

/** 허용 필드만 남김. 순수 함수(테스트용) */
export function pickNoticeInput(body: Record<string, unknown>): NoticeInput {
  const out: NoticeInput = {};
  if (typeof body.title === "string") out.title = body.title;
  if (typeof body.content === "string") out.content = body.content;
  if (typeof body.isPinned === "boolean") out.isPinned = body.isPinned;
  if (typeof body.isPublished === "boolean") out.isPublished = body.isPublished;
  return out;
}

const SORT = { isPinned: -1, createdAt: -1, _id: -1 } as const;

class NoticeService {
  async listPublic(page: number, limit: number, skip: number) {
    const filter = { isPublished: true };
    const [items, total] = await Promise.all([
      Notice.find(filter).sort(SORT).skip(skip).limit(limit).select("title isPinned createdAt").lean(),
      Notice.countDocuments(filter),
    ]);
    return { items, pagination: pagination(page, limit, total) };
  }

  getPublic(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Notice.findOne({ _id: id, isPublished: true }).select("title content isPinned createdAt updatedAt").lean();
  }

  async listAll(page: number, limit: number, skip: number) {
    const [items, total] = await Promise.all([
      Notice.find().sort(SORT).skip(skip).limit(limit).select("title isPinned isPublished createdAt updatedAt").lean(),
      Notice.countDocuments(),
    ]);
    return { items, pagination: pagination(page, limit, total) };
  }

  get(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Notice.findById(id).lean();
  }

  create(input: NoticeInput) {
    return Notice.create(input);
  }

  update(id: string, input: NoticeInput) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Notice.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean();
  }

  async remove(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    return !!(await Notice.findByIdAndDelete(id));
  }
}

export default new NoticeService();
