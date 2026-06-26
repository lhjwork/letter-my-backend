import Letter, { IRecipientAddress } from "../models/Letter";
import mongoose from "mongoose";

export interface IPhysicalRequestData {
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

export interface IPhysicalRequestResult {
  requestId: string;
  letterId: string;
  recipientInfo: IRecipientAddress;
  needsApproval: boolean;
  status: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
}

class RecipientLetterService {
  /**
   * 고유 ID 생성 (UUID 대신 간단한 방식 사용)
   */
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  /**
   * 세션 ID 생성
   */
  generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * 신청 상태 조회 (letterId와 requestId로)
   */
  async getPhysicalRequestStatus(letterId: string, requestId: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("유효하지 않은 편지 ID입니다.");
    }

    if (!requestId) {
      throw new Error("유효하지 않은 신청 ID입니다.");
    }

    // 편지와 신청 정보 조회
    const letter = await Letter.findOne({
      _id: letterId,
      "recipientAddresses.requestId": requestId,
      "recipientAddresses.isPhysicalRequested": true,
    }).lean();

    if (!letter) {
      throw new Error("신청을 찾을 수 없습니다.");
    }

    // 해당 신청 찾기
    const request = letter.recipientAddresses.find((addr: any) => addr.requestId === requestId);

    if (!request) {
      throw new Error("신청을 찾을 수 없습니다.");
    }

    // 상태 이력 구성
    const statusHistory: any = {
      requested: request.physicalRequestDate,
    };

    // 각 상태별 타임스탬프 추가 (현재는 모두 physicalRequestDate 사용, 향후 개별 필드 추가 가능)
    if (request.physicalStatus === "approved" || request.physicalStatus === "writing" || request.physicalStatus === "sent" || request.physicalStatus === "delivered") {
      statusHistory.approved = request.physicalRequestDate;
    }
    if (request.physicalStatus === "writing" || request.physicalStatus === "sent" || request.physicalStatus === "delivered") {
      statusHistory.writing = request.physicalRequestDate;
    }
    if (request.physicalStatus === "sent" || request.physicalStatus === "delivered") {
      statusHistory.sent = request.physicalRequestDate;
    }
    if (request.physicalStatus === "delivered") {
      statusHistory.delivered = request.physicalRequestDate;
    }

    // 배송 예상일 계산
    let estimatedDelivery = null;
    if ((request.physicalStatus === "sent" || request.physicalStatus === "delivered") && request.physicalRequestDate) {
      estimatedDelivery = this.calculateEstimatedDelivery(request.physicalRequestDate);
    }

    return {
      requestId: request.requestId,
      letterId: letter._id.toString(),
      letterTitle: letter.title || letter.ogTitle || "편지",
      status: request.physicalStatus,
      recipientInfo: {
        name: request.name,
        address: `${request.address1}${request.address2 ? ` ${request.address2}` : ""}`.trim(),
      },
      statusHistory: {
        requested: statusHistory.requested,
        approved: statusHistory.approved || null,
        writing: statusHistory.writing || null,
        sent: statusHistory.sent || null,
        delivered: statusHistory.delivered || null,
      },
      trackingInfo: {
        canTrack: request.physicalStatus !== "requested",
        estimatedDelivery,
      },
    };
  }
  /**
   * 실물 편지 신청 (로그인 없이 가능)
   */
  async requestPhysicalLetter(letterId: string, sessionId: string, userAgent: string, ipAddress: string, requestData: IPhysicalRequestData, userId?: string): Promise<IPhysicalRequestResult> {
    // 입력 데이터 검증
    if (!requestData) {
      throw new Error("요청 데이터가 없습니다.");
    }

    const addressData = (requestData as any).address || requestData;
    const { name, phone, zipCode, address1, address2, memo } = addressData;

    // 필수 필드 검증
    if (!name || typeof name !== "string") {
      throw new Error("받는 분 성함은 필수입니다.");
    }
    if (!phone || typeof phone !== "string") {
      throw new Error("전화번호는 필수입니다.");
    }
    if (!zipCode || typeof zipCode !== "string") {
      throw new Error("우편번호는 필수입니다.");
    }
    if (!address1 || typeof address1 !== "string") {
      throw new Error("주소는 필수입니다.");
    }

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    // 편지 존재 여부 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 중복 확인
    const { isDuplicate, duplicateOf } = await this.checkDuplicate(letterId, phone, sessionId, userId);

    if (isDuplicate) {
      // 중복 신청이지만 요청 ID는 반환 (사용자가 상태 조회 가능하도록)
      return {
        requestId: duplicateOf!,
        letterId: letter._id.toString(),
        recipientInfo: {
          name: name.trim(),
          phone: this.normalizePhoneNumber(phone),
          zipCode: zipCode.trim(),
          address1: address1.trim(),
          address2: address2?.trim() || "",
          memo: memo?.trim() || "",
          addedAt: new Date(),
          isPhysicalRequested: true,
          physicalRequestDate: new Date(),
          physicalStatus: "requested",
          sessionId,
          userAgent,
          ipAddress: this.hashIP(ipAddress),
          requestId: duplicateOf!,
          isDuplicate: true,
          duplicateOf,
        } as any,
        needsApproval: !letter.authorSettings.autoApprove,
        status: "requested",
        isDuplicate: true,
        duplicateOf,
      };
    }

    // 고유 요청 ID 생성
    const requestId = this.generateUniqueId();

    // 신청자 타입 결정
    const requesterType = userId ? "authenticated" : "anonymous";
    const requesterId = userId || sessionId;

    // 새로운 수신자 주소 및 실물 편지 신청 정보 생성
    const newRecipientAddress: Partial<IRecipientAddress> = {
      name: name.trim(),
      phone: this.normalizePhoneNumber(phone),
      zipCode: zipCode.trim(),
      address1: address1.trim(),
      address2: address2?.trim() || "",
      memo: memo?.trim() || "",
      addedAt: new Date(),
      // 실물 편지 신청 정보
      isPhysicalRequested: true,
      physicalRequestDate: new Date(),
      physicalStatus: letter.authorSettings.autoApprove ? "approved" : "requested",
      sessionId,
      userAgent,
      ipAddress: this.hashIP(ipAddress),
      requestId,
      // 신청자 정보
      requesterId,
      requesterType: requesterType as any,
      isDuplicate: false,
    };

    // Letter에 수신자 주소 추가
    letter.recipientAddresses.push(newRecipientAddress as any);

    // 통계 업데이트
    letter.physicalLetterStats.totalRequests += 1;
    if (letter.authorSettings.autoApprove) {
      letter.physicalLetterStats.approvedRequests += 1;
    } else {
      letter.physicalLetterStats.pendingRequests += 1;
    }

    await letter.save();

    return {
      requestId,
      letterId: letter._id.toString(),
      recipientInfo: newRecipientAddress as IRecipientAddress,
      needsApproval: !letter.authorSettings.autoApprove,
      status: newRecipientAddress.physicalStatus!,
      isDuplicate: false,
    };
  }

  /**
   * 편지별 실물 편지 신청 목록 조회
   */
  async getPhysicalRequests(letterId: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId).lean();
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 실물 편지 신청된 주소들만 필터링
    const physicalRequests = letter.recipientAddresses.filter((addr: any) => addr.isPhysicalRequested);

    return {
      letterId,
      totalRequests: physicalRequests.length,
      requests: physicalRequests.map((req: any) => ({
        requestId: req.requestId,
        name: req.name,
        phone: req.phone,
        address: `(${req.zipCode}) ${req.address1} ${req.address2}`.trim(),
        status: req.physicalStatus,
        requestedAt: req.physicalRequestDate,
        memo: req.memo,
      })),
      stats: letter.physicalLetterStats,
    };
  }

  /**
   * 작성자용 수신자 목록 조회 (권한 확인 포함)
   */
  async getAuthorRecipients(letterId: string, authorId: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId).lean();
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 작성자 권한 확인
    if (letter.userId?.toString() !== authorId) {
      throw new Error("이 편지의 작성자만 수신자 목록을 조회할 수 있습니다.");
    }

    // 실물 편지 신청된 주소들만 필터링
    const physicalRequests = letter.recipientAddresses.filter((addr: any) => addr.isPhysicalRequested);

    return {
      letterId,
      letterTitle: letter.title,
      authorName: letter.authorName,
      totalRequests: physicalRequests.length,
      recipients: physicalRequests.map((req: any) => ({
        requestId: req.requestId,
        name: req.name,
        phone: req.phone,
        zipCode: req.zipCode,
        address1: req.address1,
        address2: req.address2,
        fullAddress: `(${req.zipCode}) ${req.address1} ${req.address2}`.trim(),
        status: req.physicalStatus,
        requestedAt: req.physicalRequestDate,
        memo: req.memo,
        sessionId: req.sessionId?.substring(0, 8) + "...", // 보안을 위해 일부만 표시
      })),
      stats: {
        total: letter.physicalLetterStats.totalRequests,
        pending: letter.physicalLetterStats.pendingRequests,
        approved: letter.physicalLetterStats.approvedRequests,
        rejected: letter.physicalLetterStats.rejectedRequests,
        completed: letter.physicalLetterStats.completedRequests,
      },
      authorSettings: letter.authorSettings,
    };
  }

  /**
   * 작성자용 신청 승인/거절
   */
  async processApproval(letterId: string, requestId: string, authorId: string, action: "approve" | "reject", rejectionReason?: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 작성자 권한 확인
    if (letter.userId?.toString() !== authorId) {
      throw new Error("이 편지의 작성자만 승인/거절할 수 있습니다.");
    }

    // 해당 신청 찾기
    const requestIndex = letter.recipientAddresses.findIndex((addr: any) => addr.requestId === requestId && addr.isPhysicalRequested);

    if (requestIndex === -1) {
      throw new Error("해당 신청을 찾을 수 없습니다.");
    }

    const request = letter.recipientAddresses[requestIndex];

    // 이미 처리된 신청인지 확인
    if (request.physicalStatus !== "requested") {
      throw new Error("이미 처리된 신청입니다.");
    }

    // 상태 업데이트
    if (action === "approve") {
      request.physicalStatus = "approved";
      letter.physicalLetterStats.pendingRequests -= 1;
      letter.physicalLetterStats.approvedRequests += 1;
    } else {
      request.physicalStatus = "rejected";
      if (rejectionReason) {
        request.memo = `거절 사유: ${rejectionReason}`;
      }
      letter.physicalLetterStats.pendingRequests -= 1;
      letter.physicalLetterStats.rejectedRequests += 1;
    }

    await letter.save();

    return {
      requestId,
      status: request.physicalStatus,
      message: action === "approve" ? "신청이 승인되었습니다." : "신청이 거절되었습니다.",
    };
  }

  /**
   * 개별 신청 상태 조회 (requestId 기반 - 세션 불필요)
   */
  async getRequestStatusByRequestId(requestId: string) {
    const letter = await Letter.findOne({
      "recipientAddresses.requestId": requestId,
    }).lean();

    if (!letter) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    const request = letter.recipientAddresses.find((addr: any) => addr.requestId === requestId);

    if (!request) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    return {
      requestId,
      letterId: letter._id.toString(),
      letterTitle: letter.ogTitle || letter.title,
      letterAuthor: letter.authorName,
      status: request.physicalStatus,
      requestedAt: request.physicalRequestDate,
      recipientInfo: {
        name: request.name,
        phone: request.phone,
        address: `(${request.zipCode}) ${request.address1} ${request.address2}`.trim(),
      },
      statusHistory: {
        requested: request.physicalRequestDate,
        approved:
          request.physicalStatus === "approved" || request.physicalStatus === "writing" || request.physicalStatus === "sent" || request.physicalStatus === "delivered"
            ? request.physicalRequestDate
            : null,
        writing: request.physicalStatus === "writing" || request.physicalStatus === "sent" || request.physicalStatus === "delivered" ? request.physicalRequestDate : null,
        sent: request.physicalStatus === "sent" || request.physicalStatus === "delivered" ? request.physicalRequestDate : null,
        delivered: request.physicalStatus === "delivered" ? request.physicalRequestDate : null,
      },
      trackingInfo: {
        canTrack: request.physicalStatus ? ["sent", "delivered"].includes(request.physicalStatus) : false,
        estimatedDelivery: request.physicalStatus === "sent" && request.physicalRequestDate ? this.calculateEstimatedDelivery(request.physicalRequestDate) : null,
      },
    };
  }

  /**
   * 전화번호 정규화
   */
  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, "").replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3");
  }

  /**
   * IP 주소 해시화 (개인정보 보호)
   */
  private hashIP(ip: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
  }

  /**
   * 중복 신청 확인
   */
  private async checkDuplicate(letterId: string, phone: string, sessionId?: string, userId?: string): Promise<{ isDuplicate: boolean; duplicateOf?: string }> {
    // 1. 같은 편지에 같은 전화번호로 신청한 기록 확인
    const normalizedPhone = this.normalizePhoneNumber(phone);
    const existingByPhone = await Letter.findOne({
      _id: letterId,
      "recipientAddresses.phone": normalizedPhone,
      "recipientAddresses.isPhysicalRequested": true,
      "recipientAddresses.physicalStatus": { $ne: "rejected" },
    }).lean();

    if (existingByPhone) {
      const duplicate = existingByPhone.recipientAddresses.find((addr: any) => addr.phone === normalizedPhone && addr.isPhysicalRequested);

      if (duplicate) {
        return {
          isDuplicate: true,
          duplicateOf: duplicate.requestId,
        };
      }
    }

    // 2. 로그인 사용자인 경우 userId로도 확인
    if (userId) {
      const existingByUserId = await Letter.findOne({
        _id: letterId,
        "recipientAddresses.requesterId": userId,
        "recipientAddresses.requesterType": "authenticated",
        "recipientAddresses.isPhysicalRequested": true,
        "recipientAddresses.physicalStatus": { $ne: "rejected" },
      }).lean();

      if (existingByUserId) {
        const duplicate = existingByUserId.recipientAddresses.find((addr: any) => addr.requesterId === userId && addr.requesterType === "authenticated");

        if (duplicate) {
          return {
            isDuplicate: true,
            duplicateOf: duplicate.requestId,
          };
        }
      }
    }

    // 3. 익명 사용자인 경우 sessionId로도 확인
    if (sessionId) {
      const existingBySessionId = await Letter.findOne({
        _id: letterId,
        "recipientAddresses.requesterId": sessionId,
        "recipientAddresses.requesterType": "anonymous",
        "recipientAddresses.isPhysicalRequested": true,
        "recipientAddresses.physicalStatus": { $ne: "rejected" },
      }).lean();

      if (existingBySessionId) {
        const duplicate = existingBySessionId.recipientAddresses.find((addr: any) => addr.requesterId === sessionId && addr.requesterType === "anonymous");

        if (duplicate) {
          return {
            isDuplicate: true,
            duplicateOf: duplicate.requestId,
          };
        }
      }
    }

    return {
      isDuplicate: false,
    };
  }

  /**
   * 배송 예상일 계산 (발송일로부터 2-3일 후)
   */
  private calculateEstimatedDelivery(sentDate: Date): string {
    const delivery = new Date(sentDate);
    delivery.setDate(delivery.getDate() + 3); // 3일 후
    return delivery.toISOString().split("T")[0]; // YYYY-MM-DD 형식
  }

  /**
   * 편지별 간단한 실물 편지 상태 조회 (사용자 기반)
   */
  async getSimplePhysicalStatus(letterId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId).lean();
    if (!letter) {
      throw new Error("LETTER_NOT_FOUND");
    }

    // 현재 사용자의 실물 편지 신청 내역 조회
    const userRequests = letter.recipientAddresses.filter((addr: any) => addr.isPhysicalRequested && addr.sessionId && this.isUserRequest(addr, userId));

    // 신청 내역이 없는 경우
    if (userRequests.length === 0) {
      return {
        letterId: letter._id.toString(),
        letterTitle: letter.ogTitle || letter.title,
        hasRequest: false,
        currentStatus: null,
      };
    }

    // 상태 우선순위 정의 (가장 진행된 상태 찾기)
    const STATUS_PRIORITY = {
      delivered: 6,
      sent: 5,
      writing: 4,
      approved: 3,
      requested: 2,
      rejected: 1,
      none: 0,
    };

    // 가장 진행된 상태 찾기
    const highestStatusRequest = userRequests.reduce((highest: any, current: any) => {
      const currentPriority = STATUS_PRIORITY[current.physicalStatus as keyof typeof STATUS_PRIORITY] || 0;
      const highestPriority = STATUS_PRIORITY[highest.physicalStatus as keyof typeof STATUS_PRIORITY] || 0;
      return currentPriority > highestPriority ? current : highest;
    });

    // 상태 라벨 및 메시지 생성
    const statusInfo = this.getStatusInfo(highestStatusRequest.physicalStatus || "none");

    return {
      letterId: letter._id.toString(),
      letterTitle: letter.ogTitle || letter.title,
      hasRequest: true,
      currentStatus: {
        status: highestStatusRequest.physicalStatus,
        statusLabel: statusInfo.label,
        statusMessage: statusInfo.message,
        lastUpdated: highestStatusRequest.physicalRequestDate,
        estimatedDelivery:
          highestStatusRequest.physicalStatus === "sent" && highestStatusRequest.physicalRequestDate ? this.calculateEstimatedDelivery(highestStatusRequest.physicalRequestDate) : null,
      },
    };
  }

  /**
   * 사용자 요청 여부 확인 (requesterId 기반)
   */
  private isUserRequest(request: any, userId: string): boolean {
    if (!request.requesterId) return false;
    if (request.requesterType === "authenticated") {
      return request.requesterId === userId;
    }
    // 익명 사용자의 경우 sessionId로 매칭
    return request.requesterId === userId;
  }

  /**
   * 상태별 라벨 및 메시지 반환
   */
  private getStatusInfo(status: string): { label: string; message: string } {
    const statusMap = {
      none: {
        label: "상태 없음",
        message: "아직 상태가 설정되지 않았습니다.",
      },
      requested: {
        label: "승인 대기중",
        message: "편지 작성자의 승인을 기다리고 있습니다.",
      },
      approved: {
        label: "승인 완료",
        message: "신청이 승인되었습니다. 곧 편지 작성을 시작합니다.",
      },
      rejected: {
        label: "승인 거절",
        message: "신청이 거절되었습니다.",
      },
      writing: {
        label: "작성 중",
        message: "편지를 손으로 작성하고 있습니다.",
      },
      sent: {
        label: "발송 완료",
        message: "편지가 발송되었습니다. 곧 도착할 예정입니다.",
      },
      delivered: {
        label: "배송 완료",
        message: "편지가 성공적으로 배송되었습니다.",
      },
    };

    return (
      statusMap[status as keyof typeof statusMap] || {
        label: "알 수 없음",
        message: "상태를 확인할 수 없습니다.",
      }
    );
  }

  /**
   * 사용자별 실물 편지 상태 조회 (권한 확인 포함)
   */
  async getPhysicalStatusForUser(letterId: string, sessionId: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId).lean();
    if (!letter) {
      throw new Error("LETTER_NOT_FOUND");
    }

    // 해당 세션의 실물 편지 신청 내역 조회
    const userRequests = letter.recipientAddresses.filter((addr: any) => addr.sessionId === sessionId && addr.isPhysicalRequested);

    // 임시: 세션 ID가 매칭되지 않는 경우 가장 최근 신청을 반환 (개발/테스트용)
    if (userRequests.length === 0 && process.env.NODE_ENV === "development") {
      const allPhysicalRequests = letter.recipientAddresses.filter((addr: any) => addr.isPhysicalRequested);
      if (allPhysicalRequests.length > 0) {
        // 가장 최근 신청을 사용
        const latestRequest = allPhysicalRequests.sort((a: any, b: any) => new Date(b.physicalRequestDate).getTime() - new Date(a.physicalRequestDate).getTime())[0];
        userRequests.push(latestRequest);
      }
    }

    // 신청 내역이 없으면 403 에러
    if (userRequests.length === 0) {
      throw new Error("NO_PHYSICAL_REQUESTS");
    }

    // 상태 우선순위 정의
    const STATUS_PRIORITY = {
      delivered: 6,
      sent: 5,
      writing: 4,
      approved: 3,
      requested: 2,
      rejected: 1,
      none: 0,
    };

    // 가장 진행된 상태 찾기
    const highestStatusRequest = userRequests.reduce((highest: any, current: any) => {
      const currentPriority = STATUS_PRIORITY[current.physicalStatus as keyof typeof STATUS_PRIORITY] || 0;
      const highestPriority = STATUS_PRIORITY[highest.physicalStatus as keyof typeof STATUS_PRIORITY] || 0;
      return currentPriority > highestPriority ? current : highest;
    });

    return {
      letterId: letter._id.toString(),
      letterTitle: letter.ogTitle || letter.title,
      totalUserRequests: userRequests.length,
      deliveryStatus: {
        status: highestStatusRequest.physicalStatus,
        sentDate: highestStatusRequest.physicalStatus === "sent" || highestStatusRequest.physicalStatus === "delivered" ? highestStatusRequest.physicalRequestDate : null,
        trackingNumber: null, // 향후 확장 가능
      },
      userRequests: userRequests.map((req: any) => ({
        requestId: req.requestId,
        status: req.physicalStatus,
        requestedAt: req.physicalRequestDate,
        approvedAt: req.physicalStatus === "approved" || req.physicalStatus === "writing" || req.physicalStatus === "sent" || req.physicalStatus === "delivered" ? req.physicalRequestDate : null,
        writingStartedAt: req.physicalStatus === "writing" || req.physicalStatus === "sent" || req.physicalStatus === "delivered" ? req.physicalRequestDate : null,
        sentDate: req.physicalStatus === "sent" || req.physicalStatus === "delivered" ? req.physicalRequestDate : null,
        recipientInfo: {
          name: req.name,
          address: `(${req.zipCode}) ${req.address1} ${req.address2}`.trim(),
        },
      })),
    };
  }
}

export default new RecipientLetterService();
