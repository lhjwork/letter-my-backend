import { Router, type IRouter } from "express";
import userController from "../controllers/userController";
import likeController from "../controllers/likeController";
import { authenticate } from "../middleware/auth";
import { oauthLoginValidation, updateUserValidation, linkOAuthValidation, unlinkOAuthValidation, mongoIdValidation } from "../middleware/validation";

const router: IRouter = Router();

// 공개 라우트 (인증 불필요)
/**
 * @route   POST /api/users/oauth/login
 * @desc    OAuth 로그인/회원가입 (Instagram, Naver, Kakao)
 * @access  Public
 */
router.post("/oauth/login", oauthLoginValidation, userController.oauthLogin);

// 보호된 라우트 (인증 필요)
/**
 * @route   GET /api/users/me
 * @desc    현재 로그인한 사용자 정보 조회
 * @access  Private
 */
router.get("/me", authenticate, userController.getMe);

/**
 * @route   GET /api/users/me/likes
 * @desc    내가 좋아요한 목록 조회
 * @access  Private
 */
router.get("/me/likes", authenticate, likeController.getMyLikes);

/**
 * @route   GET /api/users
 * @desc    모든 사용자 조회 (페이지네이션)
 * @access  Private
 * @query   page, limit
 */
router.get("/", authenticate, userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    ID로 사용자 조회
 * @access  Private
 */
router.get("/:id", authenticate, mongoIdValidation, userController.getUserById);

/**
 * @route   PUT /api/users/me
 * @desc    현재 로그인한 사용자 정보 업데이트
 * @access  Private
 */
router.put("/me", authenticate, updateUserValidation, userController.updateUser);

/**
 * @route   DELETE /api/users/me
 * @desc    현재 로그인한 사용자 삭제 (계정 탈퇴)
 * @access  Private
 */
router.delete("/me", authenticate, userController.deleteUser);

/**
 * @route   POST /api/users/me/oauth/link
 * @desc    OAuth 계정 연결
 * @access  Private
 */
router.post("/me/oauth/link", authenticate, linkOAuthValidation, userController.linkOAuthAccount);

/**
 * @route   DELETE /api/users/me/oauth/:provider
 * @desc    OAuth 계정 연결 해제
 * @access  Private
 */
router.delete("/me/oauth/:provider", authenticate, unlinkOAuthValidation, userController.unlinkOAuthAccount);

export default router;
