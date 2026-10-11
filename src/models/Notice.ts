import mongoose, { Schema, Document } from "mongoose";

/** 공지. 본문은 일반 텍스트(줄바꿈만). 서식 없음 */
export const NOTICE_TITLE_MAX = 100;
export const NOTICE_CONTENT_MAX = 5000;

export interface INotice extends Document {
  title: string;
  content: string;
  isPinned: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: NOTICE_TITLE_MAX },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: NOTICE_CONTENT_MAX },
    isPinned: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

NoticeSchema.index({ isPublished: 1, isPinned: -1, createdAt: -1 });

export default mongoose.model<INotice>("Notice", NoticeSchema);
