import DraftLetter, { IDraftLetter, DraftStatus, DraftType, IDraftRecipientAddress } from "../models/DraftLetter";
import letterCreateService from "./letterCreateService";
import mongoose from "mongoose";

export interface IDraftLetterData {
  title?: string;
  content?: string;
  type?: "friend" | "story";
  category?: string;
  recipientAddresses?: IDraftRecipientAddress[];
}

export interface IDraftLetterResult {
  _id: string;
  title: string;
  autoTitle: string;
  content: string;
  type: string;
  category: string;
  wordCount: number;
  saveCount: number;
  lastSavedAt: Date;
  createdAt: Date;
}

export interface IDraftListResult {
  drafts: Array<{
    _id: string;
    title: string;
    autoTitle: string;
    content: string; // 미리보기용 (100자)
    type: string;
    category: string;
    wordCount: number;
    saveCount: number;
    lastSavedAt: Date;
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    totalDrafts: number;
    totalWords: number;
    oldestDraft: Date | null;
  };
}

export interface IPublishResult {
  letterId: string;
  url: string;
  draftId: string;
}

class DraftLetterService {
  /**
   * 임시저장 생성 또는 업데이트
   */
  async saveDraft(authorId: string, data: IDraftLetterData, draftId?: string): Promise<IDraftLetterResult> {
    console.log(`🔍 [DEBUG] Saving draft for authorId: ${authorId}, draftId: ${draftId}`);
    console.log(`📋 [DEBUG] Draft data:`, data);

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      throw new Error("유효하지 않은 사용자 ID입니다.");
    }

    let draft: IDraftLetter;

    if (draftId) {
      // 기존 임시저장 업데이트
      if (!mongoose.Types.ObjectId.isValid(draftId)) {
        throw new Error("유효하지 않은 임시저장 ID입니다.");
      }

      const existingDraft = await DraftLetter.findOne({
        _id: draftId,
        authorId,
        status: DraftStatus.DRAFT,
      });

      if (!existingDraft) {
        throw new Error("임시저장된 편지를 찾을 수 없습니다.");
      }

      // 기존 임시저장 업데이트
      existingDraft.title = data.title !== undefined ? data.title : existingDraft.title;
      existingDraft.content = data.content !== undefined ? data.content : existingDraft.content;
      existingDraft.type = data.type ? (data.type as DraftType) : existingDraft.type;
      existingDraft.category = data.category || existingDraft.category;
      existingDraft.recipientAddresses = data.recipientAddresses || existingDraft.recipientAddresses;
      existingDraft.saveCount += 1;

      draft = await existingDraft.save();
      console.log(`✅ [DEBUG] Updated existing draft: ${draft._id}`);
    } else {
      // 새 임시저장 생성
      const newDraft = new DraftLetter({
        authorId,
        title: data.title || "",
        content: data.content || "",
        type: data.type ? (data.type as DraftType) : DraftType.FRIEND,
        category: data.category || "기타",
        recipientAddresses: data.recipientAddresses || [],
      });

      draft = await newDraft.save();
      console.log(`✅ [DEBUG] Created new draft: ${draft._id}`);
    }

    return {
      _id: draft._id.toString(),
      title: draft.title,
      autoTitle: draft.autoTitle,
      content: draft.content,
      type: draft.type,
      category: draft.category,
      wordCount: draft.wordCount,
      saveCount: draft.saveCount,
      lastSavedAt: draft.lastSavedAt,
      createdAt: draft.createdAt,
    };
  }

  /**
   * 임시저장 목록 조회
   */
  async getDrafts(authorId: string, page: number = 1, limit: number = 10, sort: string = "latest", type: string = "all"): Promise<IDraftListResult> {
    console.log(`🔍 [DEBUG] Getting drafts for authorId: ${authorId}`);

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      throw new Error("유효하지 않은 사용자 ID입니다.");
    }

    // 필터 조건
    const filter: any = {
      authorId,
      status: DraftStatus.DRAFT,
    };

    if (type !== "all" && ["friend", "story"].includes(type)) {
      filter.type = type;
    }

    // 정렬 조건
    let sortOption: any = { lastSavedAt: -1 }; // 기본: 최신순
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "wordCount") sortOption = { wordCount: -1 };

    // 페이지네이션
    const skip = (page - 1) * limit;

    const [drafts, total] = await Promise.all([
      DraftLetter.find(filter).sort(sortOption).skip(skip).limit(limit).select("title autoTitle content type category wordCount saveCount lastSavedAt createdAt").lean(),
      DraftLetter.countDocuments(filter),
    ]);

    // 내용 미리보기 처리
    const processedDrafts = drafts.map((draft: any) => ({
      ...draft,
      _id: draft._id.toString(),
      content: draft.content.replace(/<[^>]*>/g, "").substring(0, 100) + (draft.content.length > 100 ? "..." : ""),
    }));

    // 통계 정보
    const stats = await DraftLetter.aggregate([
      { $match: { authorId: new mongoose.Types.ObjectId(authorId), status: DraftStatus.DRAFT } },
      {
        $group: {
          _id: null,
          totalDrafts: { $sum: 1 },
          totalWords: { $sum: "$wordCount" },
          oldestDraft: { $min: "$createdAt" },
        },
      },
    ]);

    console.log(`📊 [DEBUG] Found ${total} drafts for user ${authorId}`);

    return {
      drafts: processedDrafts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      stats: stats[0] || { totalDrafts: 0, totalWords: 0, oldestDraft: null },
    };
  }

  /**
   * 임시저장 상세 조회
   */
  async getDraft(draftId: string, authorId: string): Promise<IDraftLetter> {
    console.log(`🔍 [DEBUG] Getting draft: ${draftId} for authorId: ${authorId}`);

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      throw new Error("유효하지 않은 임시저장 ID입니다.");
    }

    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      throw new Error("유효하지 않은 사용자 ID입니다.");
    }

    const draft = await DraftLetter.findOne({
      _id: draftId,
      authorId,
      status: DraftStatus.DRAFT,
    });

    if (!draft) {
      throw new Error("임시저장된 편지를 찾을 수 없습니다.");
    }

    console.log(`✅ [DEBUG] Found draft: ${draft.title || draft.autoTitle}`);
    return draft;
  }

  /**
   * 임시저장 삭제 (소프트 삭제)
   */
  async deleteDraft(draftId: string, authorId: string): Promise<void> {
    console.log(`🔍 [DEBUG] Deleting draft: ${draftId} for authorId: ${authorId}`);

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      throw new Error("유효하지 않은 임시저장 ID입니다.");
    }

    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      throw new Error("유효하지 않은 사용자 ID입니다.");
    }

    const result = await DraftLetter.findOneAndUpdate({ _id: draftId, authorId, status: DraftStatus.DRAFT }, { status: DraftStatus.DELETED }, { new: true });

    if (!result) {
      throw new Error("임시저장된 편지를 찾을 수 없습니다.");
    }

    console.log(`✅ [DEBUG] Deleted draft: ${draftId}`);
  }

  /**
   * 임시저장 → 정식 발행
   */
  async publishDraft(draftId: string, authorId: string, userName: string, updateData?: Partial<IDraftLetterData>): Promise<IPublishResult> {
    console.log(`🔍 [DEBUG] Publishing draft: ${draftId} for authorId: ${authorId}`);

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      throw new Error("유효하지 않은 임시저장 ID입니다.");
    }

    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      throw new Error("유효하지 않은 사용자 ID입니다.");
    }

    // 임시저장 조회
    const draft = await DraftLetter.findOne({
      _id: draftId,
      authorId,
      status: DraftStatus.DRAFT,
    });

    if (!draft) {
      throw new Error("임시저장된 편지를 찾을 수 없습니다.");
    }

    // 발행할 데이터 준비
    const publishData = {
      title: updateData?.title || draft.title || draft.autoTitle,
      content: updateData?.content || draft.content,
      type: updateData?.type || draft.type,
      category: updateData?.category || draft.category,
      recipientAddresses: (updateData?.recipientAddresses || draft.recipientAddresses).map((addr) => ({
        name: addr.name || "",
        phone: addr.phone || "",
        zipCode: addr.zipCode || "",
        address1: addr.address1 || "",
        address2: addr.address2,
        memo: addr.memo,
      })),
    };

    // 필수 데이터 검증
    if (!publishData.title.trim()) {
      throw new Error("편지 제목은 필수입니다.");
    }

    if (!publishData.content.trim()) {
      throw new Error("편지 내용은 필수입니다.");
    }

    // letterCreateService를 사용하여 정식 편지 생성
    const publishedLetter = await letterCreateService.createLetter(authorId, userName, publishData);

    // 임시저장 상태 업데이트
    draft.status = DraftStatus.PUBLISHED;
    draft.publishedAt = new Date();
    draft.publishedLetterId = new mongoose.Types.ObjectId(publishedLetter._id);
    await draft.save();

    console.log(`✅ [DEBUG] Published draft ${draftId} as letter ${publishedLetter._id}`);

    return {
      letterId: publishedLetter._id,
      url: publishedLetter.url,
      draftId: draft._id.toString(),
    };
  }

  /**
   * 임시저장 통계 조회
   */
  async getDraftStats(authorId: string) {
    console.log(`🔍 [DEBUG] Getting draft stats for authorId: ${authorId}`);

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      throw new Error("유효하지 않은 사용자 ID입니다.");
    }

    const stats = await DraftLetter.aggregate([
      { $match: { authorId: new mongoose.Types.ObjectId(authorId), status: DraftStatus.DRAFT } },
      {
        $group: {
          _id: null,
          totalDrafts: { $sum: 1 },
          totalWords: { $sum: "$wordCount" },
          oldestDraft: { $min: "$createdAt" },
        },
      },
    ]);

    // 최근 활동 (최근 7일간 저장 횟수)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await DraftLetter.aggregate([
      {
        $match: {
          authorId: new mongoose.Types.ObjectId(authorId),
          status: DraftStatus.DRAFT,
          lastSavedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$lastSavedAt" },
          },
          saves: { $sum: "$saveCount" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          saves: 1,
          _id: 0,
        },
      },
    ]);

    console.log(`📊 [DEBUG] Draft stats for user ${authorId}:`, stats[0]);

    return {
      totalDrafts: stats[0]?.totalDrafts || 0,
      totalWords: stats[0]?.totalWords || 0,
      oldestDraft: stats[0]?.oldestDraft || null,
      recentActivity,
    };
  }

  /**
   * 오래된 임시저장 정리 (30일 이상)
   */
  async cleanupOldDrafts(): Promise<number> {
    console.log(`🧹 [DEBUG] Cleaning up old drafts`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await DraftLetter.updateMany(
      {
        status: DraftStatus.DRAFT,
        lastSavedAt: { $lt: thirtyDaysAgo },
      },
      { status: DraftStatus.DELETED }
    );

    console.log(`✅ [DEBUG] Cleaned up ${result.modifiedCount} old drafts`);
    return result.modifiedCount;
  }
}

export default new DraftLetterService();
