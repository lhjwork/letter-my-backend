import { Request, Response, NextFunction } from "express";
import userService from "../services/userService";

// 서버 간(Next.js → backend) 전용 라우트 보호. nginx 에서도 외부 차단됨.
export const internalOnly = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    // ponytail: env 미설정 시 임시 fail-open (기존과 동일 노출). 서버 env 추가 후 이 분기 삭제할 것 — docs/SECURITY_TODO.md C1
    console.warn("[SECURITY] INTERNAL_API_SECRET 미설정: /oauth/login 이 외부에 열려 있습니다");
    next();
    return;
  }
  if (req.headers["x-internal-secret"] !== expected) {
    res.status(404).json({ success: false, error: { message: "Route not found" } });
    return;
  }
  next();
};

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
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
      return;
    }

    if (error instanceof Error && error.name === "TokenExpiredError") {
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
