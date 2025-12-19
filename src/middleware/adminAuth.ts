import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Admin, { IAdmin, Permission, AdminStatus } from "../models/Admin";

// Request에 admin 정보 추가
declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
    }
  }
}

// Admin 인증 미들웨어
export const adminAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "인증 토큰이 필요합니다" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      adminId: string;
      type: string;
    };

    if (decoded.type !== "admin") {
      res.status(401).json({ success: false, message: "유효하지 않은 토큰입니다" });
      return;
    }

    const admin = await Admin.findById(decoded.adminId);

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      res.status(401).json({ success: false, message: "비활성화된 계정입니다" });
      return;
    }

    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ success: false, message: "인증에 실패했습니다" });
  }
};

// 권한 확인 미들웨어
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ success: false, message: "인증이 필요합니다" });
      return;
    }

    if (!req.admin.hasPermission(permission)) {
      res.status(403).json({ success: false, message: "권한이 없습니다" });
      return;
    }

    next();
  };
};

// Super Admin 전용 미들웨어
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.admin) {
    res.status(401).json({ success: false, message: "인증이 필요합니다" });
    return;
  }

  if (req.admin.role !== "super_admin") {
    res.status(403).json({ success: false, message: "최고 관리자 권한이 필요합니다" });
    return;
  }

  next();
};
