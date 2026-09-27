import mongoose, { Schema, Document } from "mongoose";

export const DIARY_PAPERS = ["lined", "grid", "dot", "blank", "cream"] as const;
export const DIARY_FONTS = ["jangmi", "pen", "gaegu", "himelody"] as const;

export const DECO_TYPES = ["sticker", "tape", "label"] as const;

/** 데코 하나. x/y/w는 종이 폭 기준 % — 화면·인쇄 크기가 달라도 같은 자리 */
export interface IDiaryDeco {
  id: string;
  type: (typeof DECO_TYPES)[number];
  src: string; // 스티커 id / 마테 패턴 id / (label은 빈 문자열)
  x: number;
  y: number;
  w: number;
  rotate: number;
  z: number;
  text?: string;
  color?: string;
}

export interface IDiaryPage {
  date: string; // "YYYY-MM-DD"
  content: string; // Tiptap HTML
  decos: IDiaryDeco[];
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
          decos: {
            type: [
              {
                _id: false,
                id: { type: String, required: true },
                type: { type: String, enum: DECO_TYPES, required: true },
                src: { type: String, default: "" },
                x: { type: Number, required: true },
                y: { type: Number, required: true },
                w: { type: Number, required: true },
                rotate: { type: Number, default: 0 },
                z: { type: Number, default: 0 },
                text: { type: String, maxlength: 60 },
                color: { type: String, maxlength: 20 },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
    status: { type: String, enum: ["writing", "closed"], default: "writing" },
  },
  { timestamps: true },
);

export default mongoose.model<IDiary>("Diary", DiarySchema);
