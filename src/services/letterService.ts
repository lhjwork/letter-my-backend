import Letter, { ILetter, OgImageType } from "../models/Letter";

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
  async findAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{ letters: ILetter[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [letters, total] = await Promise.all([
      Letter.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      Letter.countDocuments(),
    ]);

    return {
      letters,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 편지 생성
  async createLetter(data: {
    userId: string;
    content: string;
    ogPreviewMessage?: string;
  }): Promise<ILetter> {
    const letter = new Letter({
      userId: data.userId,
      content: data.content,
      ogPreviewMessage: data.ogPreviewMessage || data.content.substring(0, 50),
      ogImageType: OgImageType.AUTO,
    });

    return letter.save();
  }

  // 편지 업데이트
  async updateLetter(
    letterId: string,
    data: {
      content?: string;
      ogPreviewMessage?: string;
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
      {
        $set: {
          ogImageUrl,
          ogImageType: OgImageType.AUTO,
        },
      },
      { new: true }
    );
  }

  // OG 이미지 커스텀 업데이트
  async updateCustomOgImage(
    letterId: string,
    ogImageUrl: string,
    ogPreviewMessage?: string
  ): Promise<ILetter | null> {
    const updateData: any = {
      ogImageUrl,
      ogImageType: OgImageType.CUSTOM,
    };

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
