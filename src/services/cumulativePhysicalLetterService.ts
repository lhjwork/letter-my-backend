import Letter from "../models/Letter";
import CumulativePhysicalLetterRequest, {
  ICumulativePhysicalLetterRequest,
  CumulativeRequestStatus,
  IRequesterInfo,
  ICumulativeRecipientInfo,
  ICostInfo,
} from "../models/CumulativePhysicalLetterRequest";
import mongoose from "mongoose";
import crypto from "crypto";

export interface CumulativeRequestData {
  address: {
    name: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    memo?: string;
  };
}

export interface CumulativeRequestResponse {
  requestId: string;
  cost: number;
  status: string;
  estimatedDelivery?: Date;
}

export interface RequestSummary {
  totalRequests: number;
  statusCounts: Record<string, number>;
  totalCost: number;
}

class CumulativePhysicalLetterService {
  /**
   * 개별 실물 편지 신청 (누적 방식)
   * @param letterId - 편지 ID
   * @param sessionId - 세션 ID
   * @param userAgent - 브라우저 정보
   * @param ipAddress - IP 주소
   * @param requestData - 신청 데이터
   * @returns 신청 결과
   */
  async requestPhysicalLetter(letterId: string, sessionId: string, userAgent: string, ipAddress: string, requestData: CumulativeRequestData): Promise<CumulativeRequestResponse> {
    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    // 편지 존재 여부 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 주소 유효성 검사
    this.validateAddress(requestData.address);

    // 신청자 정보 생성
    const requesterInfo: IRequesterInfo = {
      sessionId,
      userAgent,
      ipAddress: this.hashIP(ipAddress),
      requestedAt: new Date(),
    };

    // 수신자 정보 정리
    const recipientInfo: ICumulativeRecipientInfo = {
      name: requestData.address.name.trim(),
      phone: this.formatPhoneNumber(requestData.address.phone),
      zipCode: requestData.address.zipCode,
      address1: requestData.address.address1.trim(),
      address2: requestData.address.address2?.trim() || "",
      memo: requestData.address.memo?.trim() || "",
    };

    // 비용 계산
    const shippingCost = this.calculateShippingCost(requestData.address.zipCode);
    const letterCost = 2000;
    const totalCost = shippingCost + letterCost;

    const costInfo: ICostInfo = {
      shippingCost,
      letterCost,
      totalCost,
    };

    // 실물 편지 요청 생성
    const physicalRequest = new CumulativePhysicalLetterRequest({
      letterId,
      requesterInfo,
      recipientInfo,
      status: CumulativeRequestStatus.REQUESTED,
      cost: costInfo,
      shipping: {},
      adminNotes: [],
    });

    await physicalRequest.save();

    // 편지 통계 업데이트
    await Letter.findByIdAndUpdate(letterId, {
      $inc: { physicalRequestCount: 1 },
    });

    // 관리자 알림 (비동기)
    this.notifyAdminNewRequest(letter, physicalRequest).catch((error) => {
      console.error("관리자 알림 실패:", error);
    });

    return {
      requestId: physicalRequest._id.toString(),
      cost: totalCost,
      status: physicalRequest.status,
    };
  }

  /**
   * 편지별 신청 현황 조회
   * @param letterId - 편지 ID
   * @param page - 페이지 번호
   * @param limit - 페이지당 항목 수
   * @param status - 상태 필터
   * @returns 신청 현황
   */
  async getLetterRequests(letterId: string, page: number = 1, limit: number = 20, status?: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    // 편지 존재 여부 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 필터 조건 설정
    const filter: any = { letterId };
    if (status) {
      filter.status = status;
    }

    // 페이지네이션 설정
    const skip = (page - 1) * limit;

    // 신청 목록 조회 (민감한 정보 제외)
    const requests = await CumulativePhysicalLetterRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-requesterInfo.ipAddress -adminNotes").lean();

    // 총 개수
    const totalRequests = await CumulativePhysicalLetterRequest.countDocuments(filter);

    // 상태별 통계
    const statusStats = await CumulativePhysicalLetterRequest.aggregate([{ $match: { letterId: new mongoose.Types.ObjectId(letterId) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);

    const statusCounts = statusStats.reduce(
      (acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      },
      {} as Record<string, number>
    );

    // 총 비용 계산
    const totalCostResult = await CumulativePhysicalLetterRequest.aggregate([
      { $match: { letterId: new mongoose.Types.ObjectId(letterId) } },
      { $group: { _id: null, totalCost: { $sum: "$cost.totalCost" } } },
    ]);

    const totalCost = totalCostResult[0]?.totalCost || 0;

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
        totalCost,
      },
    };
  }

  /**
   * 개별 신청 상태 조회
   * @param requestId - 요청 ID
   * @param sessionId - 세션 ID (본인 확인용)
   * @returns 신청 상태
   */
  async getRequestStatus(requestId: string, sessionId: string) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new Error("올바르지 않은 요청 ID입니다.");
    }

    const request = await CumulativePhysicalLetterRequest.findById(requestId)
      .populate("letterId", "title ogTitle content")
      .select("-adminNotes") // 관리자 메모 제외
      .lean();

    if (!request) {
      throw new Error("신청을 찾을 수 없습니다.");
    }

    // 세션 검증 (본인 신청만 조회 가능)
    if (request.requesterInfo.sessionId !== sessionId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return request;
  }

  /**
   * 관리자용 전체 신청 목록 조회
   * @param filters - 필터 조건
   * @returns 신청 목록
   */
  async getAdminRequests(filters: { page?: number; limit?: number; status?: string; letterId?: string; startDate?: string; endDate?: string }) {
    const { page = 1, limit = 50, status, letterId, startDate, endDate } = filters;

    // 필터 조건 설정
    const filter: any = {};
    if (status) filter.status = status;
    if (letterId) filter.letterId = letterId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [requests, totalRequests] = await Promise.all([
      CumulativePhysicalLetterRequest.find(filter).populate("letterId", "title ogTitle type").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CumulativePhysicalLetterRequest.countDocuments(filter),
    ]);

    return {
      requests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
      },
    };
  }

  /**
   * 관리자용 신청 상태 업데이트
   * @param requestId - 요청 ID
   * @param updateData - 업데이트 데이터
   * @param adminId - 관리자 ID
   * @returns 업데이트된 요청
   */
  async updateRequestStatus(
    requestId: string,
    updateData: {
      status?: CumulativeRequestStatus;
      trackingNumber?: string;
      shippingCompany?: string;
      adminNote?: string;
    },
    adminId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new Error("올바르지 않은 요청 ID입니다.");
    }

    const { status, trackingNumber, shippingCompany, adminNote } = updateData;

    const updateFields: any = { updatedAt: new Date() };

    if (status) {
      updateFields.status = status;

      if (status === CumulativeRequestStatus.SENT && trackingNumber && shippingCompany) {
        updateFields["shipping.trackingNumber"] = trackingNumber;
        updateFields["shipping.shippingCompany"] = shippingCompany;
        updateFields["shipping.sentAt"] = new Date();
      }

      if (status === CumulativeRequestStatus.DELIVERED) {
        updateFields["shipping.deliveredAt"] = new Date();
      }
    }

    // 관리자 메모 추가
    const pushFields: any = {};
    if (adminNote) {
      pushFields.adminNotes = {
        note: adminNote,
        createdAt: new Date(),
        createdBy: adminId,
      };
    }

    const updateQuery: any = { $set: updateFields };
    if (Object.keys(pushFields).length > 0) {
      updateQuery.$push = pushFields;
    }

    const request = await CumulativePhysicalLetterRequest.findByIdAndUpdate(requestId, updateQuery, { new: true }).populate("letterId", "title ogTitle");

    if (!request) {
      throw new Error("신청을 찾을 수 없습니다.");
    }

    return request;
  }

  /**
   * 인기 편지 분석
   * @param limit - 결과 수 제한
   * @returns 인기 편지 목록
   */
  async getPopularLetters(limit: number = 20) {
    const popularLetters = await CumulativePhysicalLetterRequest.aggregate([
      {
        $group: {
          _id: "$letterId",
          requestCount: { $sum: 1 },
          totalRevenue: { $sum: "$cost.totalCost" },
          avgCost: { $avg: "$cost.totalCost" },
        },
      },
      { $sort: { requestCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "letters",
          localField: "_id",
          foreignField: "_id",
          as: "letter",
        },
      },
      { $unwind: "$letter" },
      {
        $project: {
          letterId: "$_id",
          title: "$letter.title",
          ogTitle: "$letter.ogTitle",
          type: "$letter.type",
          requestCount: 1,
          totalRevenue: 1,
          avgCost: { $round: ["$avgCost", 0] },
        },
      },
    ]);

    return popularLetters;
  }

  /**
   * 주소 유효성 검사
   * @param address - 주소 정보
   */
  private validateAddress(address: any): void {
    if (!address.name?.trim()) {
      throw new Error("받는 분 성함을 입력해주세요.");
    }

    if (address.name.trim().length < 2 || address.name.trim().length > 50) {
      throw new Error("받는 분 성함은 2-50자 이내여야 합니다.");
    }

    if (!address.phone?.trim()) {
      throw new Error("연락처를 입력해주세요.");
    }

    const phoneRegex = /^01[0-9][0-9]{3,4}[0-9]{4}$/;
    const cleanPhone = address.phone.replace(/-/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error("올바른 휴대폰 번호 형식을 입력해주세요. (예: 010-1234-5678 또는 01012345678)");
    }

    if (!address.zipCode || !/^[0-9]{5}$/.test(address.zipCode)) {
      throw new Error("올바른 우편번호를 입력해주세요.");
    }

    if (!address.address1?.trim()) {
      throw new Error("주소를 입력해주세요.");
    }

    if (address.address1.trim().length < 5 || address.address1.trim().length > 200) {
      throw new Error("주소는 5-200자 이내여야 합니다.");
    }

    if (address.address2 && address.address2.length > 200) {
      throw new Error("상세주소는 200자 이내여야 합니다.");
    }

    if (address.memo && address.memo.length > 500) {
      throw new Error("메모는 500자 이내여야 합니다.");
    }
  }

  /**
   * 배송비 계산
   * @param zipCode - 우편번호
   * @returns 배송비
   */
  private calculateShippingCost(zipCode: string): number {
    const seoulGyeonggi = ["01", "02", "03", "04", "05", "06", "07", "08", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];
    const prefix = zipCode.substring(0, 2);
    return seoulGyeonggi.includes(prefix) ? 3000 : 3500;
  }

  /**
   * 휴대폰 번호 포맷팅
   * @param phone - 휴대폰 번호
   * @returns 포맷팅된 휴대폰 번호
   */
  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/-/g, "");
    return cleaned.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  }

  /**
   * IP 주소 해시 처리
   * @param ip - IP 주소
   * @returns 해시된 IP
   */
  private hashIP(ip: string): string {
    const salt = process.env.IP_SALT || "default-salt";
    return crypto
      .createHash("sha256")
      .update(ip + salt)
      .digest("hex");
  }

  /**
   * 세션 ID 생성
   * @returns 새로운 세션 ID
   */
  generateSessionId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * 관리자 알림
   * @param _letter - 편지 정보
   * @param _request - 요청 정보
   */
  private async notifyAdminNewRequest(_letter: any, _request: ICumulativePhysicalLetterRequest): Promise<void> {
    // TODO: 실제 알림 시스템 구현
    // - 이메일 발송
    // - 슬랙 메시지
    // - 관리자 대시보드 알림 등
  }
}

export default new CumulativePhysicalLetterService();
