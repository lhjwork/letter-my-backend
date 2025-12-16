import Letter, { ILetter, OgImageType, LetterType, LetterCategory } from "../models/Letter";

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

  // 모든 편지 조회 (페이지네이션)
  async findAll(page: number = 1, limit: number = 10): Promise<{ letters: ILetter[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [letters, total] = await Promise.all([
      Letter.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      Letter.countDocuments(),
    ]);
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
      type: LetterType.LETTER,
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
  async createStory(data: {
    userId?: string;
    title: string;
    content: string;
    authorName: string;
    category?: LetterCategory;
    ogPreviewMessage?: string;
  }): Promise<ILetter> {
    const letter = new Letter({
      type: LetterType.STORY,
      userId: data.userId,
      title: data.title,
      content: data.content,
      authorName: data.authorName,
      category: data.category || LetterCategory.OTHER,
      ogPreviewMessage: data.ogPreviewMessage || data.content.substring(0, 60),
      ogImageType: OgImageType.AUTO,
    });
    return letter.save();
  }

  // 사연 목록 조회 (페이지네이션, 검색, 정렬, 카테고리 필터)
  async getStories(params: {
    page: number;
    limit: number;
    search?: string;
    sort?: "latest" | "oldest" | "popular";
    category?: string;
  }): Promise<{
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

    // 검색 조건
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
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

    const [stories, total] = await Promise.all([
      Letter.find(query).sort(sortOption).skip(skip).limit(limit).select("-__v").lean(),
      Letter.countDocuments(query),
    ]);

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
    const stats = await Letter.aggregate([
      { $match: { type: LetterType.STORY } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

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
    return Letter.findByIdAndUpdate(
      letterId,
      { $set: { ogImageUrl, ogImageType: OgImageType.AUTO } },
      { new: true }
    );
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
}

// Service 인스턴스 생성 및 내보내기
export default new LetterService();
