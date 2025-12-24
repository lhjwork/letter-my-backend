import mongoose, { Document, Schema } from "mongoose";

// 신청 상태 enum
export enum RequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  WRITING = "writing",
  SENT = "sent",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

// 신청자 정보 인터페이스
export interface IRequesterInfo {
  sessionId: string;
  userAgent?: string;
  ipAddress?: string;
  requestedAt: Date;
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

// 비용 정보 인터페이스
export interface ICostInfo {
  shippingCost: number;
  letterCost: number;
  totalCost: number;
}

// 작성자 승인 정보 인터페이스
export interface IAuthorApproval {
  isApproved: boolean;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
}

// 배송 정보 인터페이스
export interface IShippingInfo {
  trackingNumber?: string;
  shippingCompany?: string;
  sentAt?: Date;
  deliveredAt?: Date;
}

// 관리자 메모 인터페이스
export interface IAdminNote {
  note: string;
  createdAt: Date;
  createdBy: string;
}

// 메인 인터페이스
export interface IAuthorApprovalPhysicalRequest extends Document {
  letterId: mongoose.Types.ObjectId;
  requesterInfo: IRequesterInfo;
  recipientInfo: IRecipientInfo;
  cost: ICostInfo;
  status: RequestStatus;
  authorApproval: IAuthorApproval;
  shipping: IShippingInfo;
  adminNotes: IAdminNote[];
  createdAt: Date;
  updatedAt: Date;
}

// 스키마 정의
const authorApprovalPhysicalRequestSchema = new Schema<IAuthorApprovalPhysicalRequest>({
  // 기본 정보
  letterId: {
    type: Schema.Types.ObjectId,
    ref: "Letter",
    required: true,
    index: true,
  },

  // 신청자 정보 (익명 가능)
  requesterInfo: {
    sessionId: { type: String, required: true },
    userAgent: { type: String },
    ipAddress: { type: String }, // 해시 처리된 IP
    requestedAt: { type: Date, default: Date.now },
  },

  // 수신자 정보
  recipientInfo: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true },
    address1: { type: String, required: true, trim: true },
    address2: { type: String, trim: true },
    memo: { type: String, trim: true },
  },

  // 비용 정보
  cost: {
    shippingCost: { type: Number, required: true },
    letterCost: { type: Number, default: 2000 },
    totalCost: { type: Number, required: true },
  },

  // 승인 및 상태 관리
  status: {
    type: String,
    enum: Object.values(RequestStatus),
    default: RequestStatus.PENDING,
  },

  // 작성자 승인 정보
  authorApproval: {
    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
  },

  // 배송 정보 (승인 후에만 사용)
  shipping: {
    trackingNumber: { type: String },
    shippingCompany: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
  },

  // 관리자 메모
  adminNotes: [
    {
      note: { type: String },
      createdAt: { type: Date, default: Date.now },
      createdBy: { type: String },
    },
  ],

  // 타임스탬프
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 인덱스 설정
authorApprovalPhysicalRequestSchema.index({ letterId: 1, status: 1 });
authorApprovalPhysicalRequestSchema.index({ "authorApproval.isApproved": 1 });
authorApprovalPhysicalRequestSchema.index({ createdAt: -1 });
authorApprovalPhysicalRequestSchema.index({ "requesterInfo.sessionId": 1, letterId: 1 });

export default mongoose.model<IAuthorApprovalPhysicalRequest>("AuthorApprovalPhysicalRequest", authorApprovalPhysicalRequestSchema);
