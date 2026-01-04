import { Request, Response } from "express";
import adService from "../services/adService";
import { AdStatus } from "../models/Advertisement";

class AdController {
  // 광고 정보 조회 (공개 - 슬러그로)
  async getAdBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { adSlug } = req.params;
      const { placement } = req.query;

      const ad = await adService.getAdBySlug(adSlug, placement as string);

      if (!ad) {
        res.status(404).json({
          success: false,
          message: "광고를 찾을 수 없습니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.json({
        success: true,
        data: ad,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Get ad error:", error);
      res.status(500).json({
        success: false,
        message: "광고 조회에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 노출 가능한 광고 목록 조회 (공개)
  async getDisplayableAds(req: Request, res: Response): Promise<void> {
    try {
      const { placement, limit, theme } = req.query;

      const ads = await adService.getDisplayableAds({
        placement: placement as string,
        limit: limit ? parseInt(limit as string) : undefined,
        theme: theme as string,
      });

      res.json({
        success: true,
        data: ads,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Get displayable ads error:", error);
      res.status(500).json({
        success: false,
        message: "광고 목록 조회에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 이벤트 추적 (공개)
  async trackAdEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventType, adId, adSlug, letterId, clickTarget, dwellTime, utm, device, session, page, ip } = req.body;

      await adService.trackEvent({
        eventType,
        adId,
        adSlug,
        letterId,
        clickTarget,
        dwellTime,
        utm,
        device,
        session,
        page,
        ip: ip || req.ip,
      });

      res.json({
        success: true,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Track ad event error:", error);
      // 에러여도 200 반환 (추적 실패가 사용자 경험에 영향 주지 않도록)
      res.json({
        success: false,
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 광고 목록 조회 (관리자)
  async getAllAds(req: Request, res: Response): Promise<void> {
    try {
      const { status, page = "1", limit = "20" } = req.query;

      const result = await adService.getAllAds({
        status: status as AdStatus,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.json({
        success: true,
        data: result.ads,
        pagination: result.pagination,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Get all ads error:", error);
      res.status(500).json({
        success: false,
        message: "광고 목록 조회에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 광고 생성 (관리자)
  async createAd(req: Request, res: Response): Promise<void> {
    try {
      const createdBy = req.admin?._id?.toString() || req.user?.userId;

      const ad = await adService.createAd(req.body, createdBy);

      res.status(201).json({
        success: true,
        data: ad,
        message: "광고가 생성되었습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Create ad error:", error);
      res.status(500).json({
        success: false,
        message: "광고 생성에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 광고 상세 조회 (관리자)
  async getAdById(req: Request, res: Response): Promise<void> {
    try {
      const { adId } = req.params;

      const ad = await adService.getAdById(adId);

      if (!ad) {
        res.status(404).json({
          success: false,
          message: "광고를 찾을 수 없습니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.json({
        success: true,
        data: ad,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Get ad by id error:", error);
      res.status(500).json({
        success: false,
        message: "광고 조회에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 광고 수정 (관리자)
  async updateAd(req: Request, res: Response): Promise<void> {
    try {
      const { adId } = req.params;

      const ad = await adService.updateAd(adId, req.body);

      if (!ad) {
        res.status(404).json({
          success: false,
          message: "광고를 찾을 수 없습니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.json({
        success: true,
        data: ad,
        message: "광고가 수정되었습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Update ad error:", error);
      res.status(500).json({
        success: false,
        message: "광고 수정에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 광고 삭제 (관리자)
  async deleteAd(req: Request, res: Response): Promise<void> {
    try {
      const { adId } = req.params;

      const ad = await adService.deleteAd(adId);

      if (!ad) {
        res.status(404).json({
          success: false,
          message: "광고를 찾을 수 없습니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.json({
        success: true,
        message: "광고가 삭제되었습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Delete ad error:", error);
      res.status(500).json({
        success: false,
        message: "광고 삭제에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 광고 통계 조회 (관리자)
  async getAdStats(req: Request, res: Response): Promise<void> {
    try {
      const { adId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await adService.getAdStats(adId, {
        startDate: startDate as string,
        endDate: endDate as string,
      });

      if (!stats) {
        res.status(404).json({
          success: false,
          message: "광고를 찾을 수 없습니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.json({
        success: true,
        data: stats,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Get ad stats error:", error);
      res.status(500).json({
        success: false,
        message: "광고 통계 조회에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 편지-광고 연결 (관리자)
  async linkLetter(req: Request, res: Response): Promise<void> {
    try {
      const { adId } = req.params;
      const { letterId, letterType } = req.body;

      if (!letterId) {
        res.status(400).json({
          success: false,
          message: "letterId는 필수입니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      const ad = await adService.linkLetter(adId, letterId, letterType);

      if (!ad) {
        res.status(404).json({
          success: false,
          message: "광고를 찾을 수 없습니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.json({
        success: true,
        data: ad,
        message: "편지가 광고에 연결되었습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Link letter error:", error);
      res.status(500).json({
        success: false,
        message: "편지 연결에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 편지-광고 연결 해제 (관리자)
  async unlinkLetter(req: Request, res: Response): Promise<void> {
    try {
      const { adId, letterId } = req.params;

      const ad = await adService.unlinkLetter(adId, letterId);

      if (!ad) {
        res.status(404).json({
          success: false,
          message: "광고를 찾을 수 없습니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.json({
        success: true,
        data: ad,
        message: "편지 연결이 해제되었습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Unlink letter error:", error);
      res.status(500).json({
        success: false,
        message: "편지 연결 해제에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  // 광고 노출 제어 설정 업데이트 (관리자)
  async updateDisplayControl(req: Request, res: Response): Promise<void> {
    try {
      const { adId } = req.params;
      const displayControl = req.body;

      const ad = await adService.updateAd(adId, { displayControl });

      if (!ad) {
        res.status(404).json({
          success: false,
          message: "광고를 찾을 수 없습니다.",
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      res.json({
        success: true,
        data: ad,
        message: "노출 설정이 업데이트되었습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Update display control error:", error);
      res.status(500).json({
        success: false,
        message: "노출 설정 업데이트에 실패했습니다.",
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }
}

export default new AdController();
