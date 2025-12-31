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

// 실물 편지 상태
export enum PhysicalLetterStatus {
  NONE = "none",
  REQUESTED = "requested",
  PROCESSING = "processing",
  WRITING = "writing",
  SENT = "sent",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

// 배송 주소 인터페이스
export interface IShippingAddress {
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  requestedAt: Date;
}

// 수신자 주소 인터페이스
export interface IRecipientAddress {
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
  addedAt: Date;
  // 실물 편지 신청 관련 필드
  isPhysicalRequested?: boolean;
  physicalRequestDate?: Date;
  physicalStatus?: "none" | "requested" | "approved" | "rejected" | "writing" | "sent" | "delivered";
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string; // 고유 신청 ID
  // 신청자 정보 (로그인 여부 상관없이)
  requesterId?: string; // userId (로그인 사용자) 또는 sessionId (익명 사용자)
  requesterType?: "authenticated" | "anonymous"; // 신청자 타입
  // 중복 확인용
  isDuplicate?: boolean; // 중복 신청 여부
  duplicateOf?: string; // 원본 requestId (중복인 경우)
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

// 작성자 설정 인터페이스
export interface IAuthorSettings {
  allowPhysicalRequests: boolean;
  autoApprove: boolean;
  maxRequestsPerPerson: number;
  requireApprovalMessage?: string;
}

// 실물 편지 통계 인터페이스
export interface IPhysicalLetterStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  completedRequests: number;
}

// Letter Document 인터페이스
export interface ILetter extends Document {
  type: LetterType;
  userId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  contentType: "text" | "html";
  plainContent?: string;
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
  // 실물 편지 관련
  physicalRequested: boolean;
  physicalRequestDate?: Date;
  physicalStatus: PhysicalLetterStatus;
  shippingAddress?: IShippingAddress;
  recipientAddresses: IRecipientAddress[];
  physicalNotes?: string;
  // 작성자 승인 시스템 관련
  physicalLetterStats: IPhysicalLetterStats;
  authorSettings: IAuthorSettings;
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
    contentType: {
      type: String,
      enum: ["text", "html"],
      default: "html",
    },
    plainContent: {
      type: String,
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
    // 실물 편지 관련
    physicalRequested: {
      type: Boolean,
      default: false,
    },
    physicalRequestDate: {
      type: Date,
    },
    physicalStatus: {
      type: String,
      enum: Object.values(PhysicalLetterStatus),
      default: PhysicalLetterStatus.NONE,
    },
    shippingAddress: {
      name: { type: String },
      phone: { type: String },
      zipCode: { type: String },
      address1: { type: String },
      address2: { type: String },
      requestedAt: { type: Date },
    },
    recipientAddresses: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        zipCode: { type: String, required: true },
        address1: { type: String, required: true },
        address2: { type: String },
        memo: { type: String },
        addedAt: { type: Date, default: Date.now },
        // 실물 편지 신청 관련 필드
        isPhysicalRequested: { type: Boolean, default: false },
        physicalRequestDate: { type: Date },
        physicalStatus: {
          type: String,
          enum: ["none", "requested", "approved", "rejected", "writing", "sent", "delivered"],
          default: "none",
        },
        sessionId: { type: String },
        userAgent: { type: String },
        ipAddress: { type: String },
        requestId: { type: String, unique: true, sparse: true }, // 고유 신청 ID
        // 신청자 정보
        requesterId: { type: String }, // userId 또는 sessionId
        requesterType: {
          type: String,
          enum: ["authenticated", "anonymous"],
          default: "anonymous",
        },
        // 중복 확인용
        isDuplicate: { type: Boolean, default: false },
        duplicateOf: { type: String }, // 원본 requestId
      },
    ],
    physicalNotes: {
      type: String,
    },
    // 실물 편지 통계
    physicalLetterStats: {
      totalRequests: { type: Number, default: 0 },
      pendingRequests: { type: Number, default: 0 },
      approvedRequests: { type: Number, default: 0 },
      rejectedRequests: { type: Number, default: 0 },
      completedRequests: { type: Number, default: 0 },
    },
    // 작성자 설정
    authorSettings: {
      allowPhysicalRequests: { type: Boolean, default: true },
      autoApprove: { type: Boolean, default: false },
      maxRequestsPerPerson: { type: Number, default: 5 },
      requireApprovalMessage: { type: String },
    },
    // AI 생성 관련 메타데이터
    aiMetadata: {
      titleGenerated: {
        type: Boolean,
        default: false,
      },
      titleGeneratedAt: Date,
      titleGenerationModel: String,
      generatedBy: {
        type: String,
        enum: ["frontend", "backend", "user"],
      },
      // 사연 카테고리 분류용
      confidence: Number,
      reason: String,
      tags: [String],
      classifiedAt: Date,
      model: String,
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
