import Letter from "../models/Letter";
import PhysicalLetterRequest, { IPhysicalLetterRequest, PhysicalRequestStatus, IRecipientInfo } from "../models/PhysicalLetterRequest";
import mongoose from "mongoose";

export interface MultipleRecipientRequest {
  recipients: IRecipientInfo[];
}

export interface RecipientValidationResult {
  isValid: boolean;
  data?: IRecipientInfo;
  errors?: string[];
}

export interface MultipleRequestResponse {
  letterId: string;
  totalRecipients: number;
  totalCost: number;
  requests: {
    id: string;
    recipientName: string;
    address: string;
    cost: number;
    status: string;
  }[];
}

class MultiplePhysicalLetterService {
  /**
   * 다중 수신자 실물 편지 신청
   * @param letterId - 편지 ID
   * @param requesterId - 신청자 ID
   * @param recipientData - 수신자 정보 배열
   * @returns 신청 결과
   */
  async requestMultiplePhysicalLetters(letterId: string, requesterId: string, recipientData: MultipleRecipientRequest): Promise<MultipleRequestResponse> {
    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    // 입력 데이터 검증
    this.validateMultipleRequest(recipientData);

    // 편지 존재 여부 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 수신자 정보 검증
    const validatedRecipients = this.validateAllRecipients(recipientData.recipients);

    // 트랜잭션으로 일괄 처리
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 실물 편지 요청 생성
      const requests = await PhysicalLetterRequest.insertMany(
        validatedRecipients.map((recipient) => ({
          letterId,
          requesterId,
          recipientInfo: recipient,
          shippingCost: this.calculateShippingCost(recipient.zipCode),
          letterCost: this.calculateLetterCost(),
          totalCost: this.calculateShippingCost(recipient.zipCode) + this.calculateLetterCost(),
        })),
        { session }
      );

      // Letter 모델 업데이트
      await Letter.findByIdAndUpdate(
        letterId,
        {
          physicalRequested: true,
          multipleRecipientsEnabled: true,
          totalRecipients: requests.length,
          physicalStatus: "requested",
          physicalRequestDate: new Date(),
        },
        { session }
      );

      await session.commitTransaction();

      // 관리자 알림 (비동기)
      this.notifyAdminMultipleRequests(letter, requests).catch((error) => {
        console.error("관리자 알림 실패:", error);
      });

      return {
        letterId: letterId,
        totalRecipients: requests.length,
        totalCost: requests.reduce((sum, req) => sum + req.totalCost, 0),
        requests: requests.map((req) => ({
          id: req._id.toString(),
          recipientName: req.recipientInfo.name,
          address: `(${req.recipientInfo.zipCode}) ${req.recipientInfo.address1} ${req.recipientInfo.address2 || ""}`.trim(),
          cost: req.totalCost,
          status: req.status,
        })),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * 편지의 실물 편지 요청 목록 조회
   * @param letterId - 편지 ID
   * @param requesterId - 신청자 ID
   * @returns 요청 목록 및 요약 정보
   */
  async getPhysicalLetterRequests(letterId: string, requesterId: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    // 편지 존재 여부 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 해당 편지의 실물 편지 요청 목록 조회
    const requests = await PhysicalLetterRequest.find({
      letterId,
      requesterId,
    }).sort({ requestedAt: -1 });

    const summary = {
      totalRequests: requests.length,
      statusCounts: {
        requested: requests.filter((r) => r.status === PhysicalRequestStatus.REQUESTED).length,
        confirmed: requests.filter((r) => r.status === PhysicalRequestStatus.CONFIRMED).length,
        writing: requests.filter((r) => r.status === PhysicalRequestStatus.WRITING).length,
        sent: requests.filter((r) => r.status === PhysicalRequestStatus.SENT).length,
        delivered: requests.filter((r) => r.status === PhysicalRequestStatus.DELIVERED).length,
        failed: requests.filter((r) => r.status === PhysicalRequestStatus.FAILED).length,
        cancelled: requests.filter((r) => r.status === PhysicalRequestStatus.CANCELLED).length,
      },
      totalCost: requests.reduce((sum, req) => sum + req.totalCost, 0),
    };

    return {
      summary,
      requests: requests.map((req) => ({
        id: req._id.toString(),
        recipientInfo: req.recipientInfo,
        status: req.status,
        cost: req.totalCost,
        trackingNumber: req.trackingNumber,
        shippingCompany: req.shippingCompany,
        estimatedDelivery: req.estimatedDelivery,
        actualDelivery: req.actualDelivery,
        requestedAt: req.requestedAt,
        confirmedAt: req.confirmedAt,
        completedAt: req.completedAt,
      })),
    };
  }

  /**
   * 개별 실물 편지 요청 취소
   * @param requestId - 요청 ID
   * @param requesterId - 신청자 ID
   * @returns 취소 결과
   */
  async cancelPhysicalLetterRequest(requestId: string, requesterId: string) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new Error("올바르지 않은 요청 ID입니다.");
    }

    const request = await PhysicalLetterRequest.findOne({
      _id: requestId,
      requesterId,
    });

    if (!request) {
      throw new Error("요청을 찾을 수 없습니다.");
    }

    // 취소 가능한 상태 확인
    if (![PhysicalRequestStatus.REQUESTED, PhysicalRequestStatus.CONFIRMED].includes(request.status)) {
      throw new Error(`이미 처리가 시작된 요청은 취소할 수 없습니다. 현재 상태: ${request.status}`);
    }

    // 요청 취소
    request.status = PhysicalRequestStatus.CANCELLED;
    request.updatedAt = new Date();
    await request.save();

    // Letter 모델의 카운트 업데이트
    const remainingRequests = await PhysicalLetterRequest.countDocuments({
      letterId: request.letterId,
      requesterId: requesterId,
      status: { $ne: PhysicalRequestStatus.CANCELLED },
    });

    if (remainingRequests === 0) {
      await Letter.findByIdAndUpdate(request.letterId, {
        physicalRequested: false,
        multipleRecipientsEnabled: false,
        totalRecipients: 0,
        physicalStatus: "none",
      });
    } else {
      await Letter.findByIdAndUpdate(request.letterId, {
        totalRecipients: remainingRequests,
      });
    }

    return {
      requestId: request._id.toString(),
      recipientName: request.recipientInfo.name,
      status: request.status,
    };
  }

  /**
   * 관리자용 실물 편지 요청 목록 조회
   * @param filters - 필터 조건
   * @returns 요청 목록 및 통계
   */
  async getAdminPhysicalLetterRequests(filters: { status?: string; letterId?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string }) {
    const { status, letterId, page = 1, limit = 20, sortBy = "requestedAt", sortOrder = "desc" } = filters;

    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    if (letterId) filter.letterId = letterId;

    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (page - 1) * limit;

    const [requests, total, stats] = await Promise.all([
      PhysicalLetterRequest.find(filter).populate("letterId", "title ogTitle").populate("requesterId", "name email").populate("assignedAdmin", "name").sort(sort).skip(skip).limit(limit).lean(),
      PhysicalLetterRequest.countDocuments(filter),
      PhysicalLetterRequest.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalCost: { $sum: "$totalCost" },
          },
        },
      ]),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalCost: stat.totalCost,
        };
        return acc;
      }, {} as any),
    };
  }

  /**
   * 관리자용 실물 편지 요청 상태 업데이트
   * @param requestId - 요청 ID
   * @param updateData - 업데이트 데이터
   * @param adminId - 관리자 ID
   * @returns 업데이트된 요청 정보
   */
  async updatePhysicalLetterRequestStatus(
    requestId: string,
    updateData: {
      status?: PhysicalRequestStatus;
      adminNotes?: string;
      trackingNumber?: string;
      shippingCompany?: string;
      estimatedDelivery?: Date;
      actualDelivery?: Date;
    },
    adminId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new Error("올바르지 않은 요청 ID입니다.");
    }

    const { status, adminNotes, trackingNumber, shippingCompany, estimatedDelivery, actualDelivery } = updateData;

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (status) {
      const validStatuses = Object.values(PhysicalRequestStatus);
      if (!validStatuses.includes(status)) {
        throw new Error(`올바르지 않은 상태값입니다. 가능한 값: ${validStatuses.join(", ")}`);
      }
      updateFields.status = status;

      // 상태별 타임스탬프 업데이트
      if (status === PhysicalRequestStatus.CONFIRMED) updateFields.confirmedAt = new Date();
      if (status === PhysicalRequestStatus.DELIVERED) updateFields.completedAt = new Date();
      if (actualDelivery) updateFields.actualDelivery = new Date(actualDelivery);
    }

    if (adminNotes !== undefined) updateFields.adminNotes = adminNotes;
    if (trackingNumber) updateFields.trackingNumber = trackingNumber;
    if (shippingCompany) updateFields.shippingCompany = shippingCompany;
    if (estimatedDelivery) updateFields.estimatedDelivery = new Date(estimatedDelivery);
    if (!updateFields.assignedAdmin) updateFields.assignedAdmin = adminId;

    const updatedRequest = await PhysicalLetterRequest.findByIdAndUpdate(requestId, updateFields, { new: true }).populate("letterId", "title");

    if (!updatedRequest) {
      throw new Error("요청을 찾을 수 없습니다.");
    }

    // Letter 모델의 완료 카운트 업데이트
    if (status === PhysicalRequestStatus.DELIVERED) {
      const completedCount = await PhysicalLetterRequest.countDocuments({
        letterId: updatedRequest.letterId,
        status: PhysicalRequestStatus.DELIVERED,
      });

      await Letter.findByIdAndUpdate(updatedRequest.letterId, {
        completedRecipients: completedCount,
      });
    }

    return updatedRequest;
  }

  /**
   * 다중 요청 데이터 검증
   * @param data - 요청 데이터
   */
  private validateMultipleRequest(data: MultipleRecipientRequest): void {
    if (!data.recipients || !Array.isArray(data.recipients) || data.recipients.length === 0) {
      throw new Error("최소 1명 이상의 수신자 정보가 필요합니다.");
    }

    if (data.recipients.length > 10) {
      throw new Error("한 번에 최대 10명까지만 신청 가능합니다.");
    }
  }

  /**
   * 모든 수신자 정보 검증
   * @param recipients - 수신자 배열
   * @returns 검증된 수신자 배열
   */
  private validateAllRecipients(recipients: IRecipientInfo[]): IRecipientInfo[] {
    const validatedRecipients: IRecipientInfo[] = [];
    const errors: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const validation = this.validateRecipientInfo(recipient, i + 1);

      if (validation.isValid && validation.data) {
        validatedRecipients.push(validation.data);
      } else if (validation.errors) {
        errors.push(...validation.errors);
      }
    }

    if (errors.length > 0) {
      throw new Error(`수신자 정보에 오류가 있습니다: ${errors.join(", ")}`);
    }

    return validatedRecipients;
  }

  /**
   * 개별 수신자 정보 검증
   * @param recipient - 수신자 정보
   * @param index - 수신자 순번
   * @returns 검증 결과
   */
  private validateRecipientInfo(recipient: IRecipientInfo, index: number): RecipientValidationResult {
    const errors: string[] = [];

    if (!recipient.name || recipient.name.trim().length === 0) {
      errors.push(`${index}번째 수신자: 이름이 필요합니다.`);
    }

    if (!recipient.phone || !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(recipient.phone.replace(/-/g, ""))) {
      errors.push(`${index}번째 수신자: 올바른 휴대폰 번호가 필요합니다.`);
    }

    if (!recipient.zipCode || !/^[0-9]{5}$/.test(recipient.zipCode)) {
      errors.push(`${index}번째 수신자: 올바른 우편번호가 필요합니다.`);
    }

    if (!recipient.address1 || recipient.address1.trim().length === 0) {
      errors.push(`${index}번째 수신자: 주소가 필요합니다.`);
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      data: {
        name: recipient.name.trim(),
        phone: recipient.phone.replace(/-/g, "").replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3"),
        zipCode: recipient.zipCode,
        address1: recipient.address1.trim(),
        address2: recipient.address2?.trim() || "",
        memo: recipient.memo?.trim() || "",
      },
    };
  }

  /**
   * 배송비 계산
   * @param zipCode - 우편번호
   * @returns 배송비
   */
  private calculateShippingCost(zipCode: string): number {
    // 우편번호 기반 배송비 계산 로직
    // 서울/경기 3000원, 기타 지역 3500원
    const seoulGyeonggi = ["01", "02", "03", "04", "05", "06", "07", "08", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];
    const prefix = zipCode.substring(0, 2);
    return seoulGyeonggi.includes(prefix) ? 3000 : 3500;
  }

  /**
   * 편지 작성비 계산
   * @returns 편지 작성비
   */
  private calculateLetterCost(): number {
    // 편지 작성비 (고정)
    return 2000;
  }

  /**
   * 관리자 알림
   * @param _letter - 편지 정보
   * @param _requests - 요청 목록
   */
  private async notifyAdminMultipleRequests(letter: any, requests: IPhysicalLetterRequest[]): Promise<void> {
    console.log(`[알림] 다중 실물 편지 신청 - letterId: ${letter._id}, 신청 수: ${requests.length}`);
  }
}

export default new MultiplePhysicalLetterService();
