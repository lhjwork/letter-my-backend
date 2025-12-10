import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILetter extends Document {
  title: string;
  content: string;
  authorName: string; // 사용자가 입력한 작성자 이름 (닉네임 등)
  userId: mongoose.Types.ObjectId; // 실제 로그인한 사용자 ID
  createdAt: Date;
  updatedAt: Date;
}

const LetterSchema = new Schema<ILetter>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

const Letter: Model<ILetter> = mongoose.model<ILetter>("Letter", LetterSchema);

export default Letter;
