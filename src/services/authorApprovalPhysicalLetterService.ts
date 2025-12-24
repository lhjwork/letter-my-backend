import AuthorApprovalPhysicalRequest, { IAuthorApprovalPhysicalRequest, RequestStatus, IRequesterInfo, IRecipientInfo } from "../models/AuthorApprovalPhysicalRequest";
import Letter from "../models/Letter";
import mongoose from "mongoose";
import crypto from "crypto";

// 신청 데이터 인터페이스
export interface IPhysicalRequestData {
  address: {
    name: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  };
}

// 승인/거절 데이터 인터페이스
export interface IApprovalData {
  action: "approve" | "reject";
  rejectionReason?: string;
}

class AuthorApprovalPhysicalLetterService {
  /**
   * 세션 ID 생성
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * IP 주소 해시 처리
   */
  private hashIP(ip: string): string {
    return crypto.createHash("sha256").update(ip).digest("hex");
  }

  /**
   * 배송비 계산 (우편번호 기반)
   */
  private calculateShippingCost(zipCode: string): number {
    // 기본 배송비 3000원, 제주/도서산간 추가 500원
    const jejuCodes = ["63", "64"]; // 제주도 우편번호 시작
    const islandCodes = ["59", "58", "57"]; // 도서산간 지역 예시

    const prefix = zipCode.substring(0, 2);

    if (jejuCodes.includes(prefix) || islandCodes.includes(prefix)) {
      return 3500;
    }

    return 3000;
  }

  /**
   * 주소 유효성 검사
   */
  private validateAddress(address: any): string | null {
    if (!address.name || address.name.trim().length < 2) {
      return "받는 분 성함은 2자 이상이어야 합니다.";
    }

    if (!address.phone || !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(address.phone)) {
      return "올바른 휴대폰 번호를 입력해주세요.";
    }

    if (!address.zipCode || !/^[0-9]{5}$/.test(address.zipCode)) {
      return "우편번호는 5자리 숫자여야 합니다.";
    }

    if (!address.address1 || address.address1.trim().length < 5) {
      return "주소는 5자 이상이어야 합니다.";
    }

    return null;
  }

  /**
   * 실물 편지 신청
   */
  async requestPhysicalLetter(
    letterId: string,
    sessionId: string,
    userAgent: string,
    ipAddress: string,
    requestData: IPhysicalRequestData
  ): Promise<{
    requestId: string;
    cost: number;
    status: string;
    needsApproval: boolean;
  }> {
    // 편지 존재 확인
    const letter = await Letter.findById(letterId).populate("userId");
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 실물 편지 신청 허용 여부 확인
    if (!letter.authorSettings.allowPhysicalRequests) {
      throw new Error("이 편지는 실물 편지 신청이 허용되지 않습니다.");
    }

    // 1인당 최대 신청 수 확인
    const existingRequests = await AuthorApprovalPhysicalRequest.countDocuments({
      letterId: new mongoose.Types.ObjectId(letterId),
      "requesterInfo.sessionId": sessionId,
      status: { $nin: [RequestStatus.CANCELLED, RequestStatus.REJECTED] },
    });

    if (existingRequests >= letter.authorSettings.maxRequestsPerPerson) {
      throw new Error(`1인당 최대 ${letter.authorSettings.maxRequestsPerPerson}개까지만 신청할 수 있습니다.`);
    }

    // 주소 유효성 검사
    const validationError = this.validateAddress(requestData.address);
    if (validationError) {
      throw new Error(validationError);
    }

    // 비용 계산
    const shippingCost = this.calculateShippingCost(requestData.address.zipCode);
    const letterCost = 2000;
    const totalCost = shippingCost + letterCost;

    // 요청자 정보 생성
    const requesterInfo: IRequesterInfo = {
      sessionId,
      userAgent,
      ipAddress: this.hashIP(ipAddress),
      requestedAt: new Date(),
    };

    // 수신자 정보 생성
    const recipientInfo: IRecipientInfo = {
      name: requestData.address.name.trim(),
      phone: requestData.address.phone.trim(),
      zipCode: requestData.address.zipCode,
      address1: requestData.address.address1.trim(),
      address2: requestData.address.address2?.trim() || "",
      memo: requestData.address.memo?.trim() || "",
    };

    // 자동 승인 여부 확인
    const isAutoApprove = letter.authorSettings.autoApprove;

    // 실물 편지 요청 생성
    const physicalRequest = new AuthorApprovalPhysicalRequest({
      letterId: new mongoose.Types.ObjectId(letterId),
      requesterInfo,
      recipientInfo,
      cost: {
        shippingCost,
        letterCost,
        totalCost,
      },
      status: isAutoApprove ? RequestStatus.APPROVED : RequestStatus.PENDING,
      authorApproval: {
        isApproved: isAutoApprove,
        approvedAt: isAutoApprove ? new Date() : undefined,
        approvedBy: isAutoApprove ? letter.userId : undefined,
      },
    });

    await physicalRequest.save();

    // 편지 통계 업데이트
    const updateFields: any = {
      "physicalLetterStats.totalRequests": 1,
    };

    if (isAutoApprove) {
      updateFields["physicalLetterStats.approvedRequests"] = 1;
    } else {
      updateFields["physicalLetterStats.pendingRequests"] = 1;
    }

    await Letter.findByIdAndUpdate(letterId, { $inc: updateFields });

    return {
      requestId: physicalRequest._id.toString(),
      cost: totalCost,
      status: physicalRequest.status,
      needsApproval: !isAutoApprove,
    };
  }

  /**
   * 편지 작성자용 신청 목록 조회
   */
  async getAuthorRequests(
    letterId: string,
    authorId: string,
    filters: {
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    requests: IAuthorApprovalPhysicalRequest[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalRequests: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    summary: {
      totalRequests: number;
      statusCounts: Record<string, number>;
      totalApprovedCost: number;
      letterSettings: any;
    };
  }> {
    // 편지 소유권 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    if (letter.userId?.toString() !== authorId) {
      throw new Error("편지 작성자만 접근할 수 있습니다.");
    }

    const { status, page = 1, limit = 20 } = filters;

    // 필터 조건 설정
    const filter: any = { letterId: new mongoose.Types.ObjectId(letterId) };
    if (status) {
      filter.status = status;
    }

    // 페이지네이션 설정
    const skip = (page - 1) * limit;

    // 신청 목록 조회
    const requests = await AuthorApprovalPhysicalRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-requesterInfo.ipAddress"); // IP 주소 제외

    // 총 개수
    const totalRequests = await AuthorApprovalPhysicalRequest.countDocuments(filter);

    // 상태별 통계
    const statusStats = await AuthorApprovalPhysicalRequest.aggregate([{ $match: { letterId: new mongoose.Types.ObjectId(letterId) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);

    const statusCounts = statusStats.reduce(
      (acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      },
      {} as Record<string, number>
    );

    // 총 예상 비용 (승인된 것만)
    const approvedCostResult = await AuthorApprovalPhysicalRequest.aggregate([
      {
        $match: {
          letterId: new mongoose.Types.ObjectId(letterId),
          "authorApproval.isApproved": true,
        },
      },
      { $group: { _id: null, totalCost: { $sum: "$cost.totalCost" } } },
    ]);

    const totalApprovedCost = approvedCostResult[0]?.totalCost || 0;

    return {
      requests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
        hasNext: skip + requests.length < totalRequests,
        hasPrev: page > 1,
      },
      summary: {
        totalRequests,
        statusCounts,
        totalApprovedCost,
        letterSettings: letter.authorSettings,
      },
    };
  }

  /**
   * 신청 승인/거절 처리
   */
  async processApproval(letterId: string, requestId: string, authorId: string, approvalData: IApprovalData): Promise<IAuthorApprovalPhysicalRequest> {
    // 편지 소유권 확인
    const letter = await Letter.findById(letterId);
    if (!letter || letter.userId?.toString() !== authorId) {
      throw new Error("편지 작성자만 접근할 수 있습니다.");
    }

    // 신청 확인
    const request = await AuthorApprovalPhysicalRequest.findById(requestId);
    if (!request || request.letterId.toString() !== letterId) {
      throw new Error("신청을 찾을 수 없습니다.");
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new Error("이미 처리된 신청입니다.");
    }

    // 승인/거절 처리
    const updateData: any = { updatedAt: new Date() };
    let statusUpdate: any = {};

    if (approvalData.action === "approve") {
      updateData.status = RequestStatus.APPROVED;
      updateData["authorApproval.isApproved"] = true;
      updateData["authorApproval.approvedAt"] = new Date();
      updateData["authorApproval.approvedBy"] = new mongoose.Types.ObjectId(authorId);

      statusUpdate = {
        $inc: {
          "physicalLetterStats.pendingRequests": -1,
          "physicalLetterStats.approvedRequests": 1,
        },
      };
    } else if (approvalData.action === "reject") {
      updateData.status = RequestStatus.REJECTED;
      updateData["authorApproval.rejectedAt"] = new Date();
      updateData["authorApproval.rejectionReason"] = approvalData.rejectionReason || "작성자에 의해 거절됨";

      statusUpdate = {
        $inc: {
          "physicalLetterStats.pendingRequests": -1,
          "physicalLetterStats.rejectedRequests": 1,
        },
      };
    } else {
      throw new Error("유효하지 않은 액션입니다.");
    }

    // 신청 상태 업데이트
    const updatedRequest = await AuthorApprovalPhysicalRequest.findByIdAndUpdate(requestId, updateData, { new: true });

    // 편지 통계 업데이트
    await Letter.findByIdAndUpdate(letterId, statusUpdate);

    if (!updatedRequest) {
      throw new Error("신청 업데이트에 실패했습니다.");
    }

    return updatedRequest;
  }

  /**
   * 공개 신청 현황 조회
   */
  async getPublicRequests(
    letterId: string,
    limit: number = 10
  ): Promise<{
    approvedRequests: Array<{
      recipientName: string;
      approvedAt: Date;
      cost: number;
    }>;
    summary: {
      totalRequests: number;
      approvedRequests: number;
      pendingRequests: number;
      allowNewRequests: boolean;
    };
  }> {
    // 편지 존재 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 승인된 신청만 공개 (개인정보 제외)
    const approvedRequests = await AuthorApprovalPhysicalRequest.find({
      letterId: new mongoose.Types.ObjectId(letterId),
      "authorApproval.isApproved": true,
    })
      .sort({ "authorApproval.approvedAt": -1 })
      .limit(limit)
      .select("recipientInfo.name authorApproval.approvedAt cost.totalCost");

    const summary = {
      totalRequests: letter.physicalLetterStats.totalRequests,
      approvedRequests: letter.physicalLetterStats.approvedRequests,
      pendingRequests: letter.physicalLetterStats.pendingRequests,
      allowNewRequests: letter.authorSettings.allowPhysicalRequests,
    };

    return {
      approvedRequests: approvedRequests.map((req) => ({
        recipientName: req.recipientInfo.name.charAt(0) + "***", // 이름 마스킹
        approvedAt: req.authorApproval.approvedAt!,
        cost: req.cost.totalCost,
      })),
      summary,
    };
  }

  /**
   * 편지 설정 업데이트
   */
  async updateLetterSettings(
    letterId: string,
    authorId: string,
    settings: Partial<{
      allowPhysicalRequests: boolean;
      autoApprove: boolean;
      maxRequestsPerPerson: number;
      requireApprovalMessage: string;
    }>
  ): Promise<any> {
    // 편지 소유권 확인
    const letter = await Letter.findById(letterId);
    if (!letter || letter.userId?.toString() !== authorId) {
      throw new Error("편지 작성자만 접근할 수 있습니다.");
    }

    // 설정 업데이트
    const updatedLetter = await Letter.findByIdAndUpdate(
      letterId,
      {
        authorSettings: {
          ...letter.authorSettings,
          ...settings,
        },
        updatedAt: new Date(),
      },
      { new: true }
    );

    return updatedLetter?.authorSettings;
  }

  /**
   * 1인당 신청 수 확인
   */
  async checkRequestLimit(
    letterId: string,
    sessionId: string
  ): Promise<{
    canRequest: boolean;
    remainingRequests: number;
    maxRequestsPerPerson: number;
    currentRequestCount: number;
  }> {
    // 편지 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 현재 신청 수 확인
    const currentRequestCount = await AuthorApprovalPhysicalRequest.countDocuments({
      letterId: new mongoose.Types.ObjectId(letterId),
      "requesterInfo.sessionId": sessionId,
      status: { $nin: [RequestStatus.CANCELLED, RequestStatus.REJECTED] },
    });

    const maxRequestsPerPerson = letter.authorSettings.maxRequestsPerPerson;
    const canRequest = currentRequestCount < maxRequestsPerPerson;
    const remainingRequests = Math.max(0, maxRequestsPerPerson - currentRequestCount);

    return {
      canRequest,
      remainingRequests,
      maxRequestsPerPerson,
      currentRequestCount,
    };
  }

  /**
   * 세션 ID로 신청 정보 조회 (신청자용)
   */
  async getRequestByIdAndSession(requestId: string, sessionId: string): Promise<IAuthorApprovalPhysicalRequest> {
    const request = await AuthorApprovalPhysicalRequest.findById(requestId).select("-requesterInfo.ipAddress");

    if (!request) {
      throw new Error("신청을 찾을 수 없습니다.");
    }

    if (request.requesterInfo.sessionId !== sessionId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return request;
  }
}

export default new AuthorApprovalPhysicalLetterService();
