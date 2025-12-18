import mongoose, { Schema, Document, Model } from "mongoose";

// Address Document 인터페이스
export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId;
  addressName: string; // 배송지명 (집, 회사 등)
  recipientName: string; // 수령인
  zipCode: string; // 우편번호
  address: string; // 기본주소
  addressDetail?: string; // 상세주소
  phone: string; // 휴대전화
  tel?: string; // 연락처 (선택)
  isDefault: boolean; // 기본 배송지 여부
  isFromRecent: boolean; // 최근 배송지에서 저장된 것인지
  lastUsedAt?: Date; // 마지막 사용일
  createdAt: Date;
  updatedAt: Date;
}

// Address Model 인터페이스
interface IAddressModel extends Model<IAddress> {
  findByUserId(userId: string): Promise<IAddress[]>;
  findRecentByUserId(userId: string, limit?: number): Promise<IAddress[]>;
  findDefaultByUserId(userId: string): Promise<IAddress | null>;
}

// Address 스키마
const AddressSchema = new Schema<IAddress, IAddressModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    addressName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    zipCode: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    addressDetail: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    tel: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isFromRecent: {
      type: Boolean,
      default: false,
    },
    lastUsedAt: {
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
AddressSchema.index({ userId: 1, isDefault: -1 });
AddressSchema.index({ userId: 1, lastUsedAt: -1 });
AddressSchema.index({ userId: 1, isFromRecent: 1 });

// userId로 배송지 목록 조회 (Static 메서드)
AddressSchema.statics.findByUserId = function (userId: string): Promise<IAddress[]> {
  return this.find({ userId, isFromRecent: false }).sort({ isDefault: -1, createdAt: -1 });
};

// 최근 배송지 조회 (Static 메서드) - 최대 20개
AddressSchema.statics.findRecentByUserId = function (userId: string, limit = 20): Promise<IAddress[]> {
  return this.find({ userId }).sort({ lastUsedAt: -1 }).limit(limit);
};

// 기본 배송지 조회 (Static 메서드)
AddressSchema.statics.findDefaultByUserId = function (userId: string): Promise<IAddress | null> {
  return this.findOne({ userId, isDefault: true });
};

const Address = mongoose.model<IAddress, IAddressModel>("Address", AddressSchema);

export default Address;
