import jwt from "jsonwebtoken";
import User, { IUser, OAuthProvider, IOAuthAccount } from "../models/User";

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

    const secret = process.env.JWT_SECRET || "your-secret-key";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  // JWT 토큰 검증
  verifyToken(token: string): JWTPayload {
    const secret = process.env.JWT_SECRET || "your-secret-key";
    return jwt.verify(token, secret) as JWTPayload;
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

  // 모든 사용자 조회 (페이지네이션)
  async findAll(page: number = 1, limit: number = 10): Promise<{ users: IUser[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([User.find().skip(skip).limit(limit).sort({ createdAt: -1 }), User.countDocuments()]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 일반 회원가입 (이메일/비밀번호)
  async createUser(data: { email: string; password: string; name: string }): Promise<IUser> {
    // 이메일 중복 체크
    const existingUser = await User.findByEmail(data.email);
    if (existingUser) {
      throw new Error("Email already exists");
    }

    const user = new User({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    return user.save();
  }

  // OAuth 로그인/회원가입
  async findOrCreateOAuthUser(data: {
    provider: OAuthProvider;
    providerId: string;
    email: string;
    name: string;
    image?: string;
    accessToken?: string;
    refreshToken?: string;
    profile?: any;
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
      user.lastLoginAt = new Date();
      return user.save();
    }

    // 이메일로 기존 사용자 찾기 (다른 OAuth로 가입한 경우)
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
      user.lastLoginAt = new Date();
      return user.save();
    }

    // 새로운 사용자 생성
    const newUser = new User({
      email: data.email,
      name: data.name,
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

  // 비밀번호 변경
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new Error("User not found");
    }

    // OAuth 전용 사용자인 경우
    if (!user.password) {
      throw new Error("Cannot change password for OAuth-only users");
    }

    // 현재 비밀번호 확인
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }

    // 새 비밀번호 설정
    user.password = newPassword;
    await user.save();

    return true;
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
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new Error("User not found");
    }

    // 비밀번호가 없고 OAuth 계정이 1개뿐인 경우 연결 해제 불가
    if (!user.password && user.oauthAccounts.length === 1) {
      throw new Error("Cannot unlink the last OAuth account without a password. Please set a password first.");
    }

    return user.removeOAuthAccount(provider);
  }

  // 로그인 (이메일/비밀번호)
  async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.password) {
      throw new Error("This account uses OAuth login. Please sign in with your OAuth provider.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    // 마지막 로그인 시간 업데이트
    user.lastLoginAt = new Date();
    await user.save();

    const token = this.generateToken(user);

    return { user, token };
  }
}

// Service 인스턴스 생성 및 내보내기
export default new UserService();
