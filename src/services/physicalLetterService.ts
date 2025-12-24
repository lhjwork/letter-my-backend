import Letter, { ILetter, PhysicalLetterStatus } from "../models/Letter";
import mongoose from "mongoose";

export interface PhysicalLetterRequest {
  name: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
}

export interface PhysicalLetterResponse {
  letterId: string;
  physicalStatus: PhysicalLetterStatus;
  requestDate: Date;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
  };
}

class PhysicalLetterService {
  /**
   * 실물 편지 신청
   * @param letterId - 편지 ID
   * @param addressData - 배송 주소 정보
   * @returns 신청 결과
   */
  async requestPhysicalLetter(letterId: string, addressData: PhysicalLetterRequest): Promise<PhysicalLetterResponse> {
    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    // 입력 데이터 검증
    this.validateAddressData(addressData);

    // 편지 존재 여부 확인
    const letter = await Letter.findById(letterId);
    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    // 이미 신청된 편지인지 확인
    if (letter.physicalRequested) {
      throw new Error(`이미 실물 편지가 신청된 편지입니다. 현재 상태: ${letter.physicalStatus}`);
    }

    // 연락처 및 우편번호 형식 검증
    const normalizedPhone = this.normalizePhoneNumber(addressData.phone);
    this.validateZipCode(addressData.zipCode);

    // 실물 편지 신청 정보 업데이트
    const updatedLetter = await Letter.findByIdAndUpdate(
      letterId,
      {
        physicalRequested: true,
        physicalRequestDate: new Date(),
        physicalStatus: PhysicalLetterStatus.REQUESTED,
        shippingAddress: {
          name: addressData.name.trim(),
          phone: normalizedPhone,
          zipCode: addressData.zipCode,
          address1: addressData.address1.trim(),
          address2: addressData.address2?.trim() || "",
          requestedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedLetter) {
      throw new Error("편지 업데이트에 실패했습니다.");
    }

    // 관리자 알림 (비동기)
    this.notifyAdminNewRequest(updatedLetter).catch((error) => {
      console.error("관리자 알림 실패:", error);
    });

    return {
      letterId: updatedLetter._id.toString(),
      physicalStatus: updatedLetter.physicalStatus as PhysicalLetterStatus,
      requestDate: updatedLetter.physicalRequestDate!,
      shippingAddress: {
        name: updatedLetter.shippingAddress!.name,
        phone: updatedLetter.shippingAddress!.phone,
        address: `(${updatedLetter.shippingAddress!.zipCode}) ${updatedLetter.shippingAddress!.address1} ${updatedLetter.shippingAddress!.address2}`.trim(),
      },
    };
  }

  /**
   * 실물 편지 상태 조회
   * @param letterId - 편지 ID
   * @returns 상태 정보
   */
  async getPhysicalLetterStatus(letterId: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const letter = await Letter.findById(letterId).select("physicalRequested physicalStatus physicalRequestDate shippingAddress physicalNotes");

    if (!letter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    if (!letter.physicalRequested) {
      return {
        physicalRequested: false,
        status: PhysicalLetterStatus.NONE,
      };
    }

    return {
      physicalRequested: letter.physicalRequested,
      status: letter.physicalStatus,
      requestDate: letter.physicalRequestDate,
      shippingAddress: letter.shippingAddress,
      notes: letter.physicalNotes,
    };
  }

  /**
   * 관리자용 실물 편지 목록 조회
   * @param status - 상태 필터
   * @param page - 페이지 번호
   * @param limit - 페이지당 항목 수
   * @returns 신청 목록
   */
  async getPhysicalLetterRequests(status?: string, page: number = 1, limit: number = 20) {
    const filter: any = { physicalRequested: true };

    if (status && status !== "all") {
      filter.physicalStatus = status;
    }

    const skip = (page - 1) * limit;

    const [letters, total] = await Promise.all([
      Letter.find(filter).select("title physicalStatus physicalRequestDate shippingAddress physicalNotes createdAt").sort({ physicalRequestDate: -1 }).skip(skip).limit(limit).lean(),
      Letter.countDocuments(filter),
    ]);

    return {
      data: letters,
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
   * 관리자용 실물 편지 상태 업데이트
   * @param letterId - 편지 ID
   * @param status - 새로운 상태
   * @param notes - 관리자 메모
   * @returns 업데이트된 정보
   */
  async updatePhysicalLetterStatus(letterId: string, status: PhysicalLetterStatus, notes?: string) {
    if (!mongoose.Types.ObjectId.isValid(letterId)) {
      throw new Error("올바르지 않은 편지 ID입니다.");
    }

    const validStatuses = Object.values(PhysicalLetterStatus);
    if (!validStatuses.includes(status)) {
      throw new Error(`올바르지 않은 상태값입니다. 가능한 값: ${validStatuses.join(", ")}`);
    }

    const updatedLetter = await Letter.findByIdAndUpdate(
      letterId,
      {
        physicalStatus: status,
        physicalNotes: notes || "",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedLetter) {
      throw new Error("편지를 찾을 수 없습니다.");
    }

    return {
      letterId: updatedLetter._id.toString(),
      status: updatedLetter.physicalStatus,
      notes: updatedLetter.physicalNotes,
    };
  }

  /**
   * 주소 데이터 검증
   * @param addressData - 주소 정보
   */
  private validateAddressData(addressData: PhysicalLetterRequest): void {
    const required = ["name", "phone", "zipCode", "address1"];
    const missing = required.filter((field) => !addressData[field as keyof PhysicalLetterRequest]);

    if (missing.length > 0) {
      throw new Error(`필수 주소 정보가 누락되었습니다: ${missing.join(", ")}`);
    }

    if (addressData.name.trim().length < 2) {
      throw new Error("받는 분 성함은 2자 이상이어야 합니다.");
    }

    if (addressData.address1.trim().length < 5) {
      throw new Error("주소는 5자 이상이어야 합니다.");
    }
  }

  /**
   * 연락처 정규화 및 검증
   * @param phone - 연락처
   * @returns 정규화된 연락처
   */
  private normalizePhoneNumber(phone: string): string {
    // 하이픈 제거 후 검증
    const cleanPhone = phone.replace(/-/g, "");
    const phoneRegex = /^01[0-9][0-9]{3,4}[0-9]{4}$/;

    if (!phoneRegex.test(cleanPhone)) {
      throw new Error("올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)");
    }

    // 하이픈 추가하여 정규화
    return cleanPhone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  }

  /**
   * 우편번호 검증
   * @param zipCode - 우편번호
   */
  private validateZipCode(zipCode: string): void {
    const zipCodeRegex = /^[0-9]{5}$/;
    if (!zipCodeRegex.test(zipCode)) {
      throw new Error("올바른 우편번호 형식이 아닙니다. (5자리 숫자)");
    }
  }

  /**
   * 관리자 알림
   * @param letter - 편지 정보
   */
  private async notifyAdminNewRequest(letter: ILetter): Promise<void> {
    console.log("🏠 새로운 실물 편지 신청");
    console.log(`편지 ID: ${letter._id}`);
    console.log(`제목: ${letter.title}`);
    console.log(`받는 분: ${letter.shippingAddress?.name}`);
    console.log(`연락처: ${letter.shippingAddress?.phone}`);
    console.log(`주소: (${letter.shippingAddress?.zipCode}) ${letter.shippingAddress?.address1} ${letter.shippingAddress?.address2}`);

    // TODO: 실제 알림 시스템 구현
    // - 이메일 발송
    // - 슬랙 메시지
    // - 관리자 대시보드 알림 등
  }
}

export default new PhysicalLetterService();
