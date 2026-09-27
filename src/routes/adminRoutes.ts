import { Router } from "express";
import { adminAuthenticate, requirePermission, requireSuperAdmin } from "../middleware/adminAuth";
import { PERMISSIONS } from "../models/Admin";
import adminAuthController from "../controllers/adminAuthController";
import adminController from "../controllers/adminController";
import adminUserRoutes from "./adminUserRoutes";
import physicalLetterController from "../controllers/physicalLetterController";
import { adminAuthLimiter } from "../middleware/rateLimiter";
import Diary, { DIARY_PHYSICAL_STATUS } from "../models/Diary";
import { body, query } from "express-validator";
import { validate } from "../middleware/validation";

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

// ===== 실물 편지 관리 =====
// ===== 다이어리 실물 제본 신청 =====
router.get(
  "/diaries/physical-requests",
  adminAuthenticate,
  requirePermission(PERMISSIONS.LETTERS_READ),
  [query("status").optional().isIn(DIARY_PHYSICAL_STATUS), validate],
  async (req: import("express").Request, res: import("express").Response) => {
    const status = (req.query.status as string) || undefined;
    const filter = status ? { "physical.status": status } : { "physical.status": { $ne: "none" } };
    const diaries = await Diary.find(filter, { pages: 0 })
      .populate("userId", "name realName email")
      .sort({ "physical.requestedAt": -1 })
      .limit(200);
    res.json({ success: true, data: diaries });
  },
);
router.patch(
  "/diaries/:diaryId/physical",
  adminAuthenticate,
  requirePermission(PERMISSIONS.LETTERS_WRITE),
  [body("status").optional().isIn(DIARY_PHYSICAL_STATUS), body("notes").optional().isString().isLength({ max: 500 }), validate],
  async (req: import("express").Request, res: import("express").Response) => {
    const diary = await Diary.findById(req.params.diaryId);
    if (!diary) {
      res.status(404).json({ success: false, error: "다이어리를 찾을 수 없습니다." });
      return;
    }
    const { status, notes } = req.body;
    if (status !== undefined) diary.physical.status = status;
    if (notes !== undefined) diary.physical.notes = notes;
    diary.physical.updatedAt = new Date();
    await diary.save();
    res.json({ success: true, data: diary.physical });
  },
);

router.get("/physical-requests", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_READ), physicalLetterController.getPhysicalLetterRequests);
router.patch("/physical-requests/:letterId", adminAuthenticate, requirePermission(PERMISSIONS.LETTERS_WRITE), physicalLetterController.updatePhysicalLetterStatus);

// ===== 새로운 사용자 관리 (상세 기능) =====
router.use("/users", adminUserRoutes);

export default router;
