import { Router } from "express";
import letterController from "../controllers/letterController";
import { authenticate } from "../middleware/auth";
import { letterValidation, mongoIdValidation } from "../middleware/validation";

const router: Router = Router();

/**
 * @swagger
 * tags:
 *   name: Letters
 *   description: 편지(게시글) 관리 API
 */

/**
 * @swagger
 * /letters:
 *   post:
 *     summary: 편지 작성
 *     tags: [Letters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - authorName
 *             properties:
 *               title:
 *                 type: string
 *                 description: 편지 제목
 *               content:
 *                 type: string
 *                 description: 편지 내용 (HTML)
 *               authorName:
 *                 type: string
 *                 description: 작성자 이름 (닉네임)
 *     responses:
 *       201:
 *         description: 편지 작성 성공
 *       401:
 *         description: 인증 실패
 *       400:
 *         description: 유효성 검사 실패
 */
router.post("/", authenticate, letterValidation, letterController.createLetter);

/**
 * @swagger
 * /letters:
 *   get:
 *     summary: 모든 편지 조회 (페이지네이션)
 *     tags: [Letters]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지 당 항목 수
 *     responses:
 *       200:
 *         description: 조회 성공
 */
router.get("/", letterController.getAllLetters);

/**
 * @swagger
 * /letters/my:
 *   get:
 *     summary: 내 편지 조회
 *     tags: [Letters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지 당 항목 수
 *     responses:
 *       200:
 *         description: 조회 성공
 *       401:
 *         description: 인증 실패
 */
router.get("/my", authenticate, letterController.getMyLetters);

/**
 * @swagger
 * /letters/{id}:
 *   get:
 *     summary: ID로 편지 상세 조회
 *     tags: [Letters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 편지 ID
 *     responses:
 *       200:
 *         description: 조회 성공
 *       404:
 *         description: 편지를 찾을 수 없음
 */
router.get("/:id", mongoIdValidation, letterController.getLetterById);

/**
 * @swagger
 * /letters/{id}:
 *   put:
 *     summary: 편지 수정
 *     tags: [Letters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 편지 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               authorName:
 *                 type: string
 *     responses:
 *       200:
 *         description: 수정 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 편지를 찾을 수 없거나 권한 없음
 */
router.put("/:id", authenticate, mongoIdValidation, letterValidation, letterController.updateLetter);

/**
 * @swagger
 * /letters/{id}:
 *   delete:
 *     summary: 편지 삭제
 *     tags: [Letters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 편지 ID
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 편지를 찾을 수 없거나 권한 없음
 */
router.delete("/:id", authenticate, mongoIdValidation, letterController.deleteLetter);

export default router;
