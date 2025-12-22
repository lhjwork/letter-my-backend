import mongoose, { Schema, Document, Model, Types } from "mongoose";

// OAuth Provider 타입
export enum OAuthProvider {
  INSTAGRAM = "instagram",
  NAVER = "naver",
  KAKAO = "kakao",
}

// User 상태 (Admin에서 관리)
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DELETED = "deleted",
}

// OAuth Account 인터페이스
export interface IOAuthAccount {
  provider: OAuthProvider;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  profile?: {
    email?: string;
    name?: string;
    image?: string;
    [key: string]: any;
  };
}

// Address 인터페이스
export interface IAddress {
  _id: Types.ObjectId;
  addressName: string;
  recipientName: string;
  zipCode: string;
  address: string;
  addressDetail?: string;
  phone: string;
  tel?: string;
  isDefault: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
}

// User Document 인터페이스
export interface IUser extends Document {
  email: string;
  name: string;
  image?: string;
  emailVerified?: Date;
  oauthAccounts: IOAuthAccount[];
  addresses: IAddress[];
  status: UserStatus;
  inactiveAt?: Date;
  inactiveReason?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;

  // 메서드
  addOAuthAccount(account: IOAuthAccount): Promise<IUser>;
  removeOAuthAccount(provider: OAuthProvider): Promise<IUser>;
  getOAuthAccount(provider: OAuthProvider): IOAuthAccount | undefined;
}

// User Model 인터페이스
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByOAuthProvider(provider: OAuthProvider, providerId: string): Promise<IUser | null>;
}

// OAuth Account 스키마
const OAuthAccountSchema = new Schema<IOAuthAccount>(
  {
    provider: {
      type: String,
      enum: Object.values(OAuthProvider),
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    accessToken: String,
    refreshToken: String,
    tokenExpiresAt: Date,
    profile: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

// Address 스키마 (User에 임베딩)
const AddressSchema = new Schema<IAddress>(
  {
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
    lastUsedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// User 스키마
const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
    },
    emailVerified: {
      type: Date,
    },
    oauthAccounts: {
      type: [OAuthAccountSchema],
      default: [],
    },
    addresses: {
      type: [AddressSchema],
      default: [],
    },
    lastLoginAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      index: true,
    },
    inactiveAt: Date,
    inactiveReason: String,
    deletedAt: {
      type: Date,
      index: true,
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

// 인덱스 설정
UserSchema.index({ "oauthAccounts.provider": 1, "oauthAccounts.providerId": 1 });

// OAuth 계정 추가 메서드
UserSchema.methods.addOAuthAccount = async function (account: IOAuthAccount): Promise<IUser> {
  const user = this as IUser;
  const existingIndex = user.oauthAccounts.findIndex((acc) => acc.provider === account.provider);

  if (existingIndex !== -1) {
    user.oauthAccounts[existingIndex] = account;
  } else {
    user.oauthAccounts.push(account);
  }

  return user.save();
};

// OAuth 계정 제거 메서드
UserSchema.methods.removeOAuthAccount = async function (provider: OAuthProvider): Promise<IUser> {
  const user = this as IUser;
  user.oauthAccounts = user.oauthAccounts.filter((acc) => acc.provider !== provider);
  return user.save();
};

// OAuth 계정 조회 메서드
UserSchema.methods.getOAuthAccount = function (provider: OAuthProvider): IOAuthAccount | undefined {
  const user = this as IUser;
  return user.oauthAccounts.find((acc) => acc.provider === provider);
};

// 이메일로 사용자 찾기 (Static 메서드)
UserSchema.statics.findByEmail = function (email: string): Promise<IUser | null> {
  return this.findOne({ email });
};

// OAuth Provider로 사용자 찾기 (Static 메서드)
UserSchema.statics.findByOAuthProvider = function (provider: OAuthProvider, providerId: string): Promise<IUser | null> {
  return this.findOne({
    "oauthAccounts.provider": provider,
    "oauthAccounts.providerId": providerId,
  });
};

const User = mongoose.model<IUser, IUserModel>("User", UserSchema);

export default User;
