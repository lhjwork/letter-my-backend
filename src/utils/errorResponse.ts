// 표준 오류 응답 형식
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// 오류 코드 상수
export const ERROR_CODES = {
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SEARCH_TERM_REQUIRED: "SEARCH_TERM_REQUIRED",
  INVALID_USER_ID: "INVALID_USER_ID",
  INVALID_STATUS: "INVALID_STATUS",
} as const;

// 오류 메시지 매핑
export const ERROR_MESSAGES = {
  [ERROR_CODES.USER_NOT_FOUND]: "사용자를 찾을 수 없습니다",
  [ERROR_CODES.INVALID_PARAMETERS]: "잘못된 파라미터입니다",
  [ERROR_CODES.UNAUTHORIZED]: "인증이 필요합니다",
  [ERROR_CODES.FORBIDDEN]: "권한이 없습니다",
  [ERROR_CODES.INTERNAL_ERROR]: "서버 내부 오류가 발생했습니다",
  [ERROR_CODES.SEARCH_TERM_REQUIRED]: "검색어가 필요합니다",
  [ERROR_CODES.INVALID_USER_ID]: "유효하지 않은 사용자 ID입니다",
  [ERROR_CODES.INVALID_STATUS]: "유효하지 않은 상태값입니다",
} as const;

// 표준 오류 응답 생성 함수
export function createErrorResponse(code: keyof typeof ERROR_CODES, message?: string, details?: any): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message: message || ERROR_MESSAGES[code],
      details,
    },
  };
}

// HTTP 상태 코드 매핑
export const ERROR_STATUS_CODES = {
  [ERROR_CODES.USER_NOT_FOUND]: 404,
  [ERROR_CODES.INVALID_PARAMETERS]: 400,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.SEARCH_TERM_REQUIRED]: 400,
  [ERROR_CODES.INVALID_USER_ID]: 400,
  [ERROR_CODES.INVALID_STATUS]: 400,
} as const;
