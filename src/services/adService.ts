import crypto from "crypto";
import mongoose from "mongoose";
import Advertisement, { IAdvertisement, AdStatus } from "../models/Advertisement";
import AdEvent, { AdEventType, TrafficSource } from "../models/AdEvent";

// IP 해시 함수
function hashIP(ip: string): string {
  if (!ip) return "unknown";
  return crypto
    .createHash("sha256")
    .update(ip + (process.env.IP_SALT || "letter"))
    .digest("hex")
    .substring(0, 16);
}

// UTM 정보 인터페이스
interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

// 유입 경로 분석
function analyzeTrafficSource(
  utm?: UTMParams,
  referrer?: string
): { source: TrafficSource; medium?: string; campaign?: string; referrer?: string } {
  if (utm?.source === "qr" || utm?.medium === "offline") {
    return {
      source: "qr",
      medium: utm.medium || "offline",
      campaign: utm.campaign,
    };
  }

  if (utm?.source === "letter") {
    return { source: "link", medium: "letter", campaign: utm.campaign };
  }

  if (referrer) {
    return { source: "referral", medium: "link", referrer };
  }

  return { source: "direct", medium: "none" };
}

// 이벤트 추적 데이터 인터페이스
interface TrackEventData {
  eventType: AdEventType;
  adId: string;
  adSlug: string;
  letterId?: string;
  clickTarget?: string;
  dwellTime?: number;
  utm?: UTMParams;
  device?: {
    type?: string;
    os?: string;
    browser?: string;
    screenWidth?: number;
    screenHeight?: number;
    userAgent?: string;
  };
  session?: {
    sessionId?: string;
    visitorId?: string;
    isNewVisitor?: boolean;
  };
  page?: {
    path?: string;
    referrer?: string;
  };
  ip?: string;
}

// 광고 목록 쿼리 인터페이스
interface AdListQuery {
  status?: AdStatus;
  page?: number;
  limit?: number;
}

// 광고 통계 쿼리 인터페이스
interface AdStatsQuery {
  startDate?: string;
  endDate?: string;
}

class AdService {
  // 슬러그로 광고 조회 (공개)
  async getAdBySlug(adSlug: string, placement?: string): Promise<IAdvertisement | null> {
    const ad = await Advertisement.findOne({
      slug: adSlug,
      status: { $in: ["active", "paused"] },
    }).select("-createdBy -__v");

    // 노출 가능 여부 확인
    if (ad && !ad.isDisplayable(placement)) {
      return null;
    }

    return ad;
  }

  // 노출 가능한 광고 목록 조회 (공개)
  async getDisplayableAds(options?: {
    placement?: string;
    limit?: number;
    theme?: string;
  }): Promise<IAdvertisement[]> {
    const { placement, limit = 10, theme } = options || {};
    
    const filter: any = {
      status: "active",
      "displayControl.isVisible": true,
    };

    if (theme) {
      filter["content.theme"] = theme;
    }

    if (placement) {
      filter["displayControl.placements"] = placement;
    }

    const ads = await Advertisement.find(filter)
      .sort({ "displayControl.priority": -1, createdAt: -1 })
      .limit(limit)
      .select("-createdBy -__v");

    // 노출 가능 여부 재확인 (시간대, 스케줄 등)
    return ads.filter(ad => ad.isDisplayable(placement));
  }

  // 광고 이벤트 추적
  async trackEvent(data: TrackEventData): Promise<void> {
    const traffic = analyzeTrafficSource(data.utm, data.page?.referrer);

    const event = new AdEvent({
      adId: new mongoose.Types.ObjectId(data.adId),
      adSlug: data.adSlug,
      eventType: data.eventType,
      eventData: {
        dwellTime: data.dwellTime,
        clickTarget: data.clickTarget,
      },
      letter: data.letterId ? { letterId: new mongoose.Types.ObjectId(data.letterId) } : undefined,
      traffic,
      utm: data.utm,
      device: data.device,
      session: data.session,
      ip: hashIP(data.ip || ""),
      timestamp: new Date(),
    });

    await event.save();

    // 광고 통계 업데이트 (비동기)
    this.updateAdStats(data.adId, data.eventType, data.session?.visitorId, data.dwellTime).catch(console.error);
  }

  // 광고 통계 업데이트
  private async updateAdStats(adId: string, eventType: AdEventType, visitorId?: string, dwellTime?: number): Promise<void> {
    const updateQuery: any = { $inc: {} };

    if (eventType === "impression") {
      updateQuery.$inc["stats.impressions"] = 1;
    }

    if (eventType === "click") {
      updateQuery.$inc["stats.clicks"] = 1;
    }

    const ad = await Advertisement.findByIdAndUpdate(adId, updateQuery, { new: true });

    if (ad) {
      // CTR 재계산
      ad.calculateCTR();
      await ad.save();
    }

    // 고유 방문자 수 업데이트
    if (eventType === "impression" && visitorId) {
      const uniqueCount = await AdEvent.distinct("session.visitorId", {
        adId: new mongoose.Types.ObjectId(adId),
        eventType: "impression",
      });

      await Advertisement.findByIdAndUpdate(adId, {
        "stats.uniqueVisitors": uniqueCount.length,
      });
    }

    // 평균 체류 시간 업데이트
    if (eventType === "dwell" && dwellTime) {
      const dwellEvents = await AdEvent.find({
        adId: new mongoose.Types.ObjectId(adId),
        eventType: "dwell",
        "eventData.dwellTime": { $exists: true },
      }).select("eventData.dwellTime");

      if (dwellEvents.length > 0) {
        const totalDwell = dwellEvents.reduce((sum, e) => sum + (e.eventData?.dwellTime || 0), 0);
        const avgDwell = Math.round(totalDwell / dwellEvents.length);

        await Advertisement.findByIdAndUpdate(adId, {
          "stats.avgDwellTime": avgDwell,
        });
      }
    }
  }

  // 광고 목록 조회 (관리자)
  async getAllAds(query: AdListQuery) {
    const { status, page = 1, limit = 20 } = query;
    const filter: any = {};

    if (status) filter.status = status;

    const ads = await Advertisement.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("createdBy", "name email");

    const total = await Advertisement.countDocuments(filter);

    return {
      ads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 광고 생성 (관리자)
  async createAd(adData: Partial<IAdvertisement>, createdBy?: string): Promise<IAdvertisement> {
    const ad = new Advertisement({
      ...adData,
      createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
    });

    await ad.save();
    return ad;
  }

  // 광고 조회 by ID (관리자)
  async getAdById(adId: string): Promise<IAdvertisement | null> {
    return Advertisement.findById(adId).populate("createdBy", "name email");
  }

  // 광고 수정 (관리자)
  async updateAd(adId: string, updateData: Partial<IAdvertisement>): Promise<IAdvertisement | null> {
    return Advertisement.findByIdAndUpdate(adId, { $set: updateData }, { new: true, runValidators: true });
  }

  // 광고 삭제 (관리자)
  async deleteAd(adId: string): Promise<IAdvertisement | null> {
    const ad = await Advertisement.findByIdAndDelete(adId);

    if (ad) {
      // 관련 이벤트도 삭제
      await AdEvent.deleteMany({ adId: new mongoose.Types.ObjectId(adId) });
    }

    return ad;
  }

  // 광고 통계 조회 (관리자)
  async getAdStats(adId: string, query: AdStatsQuery) {
    const start = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const ad = await Advertisement.findById(adId);
    if (!ad) return null;

    const adObjectId = new mongoose.Types.ObjectId(adId);

    const [impressions, clicks, byDate, bySource, byDevice] = await Promise.all([
      // 노출수
      AdEvent.countDocuments({
        adId: adObjectId,
        eventType: "impression",
        createdAt: { $gte: start, $lte: end },
      }),

      // 클릭수
      AdEvent.countDocuments({
        adId: adObjectId,
        eventType: "click",
        createdAt: { $gte: start, $lte: end },
      }),

      // 일별 추이
      AdEvent.aggregate([
        {
          $match: {
            adId: adObjectId,
            eventType: { $in: ["impression", "click"] },
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              eventType: "$eventType",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),

      // 유입 경로별
      AdEvent.aggregate([
        {
          $match: {
            adId: adObjectId,
            eventType: "impression",
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$traffic.source",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // 기기별
      AdEvent.aggregate([
        {
          $match: {
            adId: adObjectId,
            eventType: "impression",
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$device.type",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    // 일별 데이터 정리
    const dailyData: Record<string, { date: string; impressions: number; clicks: number }> = {};
    byDate.forEach((item: any) => {
      const date = item._id.date;
      if (!dailyData[date]) {
        dailyData[date] = { date, impressions: 0, clicks: 0 };
      }
      dailyData[date][item._id.eventType === "impression" ? "impressions" : "clicks"] = item.count;
    });

    return {
      ad: {
        _id: ad._id,
        name: ad.name,
        slug: ad.slug,
        status: ad.status,
      },
      summary: {
        impressions,
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0",
        uniqueVisitors: ad.stats.uniqueVisitors,
        avgDwellTime: ad.stats.avgDwellTime,
      },
      daily: Object.values(dailyData),
      bySource,
      byDevice,
      period: { start, end },
    };
  }

  // 편지-광고 연결
  async linkLetter(adId: string, letterId: string, letterType?: string): Promise<IAdvertisement | null> {
    return Advertisement.findByIdAndUpdate(
      adId,
      {
        $addToSet: {
          linkedLetters: {
            letterId: new mongoose.Types.ObjectId(letterId),
            letterType,
            addedAt: new Date(),
          },
        },
      },
      { new: true }
    );
  }

  // 편지-광고 연결 해제
  async unlinkLetter(adId: string, letterId: string): Promise<IAdvertisement | null> {
    return Advertisement.findByIdAndUpdate(
      adId,
      {
        $pull: {
          linkedLetters: { letterId: new mongoose.Types.ObjectId(letterId) },
        },
      },
      { new: true }
    );
  }
}

export default new AdService();
