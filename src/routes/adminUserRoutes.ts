import { Router } from "express";
import adminUserController from "../controllers/adminUserController";
import { adminAuth, requireRole } from "../middleware/adminAuth";
import { param, query, body } from "express-validator";
import { validate } from "../middleware/validation";

const router: Router = Router();

// 모든 라우트에 어드민 인증 필요
router.use(adminAuth);

// 사용자 ID 검증
const userIdValidation = [param("userId").isMongoId().withMessage("Invalid user ID"), validate];

// 페이지네이션 검증
const paginationValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  validate,
];

// 편지 목록 검증
const letterListValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("status").optional().isIn(["created", "published", "hidden", "deleted", "all"]).withMessage("Status must be one of: created, published, hidden, deleted, all"),
  validate,
];

// 검색 검증
const searchValidation = [
  query("query").notEmpty().withMessage("Search term is required"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
  query("status").optional().isIn(["active", "inactive", "deleted", "all"]).withMessage("Status must be one of: active, inactive, deleted, all"),
  validate,
];

// 상태 변경 검증
const statusValidation = [body("status").isIn(["active", "inactive"]).withMessage("Status must be 'active' or 'inactive'"), validate];

/**
 * @route   GET /api/admin/users
 * @desc    사용자 목록 조회 (페이지네이션)
 * @access  Admin
 * @query   page, limit, search, sortBy, sortOrder, status
 */
router.get("/", requireRole("admin"), paginationValidation, adminUserController.getUserList);

/**
 * @route   GET /api/admin/users/search
 * @desc    사용자 검색
 * @access  Admin
 * @query   q (검색어), limit
 */
router.get("/search", requireRole("admin"), searchValidation, adminUserController.searchUsers);

/**
 * @route   GET /api/admin/users/dashboard-stats
 * @desc    대시보드용 사용자 통계
 * @access  Admin
 */
router.get("/dashboard-stats", requireRole("admin"), adminUserController.getDashboardStats);

/**
 * @route   GET /api/admin/users/:userId/detail
 * @desc    사용자 상세 정보 조회 (통계 포함)
 * @access  Admin
 */
router.get("/:userId/detail", requireRole("admin"), userIdValidation, adminUserController.getUserDetail);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    사용자 상세 정보 조회
 * @access  Admin
 */
router.get("/:userId", requireRole("admin"), userIdValidation, adminUserController.getUserDetail);

/**
 * @route   GET /api/admin/users/:userId/stats
 * @desc    사용자 통계 정보
 * @access  Admin
 */
router.get("/:userId/stats", requireRole("admin"), userIdValidation, adminUserController.getUserStats);

/**
 * @route   GET /api/admin/users/:userId/letters
 * @desc    사용자 작성 편지 목록
 * @access  Admin (letters.read 권한 필요)
 * @query   page, limit, status
 */
router.get("/:userId/letters", requireRole("admin"), userIdValidation, letterListValidation, adminUserController.getUserLetters);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    사용자 상태 변경 (활성/비활성)
 * @access  Super Admin
 */
router.put("/:userId/status", requireRole("super_admin"), userIdValidation, statusValidation, adminUserController.updateUserStatus);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    사용자 삭제
 * @access  Super Admin
 */
router.delete("/:userId", requireRole("super_admin"), userIdValidation, adminUserController.deleteUser);

export default router;
