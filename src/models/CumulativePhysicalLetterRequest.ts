import mongoose, { Schema, Document } from "mongoose";

// 누적 실물 편지 요청 상태
export enum CumulativeRequestStatus {
  REQUESTED = "requested",
  CONFIRMED = "confirmed",
  WRITING = "writing",
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

// 신청자 정보 인터페이스 (익명 가능)
export interface IRequesterInfo {
  sessionId: string;
  userAgent?: string;
  ipAddress?: string; // 해시 처리된 IP
  requestedAt: Date;
}

// 수신자 정보 인터페이스
export interface ICumulativeRecipientInfo {
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
  createdBy: string; // 관리자 ID
}

// CumulativePhysicalLetterRequest Document 인터페이스
export interface ICumulativePhysicalLetterRequest extends Document {
  letterId: mongoose.Types.ObjectId;

  // 신청자 정보 (익명 가능)
  requesterInfo: IRequesterInfo;

  // 수신자 정보
  recipientInfo: ICumulativeRecipientInfo;

  // 상태 관리
  status: CumulativeRequestStatus;

  // 비용 정보
  cost: ICostInfo;

  // 배송 정보
  shipping: IShippingInfo;

  // 관리자 메모
  adminNotes: IAdminNote[];

  // 타임스탬프
  createdAt: Date;
  updatedAt: Date;
}

// CumulativePhysicalLetterRequest 스키마
const CumulativePhysicalLetterRequestSchema = new Schema<ICumulativePhysicalLetterRequest>(
  {
    letterId: {
      type: Schema.Types.ObjectId,
      ref: "Letter",
      required: true,
      index: true,
    },

    // 신청자 정보 (익명 가능)
    requesterInfo: {
      sessionId: {
        type: String,
        required: true,
        index: true,
      },
      userAgent: {
        type: String,
        trim: true,
      },
      ipAddress: {
        type: String, // 해시 처리된 IP
        trim: true,
      },
      requestedAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },

    // 수신자 정보
    recipientInfo: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
        match: /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
        match: /^[0-9]{5}$/,
      },
      address1: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      address2: {
        type: String,
        trim: true,
        maxlength: 200,
      },
      memo: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    },

    // 상태 관리
    status: {
      type: String,
      enum: Object.values(CumulativeRequestStatus),
      default: CumulativeRequestStatus.REQUESTED,
      index: true,
    },

    // 비용 정보
    cost: {
      shippingCost: {
        type: Number,
        required: true,
        min: 0,
      },
      letterCost: {
        type: Number,
        default: 2000,
        min: 0,
      },
      totalCost: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    // 배송 정보
    shipping: {
      trackingNumber: {
        type: String,
        trim: true,
      },
      shippingCompany: {
        type: String,
        trim: true,
      },
      sentAt: {
        type: Date,
      },
      deliveredAt: {
        type: Date,
      },
    },

    // 관리자 메모
    adminNotes: [
      {
        note: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        createdBy: {
          type: String, // 관리자 ID
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret: any) {
        delete ret.__v;
        // 민감한 정보 제거
        if (ret.requesterInfo) {
          delete ret.requesterInfo.ipAddress;
        }
        return ret;
      },
    },
  }
);

// 복합 인덱스
CumulativePhysicalLetterRequestSchema.index({ letterId: 1, "requesterInfo.sessionId": 1 });
CumulativePhysicalLetterRequestSchema.index({ status: 1, createdAt: -1 });
CumulativePhysicalLetterRequestSchema.index({ "requesterInfo.requestedAt": -1 });

// 업데이트 시간 자동 갱신
CumulativePhysicalLetterRequestSchema.pre("save", function () {
  this.updatedAt = new Date();
});

// CumulativePhysicalLetterRequest 모델 생성 및 내보내기
const CumulativePhysicalLetterRequest = mongoose.model<ICumulativePhysicalLetterRequest>("CumulativePhysicalLetterRequest", CumulativePhysicalLetterRequestSchema);

export default CumulativePhysicalLetterRequest;
