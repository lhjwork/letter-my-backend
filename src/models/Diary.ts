import mongoose, { Schema, Document } from "mongoose";

export const DIARY_PAPERS = ["lined", "grid", "dot", "blank", "cream"] as const;
export const DIARY_FONTS = ["jangmi", "pen", "gaegu", "himelody"] as const;

export interface IDiaryPage {
  date: string; // "YYYY-MM-DD"
  content: string; // Tiptap HTML
}

export interface IDiary extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  month: string; // "YYYY-MM" — 다이어리 1권 = 한 달
  paper: (typeof DIARY_PAPERS)[number];
  font: (typeof DIARY_FONTS)[number];
  pages: IDiaryPage[];
  status: "writing" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const DiarySchema = new Schema<IDiary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 50 },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    paper: { type: String, enum: DIARY_PAPERS, default: "lined" },
    font: { type: String, enum: DIARY_FONTS, default: "jangmi" },
    pages: {
      type: [
        {
          _id: false,
          date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
          content: { type: String, default: "" },
        },
      ],
      default: [],
    },
    status: { type: String, enum: ["writing", "closed"], default: "writing" },
  },
  { timestamps: true },
);

export default mongoose.model<IDiary>("Diary", DiarySchema);
