import Like, { ILike } from "../models/Like";
import Letter from "../models/Letter";

class LikeService {
  // 좋아요 추가
  async addLike(userId: string, letterId: string): Promise<{ like: ILike; likeCount: number }> {
    // 편지 존재 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("Letter not found");
    }

    // 이미 좋아요 했는지 확인
    const existingLike = await Like.findByUserAndLetter(userId, letterId);
    if (existingLike) {
      throw new Error("Already liked");
    }

    // 좋아요 생성
    const like = await Like.create({ userId, letterId });

    // Letter의 likeCount 증가
    await Letter.findByIdAndUpdate(letterId, { $inc: { likeCount: 1 } });

    const likeCount = await Like.countByLetter(letterId);

    return { like, likeCount };
  }

  // 좋아요 취소
  async removeLike(userId: string, letterId: string): Promise<{ likeCount: number }> {
    const like = await Like.findOneAndDelete({ userId, letterId });

    if (!like) {
      throw new Error("Like not found");
    }

    // Letter의 likeCount 감소
    await Letter.findByIdAndUpdate(letterId, { $inc: { likeCount: -1 } });

    const likeCount = await Like.countByLetter(letterId);

    return { likeCount };
  }

  // 좋아요 상태 확인
  async checkLikeStatus(userId: string, letterId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const [like, likeCount] = await Promise.all([Like.findByUserAndLetter(userId, letterId), Like.countByLetter(letterId)]);

    return {
      isLiked: !!like,
      likeCount,
    };
  }

  // 내가 좋아요한 목록
  async getMyLikes(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    likes: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      Like.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("letterId", "title authorName category viewCount likeCount createdAt type"),
      Like.countDocuments({ userId }),
    ]);

    return {
      likes: likes.map((like) => like.letterId).filter(Boolean),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 여러 편지의 좋아요 상태 일괄 확인 (목록 조회 시 사용)
  async checkBulkLikeStatus(userId: string, letterIds: string[]): Promise<Map<string, boolean>> {
    const likes = await Like.find({
      userId,
      letterId: { $in: letterIds },
    });

    const likeMap = new Map<string, boolean>();
    letterIds.forEach((id) => likeMap.set(id, false));
    likes.forEach((like) => likeMap.set(like.letterId.toString(), true));

    return likeMap;
  }
}

export default new LikeService();
