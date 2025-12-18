import { Router } from "express";
import { getAddresses, getRecentAddresses, getAddressById, createAddress, updateAddress, deleteAddress, setDefaultAddress } from "../controllers/addressController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { createAddressValidation, updateAddressValidation, addressIdValidation, recentAddressQueryValidation } from "../middleware/addressValidation";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       required:
 *         - addressName
 *         - recipientName
 *         - zipCode
 *         - address
 *         - phone
 *       properties:
 *         _id:
 *           type: string
 *           description: 배송지 ID
 *         addressName:
 *           type: string
 *           description: 배송지명 (집, 회사 등)
 *           maxLength: 20
 *         recipientName:
 *           type: string
 *           description: 수령인
 *           maxLength: 50
 *         zipCode:
 *           type: string
 *           description: 우편번호
 *         address:
 *           type: string
 *           description: 기본주소
 *         addressDetail:
 *           type: string
 *           description: 상세주소
 *           maxLength: 100
 *         phone:
 *           type: string
 *           description: 휴대전화
 *         tel:
 *           type: string
 *           description: 연락처 (선택)
 *         isDefault:
 *           type: boolean
 *           description: 기본 배송지 여부
 *         lastUsedAt:
 *           type: string
 *           format: date-time
 *           description: 마지막 사용일
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: 배송지 목록 조회
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 배송지 목록
 */
router.get("/", authenticate, getAddresses);

/**
 * @swagger
 * /api/addresses/recent:
 *   get:
 *     summary: 최근 사용 배송지 목록 조회
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 조회할 개수 (최대 20개)
 *     responses:
 *       200:
 *         description: 최근 배송지 목록
 */
router.get("/recent", authenticate, recentAddressQueryValidation, validate, getRecentAddresses);

/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: 배송지 상세 조회
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 배송지 상세 정보
 */
router.get("/:id", authenticate, addressIdValidation, validate, getAddressById);

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: 배송지 추가
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: 배송지 추가 성공
 */
router.post("/", authenticate, createAddressValidation, validate, createAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   put:
 *     summary: 배송지 수정
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: 배송지 수정 성공
 */
router.put("/:id", authenticate, updateAddressValidation, validate, updateAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: 배송지 삭제
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 배송지 삭제 성공
 */
router.delete("/:id", authenticate, addressIdValidation, validate, deleteAddress);

/**
 * @swagger
 * /api/addresses/{id}/default:
 *   put:
 *     summary: 기본 배송지 설정
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 기본 배송지 설정 성공
 */
router.put("/:id/default", authenticate, addressIdValidation, validate, setDefaultAddress);

export default router;
