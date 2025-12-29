import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";

// 배송지 목록 조회
export const getAddresses = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  const user = await User.findById(userId).select("addresses");

  if (!user) {
    res.status(404).json({
      success: false,
      message: "사용자를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  // 기본 배송지가 먼저 오도록 정렬
  const sortedAddresses = [...user.addresses].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json({
    success: true,
    data: sortedAddresses,
    meta: { timestamp: new Date().toISOString() },
  });
};

// 최근 사용 배송지 목록 조회
export const getRecentAddresses = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const limit = parseInt(req.query.limit as string) || 20;

  const user = await User.findById(userId).select("addresses");

  if (!user) {
    res.status(404).json({
      success: false,
      message: "사용자를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  // lastUsedAt 기준 정렬, 최근 사용한 것만
  const recentAddresses = [...user.addresses]
    .filter((addr) => addr.lastUsedAt)
    .sort((a, b) => {
      const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);

  res.json({
    success: true,
    data: recentAddresses,
    meta: { timestamp: new Date().toISOString() },
  });
};

// 배송지 상세 조회
export const getAddressById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const user = await User.findById(userId).select("addresses");

  if (!user) {
    res.status(404).json({
      success: false,
      message: "사용자를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const address = user.addresses.find((addr) => addr._id.toString() === id);

  if (!address) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  res.json({
    success: true,
    data: address,
    meta: { timestamp: new Date().toISOString() },
  });
};

// 배송지 추가
export const createAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { addressName, recipientName, zipCode, address, addressDetail, phone, tel, isDefault } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: "사용자를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  // 기본 배송지로 설정하는 경우, 기존 기본 배송지 해제
  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  const newAddress = {
    _id: new mongoose.Types.ObjectId(),
    addressName,
    recipientName,
    zipCode,
    address,
    addressDetail,
    phone,
    tel,
    isDefault: isDefault || false,
    createdAt: new Date(),
  };

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    success: true,
    message: "배송지가 추가되었습니다.",
    data: newAddress,
    meta: { timestamp: new Date().toISOString() },
  });
};

// 배송지 수정
export const updateAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { id } = req.params;
  const { addressName, recipientName, zipCode, address, addressDetail, phone, tel, isDefault } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: "사용자를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const addressIndex = user.addresses.findIndex((addr) => addr._id.toString() === id);

  if (addressIndex === -1) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  // 기본 배송지로 설정하는 경우, 기존 기본 배송지 해제
  if (isDefault && !user.addresses[addressIndex].isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  // 배송지 업데이트
  user.addresses[addressIndex] = {
    ...user.addresses[addressIndex],
    addressName,
    recipientName,
    zipCode,
    address,
    addressDetail,
    phone,
    tel,
    isDefault,
  };

  await user.save();

  res.json({
    success: true,
    message: "배송지가 수정되었습니다.",
    data: user.addresses[addressIndex],
    meta: { timestamp: new Date().toISOString() },
  });
};

// 배송지 삭제
export const deleteAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: "사용자를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const addressIndex = user.addresses.findIndex((addr) => addr._id.toString() === id);

  if (addressIndex === -1) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  user.addresses.splice(addressIndex, 1);
  await user.save();

  res.json({
    success: true,
    message: "배송지가 삭제되었습니다.",
    meta: { timestamp: new Date().toISOString() },
  });
};

// 기본 배송지 설정
export const setDefaultAddress = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: "사용자를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  const addressIndex = user.addresses.findIndex((addr) => addr._id.toString() === id);

  if (addressIndex === -1) {
    res.status(404).json({
      success: false,
      message: "배송지를 찾을 수 없습니다.",
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }

  // 모든 배송지 기본 해제 후 선택한 것만 기본으로
  user.addresses.forEach((addr, idx) => {
    addr.isDefault = idx === addressIndex;
  });

  await user.save();

  res.json({
    success: true,
    message: "기본 배송지로 설정되었습니다.",
    data: user.addresses[addressIndex],
    meta: { timestamp: new Date().toISOString() },
  });
};

// 배송지 사용 기록 업데이트 (편지 발송 시 호출)
export const updateAddressUsage = async (userId: string, addressId: string): Promise<void> => {
  await User.findOneAndUpdate({ _id: userId, "addresses._id": addressId }, { $set: { "addresses.$.lastUsedAt": new Date() } });
};
