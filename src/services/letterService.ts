import Letter, { ILetter, OgImageType, LetterType, LetterCategory } from "../models/Letter";
import mongoose from "mongoose";
import { sanitizeHtmlContent, extractPlainText, generatePreviewText, isHtmlContent, textToHtml } from "../utils/htmlProcessor";

// Letter Service 클래스
export class LetterService {
  // ID로 편지 조회
  async findById(letterId: string): Promise<ILetter | null> {
    return Letter.findById(letterId);
  }

  // userId로 편지 목록 조회
  async findByUserId(userId: string): Promise<ILetter[]> {
    return Letter.findByUserId(userId);
  }

  // userId로 편지 목록 조회 (페이지네이션)
  async findByUserIdWithPagination(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: ILetter[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const skip = (page - 1) * limit;

    // story와 letter 타입 모두 조회
    const query = {
      userId,
      type: { $in: [LetterType.STORY, LetterType.FRIEND] },
    };

    const [letters, total] = await Promise.all([
      Letter.find(query)
        .sort({ createdAt: -1 }) // 최신순 정렬
        .skip(skip)
        .limit(limit)
        .select("-__v")
        .lean(),
      Letter.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: letters as ILetter[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
  // userId로 사연 목록 조회 (페이지네이션)
  async findStoriesByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: ILetter[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const skip = (page - 1) * limit;

    // story 타입만 조회
    const query = {
      userId,
      type: LetterType.STORY,
    };

    const [stories, total] = await Promise.all([
      Letter.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v")
        .lean(),
      Letter.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: stories as ILetter[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // 모든 편지 조회 (페이지네이션)
  async findAll(page: number = 1, limit: number = 10): Promise<{ letters: ILetter[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [letters, total] = await Promise.all([Letter.find().skip(skip).limit(limit).sort({ createdAt: -1 }), Letter.countDocuments()]);
    return { letters, total, page, totalPages: Math.ceil(total / limit) };
  }

  // 편지 생성
  async createLetter(data: {
    userId: string;
    title: string;
    content: string;
    authorName: string;
    ogPreviewMessage?: string;
    ogBgColor?: string;
    ogIllustration?: string;
    ogFontSize?: number;
  }): Promise<ILetter> {
    const letter = new Letter({
      type: LetterType.FRIEND,
      userId: data.userId,
      title: data.title,
      content: data.content,
      authorName: data.authorName,
      ogPreviewMessage: data.ogPreviewMessage || data.content.substring(0, 50),
      ogBgColor: data.ogBgColor || "#FFF5F5",
      ogIllustration: data.ogIllustration || "💌",
      ogFontSize: data.ogFontSize || 48,
      ogImageType: OgImageType.AUTO,
    });
    return letter.save();
  }

  // 사연 생성 (POST /api/letters/story)
  async createStory(data: { userId?: string; title: string; content: string; authorName: string; category?: LetterCategory; ogPreviewMessage?: string }): Promise<ILetter> {
    // HTML 콘텐츠 처리
    const processedContent = this.processContent(data.content);

    const letter = new Letter({
      type: LetterType.STORY,
      userId: data.userId,
      title: data.title,
      content: processedContent.content,
      contentType: processedContent.contentType,
      plainContent: processedContent.plainContent,
      authorName: data.authorName,
      category: data.category || LetterCategory.OTHER,
      ogPreviewMessage: data.ogPreviewMessage || processedContent.previewText,
      ogImageType: OgImageType.AUTO,
      isPublic: true, // 사연은 공개
    });
    return letter.save();
  }

  // Featured Stories 조회 (메인 랜딩 페이지용 - 최신 4개)
  async getFeaturedStories(): Promise<ILetter[]> {
    try {
      const stories = await Letter.find({
        type: LetterType.STORY,
        isPublic: true,
        // status가 hidden이나 deleted가 아닌 모든 사연 포함
        status: { $nin: ["hidden", "deleted"] },
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .select("_id title content authorName category createdAt viewCount likeCount")
        .lean();

      return stories as ILetter[];
    } catch (error) {
      console.error("Featured stories fetch error:", error);
      throw error;
    }
  }

  // 사연 목록 조회 (페이지네이션, 검색, 정렬, 카테고리 필터)
  async getStories(params: { page: number; limit: number; search?: string; sort?: "latest" | "oldest" | "popular"; category?: string }): Promise<{
    stories: ILetter[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const { page, limit, search, sort = "latest", category } = params;

    // 기본 쿼리: type이 "story"인 것만
    const query: any = { type: LetterType.STORY };

    // 카테고리 필터
    if (category && category !== "전체보기") {
      query.category = category;
    }

    // 검색 조건 - plainContent 필드 사용으로 HTML 태그 제외하고 검색
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { plainContent: { $regex: search, $options: "i" } }, // HTML이 아닌 일반 텍스트에서 검색
        { authorName: { $regex: search, $options: "i" } },
      ];
    }

    // 정렬 조건
    let sortOption: any = {};
    switch (sort) {
      case "latest":
        sortOption = { createdAt: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "popular":
        sortOption = { viewCount: -1, likeCount: -1, createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const [stories, total] = await Promise.all([Letter.find(query).sort(sortOption).skip(skip).limit(limit).select("-__v").lean(), Letter.countDocuments(query)]);

    const totalPages = Math.ceil(total / limit);

    return {
      stories: stories as ILetter[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // 카테고리별 통계 조회
  async getCategoryStats(): Promise<{
    total: number;
    categories: { category: string; count: number; percentage: string }[];
  }> {
    const stats = await Letter.aggregate([{ $match: { type: LetterType.STORY } }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

    const total = await Letter.countDocuments({ type: LetterType.STORY });

    return {
      total,
      categories: stats.map((stat) => ({
        category: stat._id || "기타",
        count: stat.count,
        percentage: ((stat.count / total) * 100).toFixed(1),
      })),
    };
  }

  // 조회수 증가
  async incrementViewCount(letterId: string): Promise<ILetter | null> {
    return Letter.findByIdAndUpdate(letterId, { $inc: { viewCount: 1 } }, { new: true });
  }

  // 편지 업데이트
  async updateLetter(
    letterId: string,
    data: {
      title?: string;
      content?: string;
      authorName?: string;
      category?: LetterCategory;
      ogPreviewMessage?: string;
      ogBgColor?: string;
      ogIllustration?: string;
      ogFontSize?: number;
    }
  ): Promise<ILetter | null> {
    return Letter.findByIdAndUpdate(letterId, { $set: data }, { new: true, runValidators: true });
  }

  // 편지 삭제
  async deleteLetter(letterId: string): Promise<boolean> {
    const result = await Letter.findByIdAndDelete(letterId);
    return !!result;
  }

  // OG 이미지 URL 업데이트 (자동 생성)
  async updateAutoOgImage(letterId: string, ogImageUrl: string): Promise<ILetter | null> {
    return Letter.findByIdAndUpdate(letterId, { $set: { ogImageUrl, ogImageType: OgImageType.AUTO } }, { new: true });
  }

  // OG 이미지 커스텀 업데이트
  async updateCustomOgImage(letterId: string, ogImageUrl: string, ogPreviewMessage?: string): Promise<ILetter | null> {
    const updateData: any = { ogImageUrl, ogImageType: OgImageType.CUSTOM };
    if (ogPreviewMessage !== undefined) {
      updateData.ogPreviewMessage = ogPreviewMessage;
    }
    return Letter.findByIdAndUpdate(letterId, { $set: updateData }, { new: true });
  }

  // OG 이미지 URL 조회
  async getOgImageUrl(letterId: string): Promise<string | null> {
    const letter = await Letter.findById(letterId).select("ogImageUrl");
    return letter?.ogImageUrl || null;
  }

  // ==================== 편지 저장(보관) 관련 메서드 ====================

  /**
   * 편지 저장 (받은 편지로 보관)
   */
  async saveLetter(letterId: string, userId: string): Promise<{ success: boolean; message: string }> {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 자기 자신이 작성한 편지는 저장 불가
    if (letter.userId?.toString() === userId) {
      return { success: false, message: "자신이 작성한 편지는 저장할 수 없습니다." };
    }

    // 이미 저장한 편지인지 확인
    const alreadySaved = letter.savedBy?.some(
      (entry: any) => entry.userId.toString() === userId
    );
    if (alreadySaved) {
      return { success: false, message: "이미 저장한 편지입니다." };
    }

    // savedBy 배열에 추가
    await Letter.findByIdAndUpdate(letterId, {
      $push: {
        savedBy: {
          userId: new mongoose.Types.ObjectId(userId),
          savedAt: new Date(),
        },
      },
    });

    return { success: true, message: "편지가 저장되었습니다." };
  }

  /**
   * 편지 저장 취소
   */
  async unsaveLetter(letterId: string, userId: string): Promise<{ success: boolean; message: string }> {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    const isSaved = letter.savedBy?.some(
      (entry: any) => entry.userId.toString() === userId
    );
    if (!isSaved) {
      return { success: false, message: "저장하지 않은 편지입니다." };
    }

    await Letter.findByIdAndUpdate(letterId, {
      $pull: {
        savedBy: { userId: new mongoose.Types.ObjectId(userId) },
      },
    });

    return { success: true, message: "편지 저장이 취소되었습니다." };
  }

  /**
   * 편지 저장 여부 확인
   */
  async checkLetterSaved(letterId: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId).select("savedBy").lean();
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    return (letter as any).savedBy?.some(
      (entry: any) => entry.userId.toString() === userId
    ) ?? false;
  }

  /**
   * 내 편지 목록 조회 (filter 지원: all/sent/received)
   */
  async findMyLettersWithFilter(
    userId: string,
    filter: "all" | "sent" | "received" = "all",
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const skip = (page - 1) * limit;
    let queryFilter: any;

    switch (filter) {
      case "sent":
        // 내가 작성한 편지
        queryFilter = { userId, type: LetterType.FRIEND };
        break;
      case "received":
        // 내가 저장한(받은) 편지
        queryFilter = { "savedBy.userId": new mongoose.Types.ObjectId(userId), type: LetterType.FRIEND };
        break;
      case "all":
      default:
        // 보낸 편지 + 받은 편지 모두
        queryFilter = {
          $or: [
            { userId, type: LetterType.FRIEND },
            { "savedBy.userId": new mongoose.Types.ObjectId(userId), type: LetterType.FRIEND },
          ],
        };
        break;
    }

    const [letters, total] = await Promise.all([
      Letter.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v -savedBy")
        .populate("userId", "name email image")
        .lean(),
      Letter.countDocuments(queryFilter),
    ]);

    const totalPages = Math.ceil(total / limit);

    // 각 편지에 direction 필드 추가
    const lettersWithDirection = letters.map((letter: any) => ({
      ...letter,
      direction: letter.userId?._id?.toString() === userId || letter.userId?.toString() === userId
        ? "sent"
        : "received",
    }));

    return {
      data: lettersWithDirection,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * HTML 콘텐츠 처리
   * @param content - 원본 콘텐츠
   * @returns 처리된 콘텐츠 정보
   */
  private processContent(content: string): {
    content: string;
    contentType: "text" | "html";
    plainContent: string;
    previewText: string;
  } {
    // HTML 콘텐츠인지 확인
    const isHtml = isHtmlContent(content);

    let processedContent: string;
    let contentType: "text" | "html";
    let plainContent: string;

    if (isHtml) {
      // HTML 콘텐츠 보안 처리
      processedContent = sanitizeHtmlContent(content);
      contentType = "html";
      plainContent = extractPlainText(processedContent);
    } else {
      // 일반 텍스트를 HTML로 변환 (줄바꿈 처리)
      processedContent = textToHtml(content.trim());
      contentType = "html";
      plainContent = content.trim();
    }

    // 미리보기 텍스트 생성
    const previewText = generatePreviewText(processedContent);

    return {
      content: processedContent,
      contentType,
      plainContent,
      previewText,
    };
  }
}

// Service 인스턴스 생성 및 내보내기
export default new LetterService();
