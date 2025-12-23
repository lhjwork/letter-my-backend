import mongoose, { Schema, Document, Model } from "mongoose";

// Letter 타입
export enum LetterType {
  STORY = "story",
  FRIEND = "friend", // letter -> friend로 변경
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
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  HIDDEN = "hidden",
  DELETED = "deleted",
}

// OG 이미지 타입
export enum OgImageType {
  AUTO = "auto",
  CUSTOM = "custom",
}

// AI 메타데이터 인터페이스
export interface IAIMetadata {
  titleGenerated: boolean;
  titleGeneratedAt?: Date;
  titleGenerationModel?: string;
  generatedBy?: "frontend" | "backend" | "user";
  // 사연 카테고리 분류용
  confidence?: number;
  reason?: string;
  tags?: string[];
  classifiedAt?: Date;
  model?: string;
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
  // URL 공유 관련
  isPublic: boolean;
  shareableUrl: boolean;
  hiddenAt?: Date;
  hiddenReason?: string;
  deletedAt?: Date;
  ogTitle?: string;
  ogPreviewText?: string;
  ogBgColor: string;
  ogIllustration: string;
  ogFontSize: number;
  ogImageType: OgImageType;
  ogImageUrl?: string;
  // AI 생성 관련 메타데이터
  aiMetadata: IAIMetadata;
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
      default: LetterType.FRIEND,
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
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      trim: true,
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
      index: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    // URL 공유 관련
    isPublic: {
      type: Boolean,
      default: false, // 일반 편지는 기본적으로 비공개
      index: true,
    },
    shareableUrl: {
      type: Boolean,
      default: true,
    },
    ogTitle: {
      type: String,
      trim: true,
    },
    ogPreviewText: {
      type: String,
      trim: true,
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
    // AI 생성 관련 메타데이터
    aiMetadata: {
      titleGenerated: {
        type: Boolean,
        default: false,
      },
      titleGeneratedAt: Date,
      titleGenerationModel: String,
    },
    hiddenAt: Date,
    hiddenReason: String,
    deletedAt: Date,
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
LetterSchema.index({ userId: 1, createdAt: -1 }); // 내 편지 목록 조회 최적화
LetterSchema.index({ type: 1, isPublic: 1, createdAt: -1 }); // 공개 편지 조회 최적화
LetterSchema.index({ viewCount: -1 }); // 인기 편지 조회 최적화

// userId로 편지 찾기 (Static 메서드)
LetterSchema.statics.findByUserId = function (userId: string): Promise<ILetter[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Letter 모델 생성 및 내보내기
const Letter = mongoose.model<ILetter, ILetterModel>("Letter", LetterSchema);

export default Letter;
