import mongoose, { Schema, Document, Model } from "mongoose";

// OG 이미지 타입
export enum OgImageType {
  AUTO = "auto",
  CUSTOM = "custom",
}

// Letter Document 인터페이스
export interface ILetter extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  authorName: string;
  ogPreviewMessage: string;
  ogBgColor: string;
  ogIllustration: string;
  ogFontSize: number;
  ogImageType: OgImageType;
  ogImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Letter Model 인터페이스
interface ILetterModel extends Model<ILetter> {
  findByUserId(userId: string): Promise<ILetter[]>;
}

// Letter 스키마
const LetterSchema = new Schema<ILetter, ILetterModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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
    ogPreviewMessage: {
      type: String,
      default: "",
    },
    ogBgColor: {
      type: String,
      default: "#FFF5F5",
    },
    ogIllustration: {
      type: String,
      default: "💌",
    },
    ogFontSize: {
      type: Number,
      default: 48,
    },
    ogImageType: {
      type: String,
      enum: Object.values(OgImageType),
      default: OgImageType.AUTO,
    },
    ogImageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// userId로 편지 찾기 (Static 메서드)
LetterSchema.statics.findByUserId = function (userId: string): Promise<ILetter[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Letter 모델 생성 및 내보내기
const Letter = mongoose.model<ILetter, ILetterModel>("Letter", LetterSchema);

export default Letter;
