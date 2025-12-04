import { Router, type IRouter } from "express";
import testController from "../controllers/testController";
import { authenticate } from "../middleware/auth";
import { createTestValidation, updateTestValidation, changeStatusValidation, testIdValidation, statusParamValidation } from "../middleware/testValidation";

const router: IRouter = Router();

// 공개 라우트 (인증 불필요)
/**
 * @route   GET /api/tests/statistics
 * @desc    전체 테스트 통계 조회
 * @access  Public
 */
router.get("/statistics", testController.getStatistics);

/**
 * @route   GET /api/tests
 * @desc    모든 테스트 조회 (페이지네이션)
 * @access  Public
 * @query   page, limit
 */
router.get("/", testController.getAllTests);

/**
 * @route   GET /api/tests/status/:status
 * @desc    상태별 테스트 조회
 * @access  Public
 */
router.get("/status/:status", statusParamValidation, testController.getTestsByStatus);

/**
 * @route   GET /api/tests/priority
 * @desc    우선순위별 테스트 조회
 * @access  Public
 * @query   min (최소 우선순위)
 */
router.get("/priority", testController.getTestsByPriority);

/**
 * @route   GET /api/tests/:id
 * @desc    ID로 테스트 조회
 * @access  Public
 */
router.get("/:id", testIdValidation, testController.getTestById);

// 보호된 라우트 (인증 필요)
/**
 * @route   POST /api/tests
 * @desc    새 테스트 생성
 * @access  Private
 */
router.post("/", authenticate, createTestValidation, testController.createTest);

/**
 * @route   GET /api/tests/my/list
 * @desc    내가 만든 테스트 목록 조회
 * @access  Private
 */
router.get("/my/list", authenticate, testController.getMyTests);

/**
 * @route   GET /api/tests/my/statistics
 * @desc    내 테스트 통계 조회
 * @access  Private
 */
router.get("/my/statistics", authenticate, testController.getMyStatistics);

/**
 * @route   PUT /api/tests/:id
 * @desc    테스트 업데이트
 * @access  Private
 */
router.put("/:id", authenticate, testIdValidation, updateTestValidation, testController.updateTest);

/**
 * @route   PATCH /api/tests/:id/status
 * @desc    테스트 상태 변경
 * @access  Private
 */
router.patch("/:id/status", authenticate, testIdValidation, changeStatusValidation, testController.changeStatus);

/**
 * @route   DELETE /api/tests/:id
 * @desc    테스트 삭제
 * @access  Private
 */
router.delete("/:id", authenticate, testIdValidation, testController.deleteTest);

export default router;
