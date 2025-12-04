import mongoose, { Schema, Document, Model } from "mongoose";

// OAuth Provider 타입
export enum OAuthProvider {
  INSTAGRAM = "instagram",
  NAVER = "naver",
  KAKAO = "kakao",
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

// User Document 인터페이스
export interface IUser extends Document {
  email: string;
  name: string;
  image?: string;
  emailVerified?: Date;
  oauthAccounts: IOAuthAccount[];
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
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
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

  // 이미 존재하는 provider는 업데이트
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

// User 모델 생성 및 내보내기
const User = mongoose.model<IUser, IUserModel>("User", UserSchema);

export default User;
