import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error | AppError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  // 5xx 는 내부 메시지(Mongoose/드라이버 오류 등) 노출 금지
  const message = statusCode >= 500 && process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message || "Internal Server Error";
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";

  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};
