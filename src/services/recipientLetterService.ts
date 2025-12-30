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
}

class RecipientLetterService {
  /**
   * 고유 ID 생성 (UUID 대신 간단한 방식 사용)
   */
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
  /**
   * 실물 편지 신청 (Letter의 recipientAddresses에 저장)
   */
  async requestPhysicalLetter(letterId: string, sessionId: string, userAgent: string, ipAddress: string, requestData: IPhysicalRequestData): Promise<IPhysicalRequestResult> {
    console.log(`🔍 [DEBUG] Physical letter request for letterId: ${letterId}`);
    console.log(`📋 [DEBUG] Request data:`, requestData);
    console.log(`🔑 [DEBUG] Session ID: ${sessionId}`);

    // 입력 데이터 검증
    if (!requestData) {
      throw new Error("요청 데이터가 없습니다.");
    }

    // address 객체로 감싸져 있는 경우 처리
    const addressData = (requestData as any).address || requestData;
    const { name, phone, zipCode, address1, address2, memo } = addressData;

    console.log(`📋 [DEBUG] Processed address data:`, { name, phone, zipCode, address1, address2, memo });

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

    // 동일 세션에서 이미 신청했는지 확인
    const existingRequest = letter.recipientAddresses.find((addr: any) => addr.sessionId === sessionId && addr.isPhysicalRequested);

    if (existingRequest) {
      throw new Error("이미 이 편지에 대해 실물 편지를 신청하셨습니다.");
    }

    // 고유 요청 ID 생성
    const requestId = this.generateUniqueId();

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

    console.log(`✅ [DEBUG] Physical letter request saved with ID: ${requestId}`);

    return {
      requestId,
      letterId: letter._id.toString(),
      recipientInfo: newRecipientAddress as IRecipientAddress,
      needsApproval: !letter.authorSettings.autoApprove,
      status: newRecipientAddress.physicalStatus!,
    };
  }

  /**
   * 편지별 실물 편지 신청 목록 조회
   */
  async getPhysicalRequests(letterId: string) {
    console.log(`🔍 [DEBUG] Getting physical requests for letterId: ${letterId}`);

    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId).lean();
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 실물 편지 신청된 주소들만 필터링
    const physicalRequests = letter.recipientAddresses.filter((addr: any) => addr.isPhysicalRequested);

    console.log(`📊 [DEBUG] Found ${physicalRequests.length} physical requests for letter ${letterId}`);

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
   * 작성자용 신청 승인/거절
   */
  async processApproval(letterId: string, requestId: string, authorId: string, action: "approve" | "reject", rejectionReason?: string) {
    console.log(`🔍 [DEBUG] Processing approval for request ${requestId} in letter ${letterId}`);

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

    console.log(`✅ [DEBUG] Request ${requestId} ${action}d successfully`);

    return {
      requestId,
      status: request.physicalStatus,
      message: action === "approve" ? "신청이 승인되었습니다." : "신청이 거절되었습니다.",
    };
  }

  /**
   * 개별 신청 상태 조회 (세션 기반)
   */
  async getRequestStatus(requestId: string, sessionId: string) {
    console.log(`🔍 [DEBUG] Getting request status for ${requestId} with session ${sessionId}`);

    const letter = await Letter.findOne({
      "recipientAddresses.requestId": requestId,
    }).lean();

    if (!letter) {
      throw new Error("신청을 찾을 수 없습니다.");
    }

    const request = letter.recipientAddresses.find((addr: any) => addr.requestId === requestId);

    if (!request) {
      throw new Error("신청을 찾을 수 없습니다.");
    }

    // 세션 확인 (보안)
    if (request.sessionId !== sessionId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return {
      requestId,
      letterId: letter._id.toString(),
      status: request.physicalStatus,
      requestedAt: request.physicalRequestDate,
      recipientInfo: {
        name: request.name,
        phone: request.phone,
        address: `(${request.zipCode}) ${request.address1} ${request.address2}`.trim(),
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
   * 세션 ID 생성
   */
  generateSessionId(): string {
    return this.generateUniqueId();
  }
}

export default new RecipientLetterService();
