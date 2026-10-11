import mongoose from "mongoose";
import Comment, { IComment } from "../models/Comment";
import Letter, { LetterStatus, LetterType } from "../models/Letter";

export const COMMENT_PAGE_LIMIT_MAX = 20;

export type PublicComment = { _id: string; nickname: string; content: string; createdAt: Date; isMine: boolean };

/** 본인 또는 관리자만 삭제. 순수 함수(테스트용) */
export function canDeleteComment(comment: { userId: unknown }, viewerId: string, isAdmin: boolean): boolean {
  return isAdmin || String(comment.userId) === viewerId;
}

/** 공개 응답: userId·이메일 미노출. 닉네임은 User.name 현재값(populate), 탈퇴 등으로 없으면 "익명" */
export function toPublicComment(c: { _id: unknown; userId: unknown; content: string; createdAt: Date }, viewerId?: string): PublicComment {
  const u = c.userId as { _id?: unknown; name?: string } | null;
  const uid = u && typeof u === "object" && "_id" in u ? String(u._id) : String(c.userId);
  return { _id: String(c._id), nickname: u?.name || "익명", content: c.content, createdAt: c.createdAt, isMine: !!viewerId && uid === viewerId };
}

class CommentService {
  async list(letterId: string, page: number, limit: number, viewerId?: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) throw new Error("올바르지 않은 편지 ID입니다.");
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      Comment.find({ letterId }).sort({ createdAt: 1, _id: 1 }).skip(skip).limit(limit).populate("userId", "name").lean(),
      Comment.countDocuments({ letterId }),
    ]);
    return { items: rows.map((r) => toPublicComment(r, viewerId)), total, hasNextPage: skip + rows.length < total };
  }

  async create(letterId: string, userId: string, content: string): Promise<IComment> {
    if (!mongoose.Types.ObjectId.isValid(letterId)) throw new Error("올바르지 않은 편지 ID입니다.");
    const story = await Letter.findById(letterId).select("type isPublic status").lean();
    if (!story || story.type !== LetterType.STORY || !story.isPublic || [LetterStatus.HIDDEN, LetterStatus.DELETED].includes(story.status)) {
      throw new Error("댓글을 남길 수 있는 사연을 찾을 수 없습니다.");
    }
    return Comment.create({ letterId, userId, content });
  }

  async remove(letterId: string, commentId: string, viewerId: string, isAdmin: boolean): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) throw new Error("올바르지 않은 댓글 ID입니다.");
    const comment = await Comment.findOne({ _id: commentId, letterId }).select("userId").lean();
    if (!comment) throw new Error("댓글을 찾을 수 없습니다.");
    if (!canDeleteComment(comment, viewerId, isAdmin)) throw new Error("댓글을 삭제할 권한이 없습니다.");
    await Comment.deleteOne({ _id: commentId });
  }

  count(letterId: string): Promise<number> {
    return Comment.countDocuments({ letterId });
  }
}

export default new CommentService();
