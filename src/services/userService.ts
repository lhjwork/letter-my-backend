import jwt from "jsonwebtoken";
import User, { IUser, OAuthProvider, IOAuthAccount } from "../models/User";
import { generateUniqueNickname } from "../utils/nickname";

const jwtSecret = (): string => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET env is required");
  return s;
};

// JWT Payload 인터페이스
export interface JWTPayload {
  userId: string;
  email: string;
}

// User Service 클래스
export class UserService {
  // JWT 토큰 생성
  generateToken(user: IUser): string {
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
    };

    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    return jwt.sign(payload, jwtSecret(), { expiresIn, algorithm: "HS256" } as jwt.SignOptions);
  }

  // JWT 토큰 검증
  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] }) as JWTPayload;
  }

  // ID로 사용자 조회
  async findById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  // 이메일로 사용자 조회
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findByEmail(email);
  }

  // OAuth Provider로 사용자 조회
  async findByOAuthProvider(provider: OAuthProvider, providerId: string): Promise<IUser | null> {
    return User.findByOAuthProvider(provider, providerId);
  }

  // OAuth 로그인/회원가입
  async findOrCreateOAuthUser(data: {
    provider: OAuthProvider;
    providerId: string;
    email?: string;
    name: string;
    image?: string;
    accessToken?: string;
    refreshToken?: string;
    profile?: any;
    emailVerified?: boolean;
  }): Promise<IUser> {
    // OAuth Provider로 기존 사용자 찾기
    let user = await this.findByOAuthProvider(data.provider, data.providerId);

    if (user) {
      // 기존 사용자의 OAuth 정보 업데이트
      const oauthAccount: IOAuthAccount = {
        provider: data.provider,
        providerId: data.providerId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        profile: data.profile,
      };

      await user.addOAuthAccount(oauthAccount);
      if (!user.realName && data.name) user.realName = data.name;
      user.lastLoginAt = new Date();
      return user.save();
    }

    // 이메일로 기존 사용자 찾기 (다른 OAuth로 가입한 경우) — provider가 이메일을 검증한 경우에만 자동 연결
    if (data.email && data.emailVerified) {
      user = await this.findByEmail(data.email);

      if (user) {
        // 기존 사용자에 OAuth 계정 연결
        const oauthAccount: IOAuthAccount = {
          provider: data.provider,
          providerId: data.providerId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          profile: data.profile,
        };

        await user.addOAuthAccount(oauthAccount);
        if (!user.realName && data.name) user.realName = data.name;
        user.lastLoginAt = new Date();
        return user.save();
      }
    }

    // 이메일이 없는 경우 (Kakao 등) 임시 이메일 생성
    const email = data.email || `not-provided-${data.providerId}`;

    // 새로운 사용자 생성 (실명 노출 방지를 위해 익명 닉네임 자동 생성, 실명은 realName에 보관)
    const newUser = new User({
      email: email,
      name: await generateUniqueNickname(),
      realName: data.name,
      image: data.image,
      emailVerified: new Date(), // OAuth로 가입한 경우 이메일 검증됨
      oauthAccounts: [
        {
          provider: data.provider,
          providerId: data.providerId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          profile: data.profile,
        },
      ],
      lastLoginAt: new Date(),
    });

    return newUser.save();
  }

  // 사용자 정보 업데이트
  async updateUser(
    userId: string,
    data: {
      name?: string;
      image?: string;
      email?: string;
    }
  ): Promise<IUser | null> {
    // 닉네임 변경 시 중복 체크
    if (data.name) {
      const existingName = await User.findOne({
        name: data.name,
        _id: { $ne: userId },
      });

      if (existingName) {
        throw new Error("Name already exists");
      }
    }

    // 이메일 변경 시 중복 체크
    if (data.email) {
      const existingUser = await User.findOne({
        email: data.email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        throw new Error("Email already exists");
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: data }, { new: true, runValidators: true });

    return user;
  }

  // 사용자 삭제
  async deleteUser(userId: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(userId);
    return !!result;
  }

  // OAuth 계정 연결
  async linkOAuthAccount(userId: string, oauthAccount: IOAuthAccount): Promise<IUser | null> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // 해당 provider가 이미 다른 사용자에게 연결되어 있는지 확인
    const existingUser = await this.findByOAuthProvider(oauthAccount.provider, oauthAccount.providerId);

    if (existingUser && existingUser._id.toString() !== userId) {
      throw new Error("This OAuth account is already linked to another user");
    }

    return user.addOAuthAccount(oauthAccount);
  }

  // OAuth 계정 연결 해제
  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<IUser | null> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // OAuth 계정이 1개뿐인 경우 연결 해제 불가
    if (user.oauthAccounts.length === 1) {
      throw new Error("Cannot unlink the last OAuth account. You must have at least one login method.");
    }

    return user.removeOAuthAccount(provider);
  }
}

// Service 인스턴스 생성 및 내보내기
export default new UserService();
