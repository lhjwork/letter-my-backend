import mongoose, { Schema, Document } from "mongoose";

/** 사연 댓글. 한 줄 반응(100자). 채택·전달·익명 없음, 항상 닉네임. 삭제는 hard delete */
export const COMMENT_MAX = 100;

export interface IComment extends Document {
  letterId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    letterId: { type: Schema.Types.ObjectId, ref: "Letter", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: COMMENT_MAX },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CommentSchema.index({ letterId: 1, createdAt: 1 });

export default mongoose.model<IComment>("Comment", CommentSchema);
