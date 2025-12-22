import { Router } from "express";
import { adminAuthenticate, requirePermission, requireSuperAdmin } from "../middleware/adminAuth";
import { PERMISSIONS } from "../models/Admin";
import adminAuthController from "../controllers/adminAuthController";
import adminController from "../controllers/adminController";
import adminUserRoutes from "./adminUserRoutes";

const router: Router = Router();

// ===== 인증 API =====
router.get("/auth/encryption-key", adminAuthController.getEncryptionKey);
router.post("/auth/login", adminAuthController.login);
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

// ===== 새로운 사용자 관리 (상세 기능) =====
router.use("/users", adminUserRoutes);

export default router;
