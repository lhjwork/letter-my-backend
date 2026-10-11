import { Router } from "express";
import { adminAuthenticate, requirePermission, requireSuperAdmin } from "../middleware/adminAuth";
import { PERMISSIONS } from "../models/Admin";
import adminAuthController from "../controllers/adminAuthController";
import adminController from "../controllers/adminController";
import adminUserRoutes from "./adminUserRoutes";
import physicalLetterController from "../controllers/physicalLetterController";
import { adminAuthLimiter } from "../middleware/rateLimiter";
import { body, param, query } from "express-validator";
import { validate } from "../middleware/validation";
import noticeController from "../controllers/noticeController";
import inquiryController from "../controllers/inquiryController";
import { NOTICE_TITLE_MAX, NOTICE_CONTENT_MAX } from "../models/Notice";
import { INQUIRY_STATUSES, INQUIRY_ANSWER_MAX } from "../models/Inquiry";

const router: Router = Router();

// ===== 인증 API =====
router.post("/auth/login", adminAuthLimiter, adminAuthController.login);
router.post("/auth/logout", adminAuthenticate, adminAuthController.logout);
router.get("/auth/me", adminAuthenticate, adminAuthController.getMe);
router.put("/auth/password", adminAuthenticate, adminAuthController.changePassword);

// ===== 관리자 관리 (Super Admin 전용) =====
router.get("/admins", adminAuthenticate, requireSuperAdmin, adminController.getAdmins);
router.post("/admins", adminAuthenticate, requireSuperAdmin, adminController.createAdmin);
router.get("/admins/:id", adminAuthenticate, requireSuperAdmin, adminController.getAdminById);
router.put("/admins/:id", adminAuthenticate, requireSuperAdmin, adminController.updateAdmin);
router.delete("/admins/:id", adminAuthenticate, requireSuperAdmin, adminController.deleteAdmin);

// ===== 대시보드 =====
router.get("/dashboard", adminAuthenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), adminController.getDashboard);

// ===== 사용자 관리 =====
router.get("/users", adminAuthenticate, requirePermission(PERMISSIONS.USERS_READ), adminController.getUsers);
router.get("/users/:id", adminAuthenticate, requirePermission(PERMISSIONS.USERS_READ), adminController.getUserById);
router.put("/users/:id", adminAuthenticate, requirePermission(PERMISSIONS.USERS_WRITE), adminController.updateUser);
router.post("/users/:id/ban", adminAuthenticate, requirePermission(PERMISSIONS.USERS_WRITE), adminController.banUser);
router.post("/users/:id/unban", adminAuthenticate, requirePermission(PERMISSIONS.USERS_WRITE), adminController.unbanUser);
router.delete("/users/:id", adminAuthenticate, requirePermission(PERMISSIONS.USERS_DELETE), adminController.deleteUser);

// ===== 편지/사연 관리 =====
router.get("/letters", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_READ), adminController.getLetters);
router.get("/letters/:id", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_READ), adminController.getLetterById);
router.put("/letters/:id", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_WRITE), adminController.updateLetter);
router.put("/letters/:id/status", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_WRITE), adminController.updateLetterStatus);
router.delete("/letters/:id", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_DELETE), adminController.deleteLetter);
// 사연의 답장 목록(숨김·삭제 포함) · 답장 채택 토글 (레터 답장 제외)
const letterIdParam = [param("id").isMongoId().withMessage("유효하지 않은 ID입니다."), validate];
router.get("/letters/:id/replies", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_READ), letterIdParam, adminController.getStoryReplies);
router.patch("/letters/:id/adopt", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_WRITE), letterIdParam, adminController.adoptReply);

// ===== 실물 편지 관리 =====
router.get("/physical-requests", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_READ), physicalLetterController.getPhysicalLetterRequests);
router.patch("/physical-requests/:letterId", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_WRITE), physicalLetterController.updatePhysicalLetterStatus);

// ===== 공지 =====
const idParam = param("id").isMongoId().withMessage("유효하지 않은 ID입니다.");
const noticeBody = (optional: boolean) => {
  const f = (name: string) => (optional ? body(name).optional() : body(name));
  return [
    f("title").isString().trim().isLength({ min: 1, max: NOTICE_TITLE_MAX }).withMessage(`제목은 1-${NOTICE_TITLE_MAX}자 이내여야 합니다.`),
    f("content").isString().trim().isLength({ min: 1, max: NOTICE_CONTENT_MAX }).withMessage(`내용은 1-${NOTICE_CONTENT_MAX}자 이내여야 합니다.`),
    body("isPinned").optional().isBoolean({ strict: true }).withMessage("isPinned 는 true/false 입니다."),
    body("isPublished").optional().isBoolean({ strict: true }).withMessage("isPublished 는 true/false 입니다."),
  ];
};
const canWriteNotice = requirePermission(PERMISSIONS.NOTICES_WRITE);
router.get("/notices", adminAuthenticate, canWriteNotice, noticeController.adminList);
router.get("/notices/:id", adminAuthenticate, canWriteNotice, [idParam, validate], noticeController.adminDetail);
router.post("/notices", adminAuthenticate, canWriteNotice, [...noticeBody(false), validate], noticeController.create);
router.put("/notices/:id", adminAuthenticate, canWriteNotice, [idParam, ...noticeBody(true), validate], noticeController.update);
router.delete("/notices/:id", adminAuthenticate, canWriteNotice, [idParam, validate], noticeController.remove);

// ===== 1:1 문의 =====
const canReadInquiry = requirePermission(PERMISSIONS.INQUIRIES_READ);
router.get("/inquiries", adminAuthenticate, canReadInquiry, [query("status").optional().isIn(INQUIRY_STATUSES).withMessage("status 는 open/answered 입니다."), validate], inquiryController.adminList);
router.get("/inquiries/:id", adminAuthenticate, canReadInquiry, [idParam, validate], inquiryController.adminDetail);
router.patch(
  "/inquiries/:id/answer",
  adminAuthenticate,
  requirePermission(PERMISSIONS.INQUIRIES_WRITE),
  [idParam, body("answer").isString().trim().isLength({ min: 1, max: INQUIRY_ANSWER_MAX }).withMessage(`답변은 1-${INQUIRY_ANSWER_MAX}자 이내여야 합니다.`), validate],
  inquiryController.answer
);

// ===== 새로운 사용자 관리 (상세 기능) =====
router.use("/users", adminUserRoutes);

export default router;
