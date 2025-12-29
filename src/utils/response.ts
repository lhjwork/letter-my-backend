import { Response } from "express";

/**
 * 표준 API 응답 형식
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
  };
}

/**
 * Pagination 타입
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * 성공 응답
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  pagination?: PaginationMeta
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(pagination && { pagination }),
    },
  };
  return res.status(statusCode).json(response);
}

/**
 * 생성 성공 응답 (201)
 */
export function sendCreated<T>(res: Response, data?: T, message: string = "Created successfully"): Response {
  return sendSuccess(res, data, message, 201);
}

/**
 * 에러 응답
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(response);
}

/**
 * 400 Bad Request
 */
export function sendBadRequest(res: Response, message: string = "Bad request", details?: any): Response {
  return sendError(res, message, 400, "BAD_REQUEST", details);
}

/**
 * 401 Unauthorized
 */
export function sendUnauthorized(res: Response, message: string = "Unauthorized"): Response {
  return sendError(res, message, 401, "UNAUTHORIZED");
}

/**
 * 403 Forbidden
 */
export function sendForbidden(res: Response, message: string = "Forbidden"): Response {
  return sendError(res, message, 403, "FORBIDDEN");
}

/**
 * 404 Not Found
 */
export function sendNotFound(res: Response, message: string = "Not found"): Response {
  return sendError(res, message, 404, "NOT_FOUND");
}

/**
 * 500 Internal Server Error
 */
export function sendServerError(res: Response, message: string = "Internal server error"): Response {
  return sendError(res, message, 500, "INTERNAL_ERROR");
}
