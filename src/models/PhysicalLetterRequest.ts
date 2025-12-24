import mongoose, { Schema, Document } from "mongoose";

// 실물 편지 요청 상태
export enum PhysicalRequestStatus {
  REQUESTED = "requested",
  CONFIRMED = "confirmed",
  WRITING = "writing",
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

// 수신자 정보 인터페이스
export interface IRecipientInfo {
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

// PhysicalLetterRequest Document 인터페이스
export interface IPhysicalLetterRequest extends Document {
  letterId: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  recipientInfo: IRecipientInfo;
  status: PhysicalRequestStatus;
  // 비용 정보
  shippingCost: number;
  letterCost: number;
  totalCost: number;
  // 배송 정보
  trackingNumber?: string;
  shippingCompany?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  // 관리자 정보
  adminNotes?: string;
  assignedAdmin?: mongoose.Types.ObjectId;
  // 타임스탬프
  requestedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// PhysicalLetterRequest 스키마
const PhysicalLetterRequestSchema = new Schema<IPhysicalLetterRequest>(
  {
    letterId: {
      type: Schema.Types.ObjectId,
      ref: "Letter",
      required: true,
      index: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientInfo: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      zipCode: { type: String, required: true, trim: true },
      address1: { type: String, required: true, trim: true },
      address2: { type: String, trim: true },
      memo: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: Object.values(PhysicalRequestStatus),
      default: PhysicalRequestStatus.REQUESTED,
      index: true,
    },
    // 비용 정보
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    letterCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 배송 정보
    trackingNumber: {
      type: String,
      trim: true,
    },
    shippingCompany: {
      type: String,
      trim: true,
    },
    estimatedDelivery: {
      type: Date,
    },
    actualDelivery: {
      type: Date,
    },
    // 관리자 정보
    adminNotes: {
      type: String,
      trim: true,
    },
    assignedAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // 타임스탬프
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    confirmedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
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
PhysicalLetterRequestSchema.index({ letterId: 1, requesterId: 1 });
PhysicalLetterRequestSchema.index({ status: 1, requestedAt: -1 });
PhysicalLetterRequestSchema.index({ assignedAdmin: 1, status: 1 });

// 업데이트 시간 자동 갱신
PhysicalLetterRequestSchema.pre("save", function () {
  this.updatedAt = new Date();
});

// PhysicalLetterRequest 모델 생성 및 내보내기
const PhysicalLetterRequest = mongoose.model<IPhysicalLetterRequest>("PhysicalLetterRequest", PhysicalLetterRequestSchema);

export default PhysicalLetterRequest;
