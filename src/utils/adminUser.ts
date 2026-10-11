/** 레터(관리자) 계정 판별. User 모델에 role 이 없어 ADMIN_EMAIL 하나로 본다 */
export const isAdminEmail = (email?: string | null): boolean => !!email && !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
