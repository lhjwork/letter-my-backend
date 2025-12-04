import { Request, Response, NextFunction } from "express";
import userService from "../services/userService";

// JWT 인증 미들웨어
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "No token provided. Authorization header must be: Bearer <token>",
      });
      return;
    }

    const token = authHeader.substring(7); // "Bearer " 제거

    // 토큰 검증
    const decoded = userService.verifyToken(token);

    // 사용자 존재 확인
    const user = await userService.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found. Token is invalid.",
      });
      return;
    }

    // req.user에 사용자 정보 추가
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
      return;
    }

    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Token expired",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Optional 인증 미들웨어 (토큰이 있으면 검증하지만 없어도 통과)
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // 토큰이 없어도 통과
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = userService.verifyToken(token);
      const user = await userService.findById(decoded.userId);

      if (user) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
        };
      }
    } catch (error) {
      // 토큰이 유효하지 않아도 통과
    }

    next();
  } catch (error) {
    next();
  }
};
