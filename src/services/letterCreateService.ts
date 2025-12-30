import Letter, { LetterType, LetterStatus } from "../models/Letter";
import mongoose from "mongoose";
import { sanitizeHtmlContent, extractPlainText, generatePreviewText, isHtmlContent, textToHtml } from "../utils/htmlProcessor";

export interface CreateLetterData {
  title: string;
  content: string;
  type: "story" | "friend";
  category?: string;
  ogTitle?: string;
  ogPreviewText?: string;
  aiGenerated?: boolean;
  aiModel?: string;
  recipientAddresses?: Array<{
    name: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  }>;
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

    // 3. HTML 콘텐츠 처리
    const processedContent = this.processContent(data.content);

    // 4. 편지 생성
    const letter = new Letter({
      type: data.type === "story" ? LetterType.STORY : LetterType.FRIEND,
      userId,
      title: data.title.trim(),
      content: processedContent.content,
      contentType: processedContent.contentType,
      plainContent: processedContent.plainContent,
      authorName: userName,
      category: data.category || "기타",
      status: LetterStatus.CREATED,
      // URL 공유 관련 설정
      isPublic: data.type === "story", // 사연은 공개, 편지는 비공개
      shareableUrl: true,
      viewCount: 0,
      // 수신자 주소 목록
      recipientAddresses:
        data.recipientAddresses?.map((addr) => ({
          ...addr,
          addedAt: new Date(),
        })) || [],
      // OG 메타데이터
      ogTitle: data.ogTitle || data.title.trim(),
      ogPreviewText: data.ogPreviewText || processedContent.previewText,
      // AI 메타데이터
      aiMetadata: {
        titleGenerated: data.aiGenerated || false,
        titleGeneratedAt: data.aiGenerated ? new Date() : undefined,
        titleGenerationModel: data.aiModel,
      },
    });

    await letter.save();

    // 5. 편지 URL 생성
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

    // 새로운 시스템에서 실물 편지 정보 조회
    let physicalLetterInfo = {
      physicalRequested: false,
      physicalStatus: "none" as "none" | "requested" | "approved" | "rejected",
      physicalRequestDate: undefined as Date | undefined,
      totalRequests: 0,
    };

    try {
      console.log(`🔍 [DEBUG] Checking physical requests for letterId: ${letterId}`);

      // Letter의 recipientAddresses에서 실물 편지 신청 정보 조회
      const physicalRequests = letter.recipientAddresses.filter((addr: any) => addr.isPhysicalRequested);

      console.log(`📊 [DEBUG] Found ${physicalRequests?.length || 0} physical requests for letter ${letterId}`);
      console.log(
        `📋 [DEBUG] Physical requests data:`,
        physicalRequests?.map((req: any) => ({
          requestId: req.requestId,
          name: req.name,
          status: req.physicalStatus,
          requestedAt: req.physicalRequestDate,
          sessionId: req.sessionId,
        }))
      );

      if (physicalRequests && physicalRequests.length > 0) {
        physicalLetterInfo.physicalRequested = true;
        physicalLetterInfo.totalRequests = physicalRequests.length;

        // 가장 최근 신청의 날짜를 사용
        const latestRequest = physicalRequests.sort((a: any, b: any) => new Date(b.physicalRequestDate).getTime() - new Date(a.physicalRequestDate).getTime())[0];

        physicalLetterInfo.physicalRequestDate = latestRequest.physicalRequestDate;

        // 상태 결정 (승인된 것이 있으면 approved, 아니면 requested)
        const hasApproved = physicalRequests.some((req: any) => req.physicalStatus === "approved");
        physicalLetterInfo.physicalStatus = hasApproved ? "approved" : "requested";

        console.log(`✅ [DEBUG] Final physical info for letter ${letterId}:`, physicalLetterInfo);
      } else {
        console.log(`❌ [DEBUG] No physical requests found for letter ${letterId}`);
      }
    } catch (error) {
      console.error("❌ [DEBUG] 실물 편지 정보 조회 실패:", error);
      // 에러가 발생해도 편지 조회는 계속 진행
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
      // 새로운 시스템에서 가져온 실물 편지 정보 (기존 Letter 모델 필드 무시)
      physicalRequested: physicalLetterInfo.physicalRequested,
      physicalStatus: physicalLetterInfo.physicalStatus,
      physicalRequestDate: physicalLetterInfo.physicalRequestDate,
      totalPhysicalRequests: physicalLetterInfo.totalRequests,
      // 디버깅용 정보
      _debug: {
        letterId: letter._id.toString(),
        originalPhysicalRequested: letter.physicalRequested,
        originalPhysicalStatus: letter.physicalStatus,
        newPhysicalRequested: physicalLetterInfo.physicalRequested,
        newPhysicalStatus: physicalLetterInfo.physicalStatus,
      },
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
    console.log("🔍 Processing content:", { originalContent: content, length: content.length });

    // HTML 콘텐츠인지 확인
    const isHtml = isHtmlContent(content);
    console.log("📝 Is HTML content:", isHtml);

    let processedContent: string;
    let contentType: "text" | "html";
    let plainContent: string;

    if (isHtml) {
      // HTML 콘텐츠 보안 처리
      processedContent = sanitizeHtmlContent(content);
      console.log("🧹 Sanitized content:", { processedContent, length: processedContent.length });
      contentType = "html";
      plainContent = extractPlainText(processedContent);
      console.log("📄 Plain text:", { plainContent, length: plainContent.length });
    } else {
      // 일반 텍스트를 HTML로 변환 (줄바꿈 처리)
      processedContent = textToHtml(content.trim());
      console.log("🔄 Text to HTML:", { processedContent, length: processedContent.length });
      contentType = "html";
      plainContent = content.trim();
    }

    // 미리보기 텍스트 생성
    const previewText = generatePreviewText(processedContent);
    console.log("👀 Preview text:", previewText);

    const result = {
      content: processedContent,
      contentType,
      plainContent,
      previewText,
    };

    console.log("✅ Final processed content:", result);
    return result;
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
