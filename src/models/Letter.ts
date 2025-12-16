import mongoose, { Schema, Document, Model } from "mongoose";

// Letter 타입
export enum LetterType {
  STORY = "story",
  LETTER = "letter",
}

// Letter 카테고리
export enum LetterCategory {
  FAMILY = "가족",
  LOVE = "사랑",
  FRIENDSHIP = "우정",
  GROWTH = "성장",
  COMFORT = "위로",
  MEMORY = "추억",
  GRATITUDE = "감사",
  OTHER = "기타",
}

// Letter 상태
export enum LetterStatus {
  CREATED = "created",
  PUBLISHED = "published",
}

// OG 이미지 타입
export enum OgImageType {
  AUTO = "auto",
  CUSTOM = "custom",
}

// Letter Document 인터페이스
export interface ILetter extends Document {
  type: LetterType;
  userId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  authorName: string;
  category: LetterCategory;
  status: LetterStatus;
  viewCount: number;
  likeCount: number;
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
    type: {
      type: String,
      enum: Object.values(LetterType),
      default: LetterType.LETTER,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    category: {
      type: String,
      enum: Object.values(LetterCategory),
      default: LetterCategory.OTHER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(LetterStatus),
      default: LetterStatus.CREATED,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
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

// 복합 인덱스
LetterSchema.index({ type: 1, createdAt: -1 });
LetterSchema.index({ type: 1, category: 1, createdAt: -1 });

// userId로 편지 찾기 (Static 메서드)
LetterSchema.statics.findByUserId = function (userId: string): Promise<ILetter[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Letter 모델 생성 및 내보내기
const Letter = mongoose.model<ILetter, ILetterModel>("Letter", LetterSchema);

export default Letter;
