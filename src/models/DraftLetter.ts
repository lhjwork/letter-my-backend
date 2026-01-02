import mongoose, { Schema, Document, Model } from "mongoose";

// Draft Letter 상태
export enum DraftStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  DELETED = "deleted",
}

// Draft Letter 타입
export enum DraftType {
  FRIEND = "friend",
  STORY = "story",
}

// 수신자 주소 인터페이스 (임시저장용)
export interface IDraftRecipientAddress {
  name?: string;
  phone?: string;
  zipCode?: string;
  address1?: string;
  address2?: string;
  memo?: string;
}

// Draft Letter Document 인터페이스
export interface IDraftLetter extends Document {
  // 기본 정보
  authorId: mongoose.Types.ObjectId;

  // 편지 내용
  title: string;
  content: string;

  // 편지 설정
  type: DraftType;
  category: string;

  // 자동 제목 (제목이 없을 때 내용 기반 생성)
  autoTitle: string;

  // 메타데이터
  wordCount: number;

  // 수신자 주소 (임시저장 시에도 포함 가능)
  recipientAddresses: IDraftRecipientAddress[];

  // 상태 관리
  status: DraftStatus;

  // 저장 정보
  saveCount: number;
  lastSavedAt: Date;

  // 발행 정보 (draft → published 시)
  publishedAt?: Date;
  publishedLetterId?: mongoose.Types.ObjectId;

  // 타임스탬프
  createdAt: Date;
  updatedAt: Date;
}

// Draft Letter Model 인터페이스
interface IDraftLetterModel extends Model<IDraftLetter> {
  findByAuthorId(authorId: string): Promise<IDraftLetter[]>;
}

// Draft Letter 스키마
const DraftLetterSchema = new Schema<IDraftLetter, IDraftLetterModel>(
  {
    // 작성자 정보
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 편지 내용
    title: {
      type: String,
      default: "",
      maxlength: 200,
      trim: true,
    },
    content: {
      type: String,
      default: "",
      maxlength: 10000,
    },

    // 편지 설정
    type: {
      type: String,
      enum: Object.values(DraftType),
      default: DraftType.FRIEND,
    },
    category: {
      type: String,
      default: "기타",
    },

    // 자동 제목
    autoTitle: {
      type: String,
      default: "",
    },

    // 메타데이터
    wordCount: {
      type: Number,
      default: 0,
    },

    // 수신자 주소
    recipientAddresses: [
      {
        name: { type: String },
        phone: { type: String },
        zipCode: { type: String },
        address1: { type: String },
        address2: { type: String },
        memo: { type: String },
      },
    ],

    // 상태 관리
    status: {
      type: String,
      enum: Object.values(DraftStatus),
      default: DraftStatus.DRAFT,
      index: true,
    },

    // 저장 정보
    saveCount: {
      type: Number,
      default: 1,
    },
    lastSavedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // 발행 정보
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedLetterId: {
      type: Schema.Types.ObjectId,
      ref: "Letter",
      default: null,
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
DraftLetterSchema.index({ authorId: 1, status: 1, lastSavedAt: -1 });
DraftLetterSchema.index({ authorId: 1, createdAt: -1 });

// 자동 제목 생성 및 단어 수 계산 미들웨어
DraftLetterSchema.pre("save", function () {
  // 제목이 없고 내용이 있으면 자동 제목 생성
  if (!this.title && this.content) {
    const plainText = this.content.replace(/<[^>]*>/g, ""); // HTML 태그 제거
    this.autoTitle = plainText.substring(0, 30) + (plainText.length > 30 ? "..." : "");
  }

  // 단어 수 계산
  const plainText = this.content.replace(/<[^>]*>/g, "");
  this.wordCount = plainText.length;

  // 업데이트 시간 갱신
  this.updatedAt = new Date();
  this.lastSavedAt = new Date();
});

// authorId로 임시저장 찾기 (Static 메서드)
DraftLetterSchema.statics.findByAuthorId = function (authorId: string): Promise<IDraftLetter[]> {
  return this.find({ authorId, status: DraftStatus.DRAFT }).sort({ lastSavedAt: -1 });
};

// Draft Letter 모델 생성 및 내보내기
const DraftLetter = mongoose.model<IDraftLetter, IDraftLetterModel>("DraftLetter", DraftLetterSchema);

export default DraftLetter;
