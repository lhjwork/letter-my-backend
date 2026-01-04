import { Router } from "express";
import adController from "../controllers/adController";
import { adminAuthenticate } from "../middleware/adminAuth";

const router: Router = Router();

// ===== 공개 API =====

// 이벤트 추적 (인증 불필요)
router.post("/track", adController.trackAdEvent);

// 노출 가능한 광고 목록 조회 (인증 불필요)
router.get("/displayable", adController.getDisplayableAds);

// ===== 관리자 API =====

// 광고 목록 조회
router.get("/", adminAuthenticate, adController.getAllAds);

// 광고 생성
router.post("/", adminAuthenticate, adController.createAd);

// 광고 상세 조회 (ID로)
router.get("/detail/:adId", adminAuthenticate, adController.getAdById);

// 광고 수정
router.put("/:adId", adminAuthenticate, adController.updateAd);

// 광고 삭제
router.delete("/:adId", adminAuthenticate, adController.deleteAd);

// 광고 통계 조회
router.get("/:adId/stats", adminAuthenticate, adController.getAdStats);

// 편지-광고 연결
router.post("/:adId/link-letter", adminAuthenticate, adController.linkLetter);

// 편지-광고 연결 해제
router.delete("/:adId/unlink-letter/:letterId", adminAuthenticate, adController.unlinkLetter);

// 광고 노출 제어 설정 업데이트
router.put("/:adId/display-control", adminAuthenticate, adController.updateDisplayControl);

// 광고 정보 조회 (슬러그로) - 마지막에 위치 (다른 라우트와 충돌 방지)
router.get("/:adSlug", adController.getAdBySlug);

export default router;
