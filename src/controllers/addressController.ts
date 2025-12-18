import { Request, Response } from "express";
import Address from "../models/Address";

// 배송지 목록 조회 (주소록)
export const getAddresses = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  const addresses = await Address.find({ userId, isFromRecent: false }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  res.json({
    success: true,
    data: addresses,
  });
};

// 최근 배송지 목록 조회
export const getRecentAddresses = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const limit = parseInt(req.query.limit as string) || 20;

  const addresses = await Address.find({ userId }).sort({ lastUsedAt: -1 }).limit(limit);

  res.json({
    success: true,
    data: addresses,
  });
};

// 배송지 상세 조회
export const getAddressById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  const address = await Address.findOne({ _id: id, userId });

  if (!address) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
    });
    return;
  }

  res.json({
    success: true,
    data: address,
  });
};

// 배송지 추가
export const createAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { addressName, recipientName, zipCode, address, addressDetail, phone, tel, isDefault } = req.body;

  // 기본 배송지로 설정하는 경우, 기존 기본 배송지 해제
  if (isDefault) {
    await Address.updateMany({ userId, isDefault: true }, { isDefault: false });
  }

  const newAddress = await Address.create({
    userId,
    addressName,
    recipientName,
    zipCode,
    address,
    addressDetail,
    phone,
    tel,
    isDefault: isDefault || false,
    isFromRecent: false,
  });

  res.status(201).json({
    success: true,
    message: "배송지가 추가되었습니다.",
    data: newAddress,
  });
};

// 배송지 수정
export const updateAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { addressName, recipientName, zipCode, address, addressDetail, phone, tel, isDefault } = req.body;

  const existingAddress = await Address.findOne({ _id: id, userId });

  if (!existingAddress) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
    });
    return;
  }

  // 기본 배송지로 설정하는 경우, 기존 기본 배송지 해제
  if (isDefault && !existingAddress.isDefault) {
    await Address.updateMany({ userId, isDefault: true }, { isDefault: false });
  }

  const updatedAddress = await Address.findByIdAndUpdate(
    id,
    {
      addressName,
      recipientName,
      zipCode,
      address,
      addressDetail,
      phone,
      tel,
      isDefault,
    },
    { new: true }
  );

  res.json({
    success: true,
    message: "배송지가 수정되었습니다.",
    data: updatedAddress,
  });
};

// 배송지 삭제
export const deleteAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  const address = await Address.findOneAndDelete({ _id: id, userId });

  if (!address) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
    });
    return;
  }

  res.json({
    success: true,
    message: "배송지가 삭제되었습니다.",
  });
};

// 기본 배송지 설정
export const setDefaultAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  const address = await Address.findOne({ _id: id, userId });

  if (!address) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
    });
    return;
  }

  // 기존 기본 배송지 해제
  await Address.updateMany({ userId, isDefault: true }, { isDefault: false });

  // 새 기본 배송지 설정
  address.isDefault = true;
  await address.save();

  res.json({
    success: true,
    message: "기본 배송지로 설정되었습니다.",
    data: address,
  });
};

// 최근 배송지로 저장 (편지 발송 시 호출)
export const saveToRecent = async (userId: string, addressData: any): Promise<void> => {
  // 동일한 주소가 있는지 확인
  const existing = await Address.findOne({
    userId,
    zipCode: addressData.zipCode,
    address: addressData.address,
    addressDetail: addressData.addressDetail,
  });

  if (existing) {
    // 기존 주소의 lastUsedAt 업데이트
    existing.lastUsedAt = new Date();
    await existing.save();
  } else {
    // 새 주소 저장
    await Address.create({
      ...addressData,
      userId,
      isFromRecent: true,
      lastUsedAt: new Date(),
    });

    // 최근 배송지가 20개 초과시 오래된 것 삭제
    const recentCount = await Address.countDocuments({ userId });
    if (recentCount > 20) {
      const oldestRecent = await Address.find({ userId, isFromRecent: true })
        .sort({ lastUsedAt: 1 })
        .limit(recentCount - 20);

      const idsToDelete = oldestRecent.map((addr) => addr._id);
      await Address.deleteMany({ _id: { $in: idsToDelete } });
    }
  }
};

// 최근 배송지를 주소록에 저장
export const saveRecentToAddressBook = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { addressName } = req.body;

  const recentAddress = await Address.findOne({ _id: id, userId });

  if (!recentAddress) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
    });
    return;
  }

  // 주소록에 저장
  const newAddress = await Address.create({
    userId,
    addressName: addressName || recentAddress.addressName,
    recipientName: recentAddress.recipientName,
    zipCode: recentAddress.zipCode,
    address: recentAddress.address,
    addressDetail: recentAddress.addressDetail,
    phone: recentAddress.phone,
    tel: recentAddress.tel,
    isDefault: false,
    isFromRecent: false,
  });

  res.status(201).json({
    success: true,
    message: "주소록에 저장되었습니다.",
    data: newAddress,
  });
};
