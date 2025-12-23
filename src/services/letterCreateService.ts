import Letter, { LetterType, LetterStatus } from "../models/Letter";
import mongoose from "mongoose";

export interface CreateLetterData {
  title: string;
  content: string;
  type: "story" | "friend";
  category?: string;
  ogTitle?: string;
  ogPreviewText?: string;
  aiGenerated?: boolean;
  aiModel?: string;
}

export interface CreateLetterResult {
  _id: string;
  title: string;
  url: string;
  type: string;
  createdAt: Date;
}

class LetterCreateService {
  /**
   * 편지 생성
   * @param userId - 작성자 ID
   * @param userName - 작성자 이름
   * @param data - 편지 데이터
   * @returns 생성 결과
   */
  async createLetter(userId: string, userName: string, data: CreateLetterData): Promise<CreateLetterResult> {
    // 1. 입력 검증
    this.validateLetterData(data);

    // 2. 일일 생성 제한 확인
    await this.checkLetterLimit(userId);

    // 3. 편지 생성
    const letter = new Letter({
      type: data.type === "story" ? LetterType.STORY : LetterType.FRIEND,
      userId,
      title: data.title.trim(),
      content: data.content.trim(),
      authorName: userName,
      category: data.category || "기타",
      status: LetterStatus.CREATED,
      // URL 공유 관련 설정
      isPublic: data.type === "story", // 사연은 공개, 편지는 비공개
      shareableUrl: true,
      viewCount: 0,
      // OG 메타데이터
      ogTitle: data.ogTitle || data.title.trim(),
      ogPreviewText: data.ogPreviewText || data.content.slice(0, 100) + "...",
      // AI 메타데이터
      aiMetadata: {
        titleGenerated: data.aiGenerated || false,
        titleGeneratedAt: data.aiGenerated ? new Date() : undefined,
        titleGenerationModel: data.aiModel,
      },
    });

    await letter.save();

    // 4. 편지 URL 생성
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const letterUrl = `${frontendUrl}/letter/${letter._id}`;

    return {
      _id: letter._id.toString(),
      title: letter.title,
      url: letterUrl,
      type: letter.type,
      createdAt: letter.createdAt,
    };
  }

  /**
   * 편지 조회 (조회수 증가 포함)
   * @param letterId - 편지 ID
   * @param viewerId - 조회자 ID (선택적)
   * @returns 편지 데이터
   */
  async getLetter(letterId: string, viewerId?: string) {
    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId).populate("userId", "name email image").lean();

    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 접근 권한 확인
    this.checkLetterAccess(letter, viewerId);

    // 조회수 증가 (작성자가 아닌 경우에만)
    if (!viewerId || letter.userId?._id?.toString() !== viewerId) {
      // 비동기로 조회수 증가
      Letter.findByIdAndUpdate(letterId, {
        $inc: { viewCount: 1 },
      }).exec();

      letter.viewCount += 1; // 응답에 반영
    }

    // 응답 데이터 구성
    return {
      _id: letter._id,
      title: letter.title,
      content: letter.content,
      type: letter.type,
      senderId: letter.userId?._id,
      senderName: (letter.userId as any)?.name || letter.authorName,
      category: letter.category,
      ogTitle: letter.ogTitle,
      ogPreviewText: letter.ogPreviewText,
      createdAt: letter.createdAt,
      viewCount: letter.viewCount,
      likeCount: letter.likeCount,
      aiMetadata: letter.aiMetadata,
      isPublic: letter.isPublic,
    };
  }

  /**
   * 편지 데이터 검증
   * @param data - 편지 데이터
   */
  private validateLetterData(data: CreateLetterData): void {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("제목은 필수입니다.");
    }

    if (!data.content || data.content.trim().length === 0) {
      throw new Error("내용은 필수입니다.");
    }

    if (data.title.trim().length > 100) {
      throw new Error("제목은 100자 이내여야 합니다.");
    }

    if (data.content.trim().length > 10000) {
      throw new Error("내용은 10,000자 이내여야 합니다.");
    }

    if (!["story", "friend"].includes(data.type)) {
      throw new Error("올바른 편지 타입을 선택해주세요.");
    }
  }

  /**
   * 일일 편지 생성 제한 확인
   * @param userId - 사용자 ID
   */
  private async checkLetterLimit(userId: string): Promise<void> {
    const limit = parseInt(process.env.LETTER_LIMIT_PER_DAY || "20");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const letterCount = await Letter.countDocuments({
      userId,
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    if (letterCount >= limit) {
      throw new Error(`일일 편지 생성 한도(${limit}개)를 초과했습니다.`);
    }
  }

  /**
   * 편지 접근 권한 확인
   * @param letter - 편지 객체
   * @param viewerId - 조회자 ID
   */
  private checkLetterAccess(letter: any, viewerId?: string): void {
    // 사연은 모든 사용자가 접근 가능
    if (letter.type === "story" && letter.isPublic) {
      return;
    }

    // 일반 편지는 링크를 아는 사람만 접근 가능 (shareableUrl이 true인 경우)
    if (letter.type === "friend" && letter.shareableUrl) {
      return;
    }

    // 작성자는 항상 접근 가능
    if (viewerId && letter.userId?._id?.toString() === viewerId) {
      return;
    }

    throw new Error("이 편지에 접근할 권한이 없습니다.");
  }

  /**
   * 사용자의 편지 목록 조회
   * @param userId - 사용자 ID
   * @param page - 페이지 번호
   * @param limit - 페이지당 항목 수
   * @param type - 편지 타입 필터
   */
  async getUserLetters(userId: string, page: number = 1, limit: number = 20, type?: string) {
    const skip = (page - 1) * limit;

    const query: any = { userId };
    if (type && ["story", "friend"].includes(type)) {
      query.type = type;
    }

    const [letters, total] = await Promise.all([Letter.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-__v").lean(), Letter.countDocuments(query)]);

    return {
      letters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * 편지 생성 통계 조회
   * @param userId - 사용자 ID
   */
  async getLetterStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCreated, todayCreated, thisMonthCreated, storyCount, friendCount] = await Promise.all([
      Letter.countDocuments({ userId }),
      Letter.countDocuments({
        userId,
        createdAt: { $gte: today },
      }),
      Letter.countDocuments({
        userId,
        createdAt: {
          $gte: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      }),
      Letter.countDocuments({ userId, type: "story" }),
      Letter.countDocuments({ userId, type: "friend" }),
    ]);

    const dailyLimit = parseInt(process.env.LETTER_LIMIT_PER_DAY || "20");

    return {
      totalCreated,
      todayCreated,
      thisMonthCreated,
      storyCount,
      friendCount,
      dailyLimit,
      remainingToday: Math.max(0, dailyLimit - todayCreated),
    };
  }
}

export default new LetterCreateService();
