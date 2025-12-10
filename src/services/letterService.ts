import Letter, { ILetter } from "../models/Letter";

export class LetterService {
  // 편지 생성
  async createLetter(data: { title: string; content: string; authorName: string; userId: string }): Promise<ILetter> {
    const letter = new Letter({
      title: data.title,
      content: data.content,
      authorName: data.authorName,
      userId: data.userId,
    });
    return letter.save();
  }

  // 모든 편지 조회 (페이지네이션)
  async findAll(page: number = 1, limit: number = 10): Promise<{ letters: ILetter[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [letters, total] = await Promise.all([
      Letter.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("userId", "name email image"), // 작성자 정보 포함
      Letter.countDocuments(),
    ]);

    return {
      letters,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ID로 편지 조회
  async findById(id: string): Promise<ILetter | null> {
    return Letter.findById(id).populate("userId", "name email image");
  }

  // 사용자별 편지 조회
  async findByUserId(userId: string, page: number = 1, limit: number = 10): Promise<{ letters: ILetter[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [letters, total] = await Promise.all([Letter.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit), Letter.countDocuments({ userId })]);

    return {
      letters,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 편지 수정
  async updateLetter(id: string, userId: string, data: Partial<ILetter>): Promise<ILetter | null> {
    // 본인이 작성한 편지인지 확인
    const letter = await Letter.findOne({ _id: id, userId });
    if (!letter) return null;

    Object.assign(letter, data);
    return letter.save();
  }

  // 편지 삭제
  async deleteLetter(id: string, userId: string): Promise<boolean> {
    const result = await Letter.deleteOne({ _id: id, userId });
    return result.deletedCount === 1;
  }
}

export default new LetterService();
