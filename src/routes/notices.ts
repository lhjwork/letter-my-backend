import { Router } from "express";
import { param } from "express-validator";
import noticeController from "../controllers/noticeController";
import { validate } from "../middleware/validation";

const router: Router = Router();

/** GET /api/notices — 게시된 공지, 고정 먼저 → 최신순. ?page&limit(≤50) */
router.get("/", noticeController.list);

/** GET /api/notices/:id — 게시된 공지만, 아니면 404 */
router.get("/:id", [param("id").isMongoId().withMessage("유효하지 않은 공지 ID입니다."), validate], noticeController.detail);

export default router;
