import mongoose, { Schema, Document } from "mongoose";

/** 1:1 문의. 로그인 사용자만, 관리자 답변 1개(수정 가능) */
export const INQUIRY_CATEGORIES = ["서비스 이용", "실물 편지", "계정", "기타"] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];
export const INQUIRY_STATUSES = ["open", "answered"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export const INQUIRY_TITLE_MAX = 100;
export const INQUIRY_CONTENT_MAX = 2000;
export const INQUIRY_ANSWER_MAX = 3000;

export interface IInquiry extends Document {
  userId: mongoose.Types.ObjectId;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  answer?: string;
  answeredAt?: Date;
  answeredBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: INQUIRY_CATEGORIES, required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: INQUIRY_TITLE_MAX },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: INQUIRY_CONTENT_MAX },
    status: { type: String, enum: INQUIRY_STATUSES, default: "open" },
    answer: { type: String, trim: true, maxlength: INQUIRY_ANSWER_MAX },
    answeredAt: Date,
    answeredBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

InquirySchema.index({ userId: 1, createdAt: -1 });
InquirySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IInquiry>("Inquiry", InquirySchema);
