import mongoose, { Document, Schema } from "mongoose";

// 광고 상태 타입
export type AdStatus = "draft" | "active" | "paused" | "expired";

// 광고 테마 타입
export type AdTheme = "wedding" | "birthday" | "congratulation" | "general";

// 노출 위치 타입
export type AdPlacement = "landing" | "banner" | "sidebar" | "footer" | "popup";

// 캐러셀 노출 위치 타입
export type CarouselPlacement = "home" | "stories" | "letters";

// 노출 제어 설정 인터페이스
export interface IDisplayControl {
  isVisible: boolean;
  placements: AdPlacement[];
  priority: number;
  maxDailyImpressions?: number;
  maxTotalImpressions?: number;
  targetAudience?: {
    ageRange?: { min: number; max: number };
    gender?: "male" | "female" | "all";
    regions?: string[];
  };
  schedule?: {
    startTime?: string; // HH:mm 형식
    endTime?: string;   // HH:mm 형식
    daysOfWeek?: number[]; // 0=일요일, 1=월요일, ...
  };
  // 캐러셀 전용 설정
  carouselEnabled?: boolean;
  carouselPlacements?: CarouselPlacement[];
  maxCarouselImpressions?: number;
  carouselSchedule?: {
    startHour?: number; // 0-23
    endHour?: number;   // 0-23
    timezone?: string;  // 기본값: "Asia/Seoul"
  };
}

// 연결된 편지 인터페이스
export interface ILinkedLetter {
  letterId: mongoose.Types.ObjectId;
  letterType?: string;
  addedAt: Date;
}

// 광고 통계 인터페이스
export interface IAdStats {
  impressions: number;
  clicks: number;
  ctr: number;
  uniqueVisitors: number;
  avgDwellTime: number;
  // 캐러셀 전용 통계
  carouselImpressions: number;
  carouselClicks: number;
  carouselCtr: number;
  carouselAvgViewTime: number;
  carouselSlideChanges: number;
  carouselAutoPlayStops: number;
}

// 광고 문서 인터페이스
export interface IAdvertisement extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  status: AdStatus;
  advertiser: {
    name: string;
    logo?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  content: {
    headline: string;
    description: string;
    ctaText: string;
    targetUrl: string;
    backgroundImage?: string;
    backgroundColor?: string;
    theme?: AdTheme;
  };
  campaign: {
    name?: string;
    startDate: Date;
    endDate: Date;
    budget?: number;
    targetImpressions?: number;
    targetClicks?: number;
  };
  displayControl: IDisplayControl;
  linkedLetters: ILinkedLetter[];
  stats: IAdStats;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  calculateCTR(): number;
  isDisplayable(placement?: string): boolean;
}

const advertisementSchema = new Schema<IAdvertisement>(
  {
    // 기본 정보
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "expired"],
      default: "draft",
      index: true,
    },

    // 광고주 정보
    advertiser: {
      name: { type: String, required: true },
      logo: String,
      contactEmail: String,
      contactPhone: String,
    },

    // 광고 콘텐츠
    content: {
      headline: { type: String, required: true },
      description: { type: String, required: true },
      ctaText: { type: String, default: "자세히 보기" },
      targetUrl: { type: String, required: true },
      backgroundImage: String,
      backgroundColor: { type: String, default: "#ffffff" },
      theme: {
        type: String,
        enum: ["wedding", "birthday", "congratulation", "general"],
        default: "general",
      },
      // 캐러셀 전용 필드
      carouselImage: String,           // 캐러셀용 고해상도 이미지 (1920x1080 권장)
      carouselImageMobile: String,     // 모바일용 캐러셀 이미지 (1080x1080 권장)
      carouselPriority: { type: Number, default: 0, min: 0, max: 100 }, // 캐러셀 내 순서
      carouselAutoPlay: { type: Boolean, default: true },               // 자동 재생 허용 여부
      carouselDuration: { type: Number, default: 5000, min: 3000, max: 10000 }, // 노출 시간 (밀리초)
      // 시각적 개선
      overlayOpacity: { type: Number, default: 0.3, min: 0, max: 1 },   // 오버레이 투명도
      textColor: { type: String, default: "white" },                    // 텍스트 색상
      textShadow: { type: Boolean, default: true },                     // 텍스트 그림자 사용 여부
      // 반응형 지원
      mobileHeadline: String,          // 모바일용 짧은 헤드라인
      mobileDescription: String,       // 모바일용 짧은 설명
    },

    // 캠페인 설정
    campaign: {
      name: String,
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      budget: Number,
      targetImpressions: Number,
      targetClicks: Number,
    },

    // 노출 제어 설정
    displayControl: {
      isVisible: { type: Boolean, default: true },
      placements: [{
        type: String,
        enum: ["landing", "banner", "sidebar", "footer", "popup"],
      }],
      priority: { type: Number, default: 0, min: 0, max: 100 },
      maxDailyImpressions: Number,
      maxTotalImpressions: Number,
      targetAudience: {
        ageRange: {
          min: { type: Number, min: 0, max: 100 },
          max: { type: Number, min: 0, max: 100 },
        },
        gender: {
          type: String,
          enum: ["male", "female", "all"],
          default: "all",
        },
        regions: [String],
      },
      schedule: {
        startTime: String, // HH:mm 형식
        endTime: String,   // HH:mm 형식
        daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=일요일
      },
      // 캐러셀 전용 설정
      carouselEnabled: { type: Boolean, default: false },
      carouselPlacements: [{
        type: String,
        enum: ["home", "stories", "letters"],
      }],
      maxCarouselImpressions: Number,
      carouselSchedule: {
        startHour: { type: Number, min: 0, max: 23 },
        endHour: { type: Number, min: 0, max: 23 },
        timezone: { type: String, default: "Asia/Seoul" },
      },
    },

    // 연결된 편지
    linkedLetters: [
      {
        letterId: { type: Schema.Types.ObjectId, ref: "Letter" },
        letterType: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // 실시간 통계
    stats: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
      avgDwellTime: { type: Number, default: 0 },
      // 캐러셀 전용 통계
      carouselImpressions: { type: Number, default: 0 },
      carouselClicks: { type: Number, default: 0 },
      carouselCtr: { type: Number, default: 0 },
      carouselAvgViewTime: { type: Number, default: 0 },
      carouselSlideChanges: { type: Number, default: 0 },
      carouselAutoPlayStops: { type: Number, default: 0 },
    },

    // 메타
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// 슬러그 자동 생성
advertisementSchema.pre("save", function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
});

// CTR 계산 메서드
advertisementSchema.methods.calculateCTR = function (): number {
  if (this.stats.impressions > 0) {
    this.stats.ctr = (this.stats.clicks / this.stats.impressions) * 100;
  }
  return this.stats.ctr;
};

// 노출 가능 여부 확인 메서드
advertisementSchema.methods.isDisplayable = function (placement?: string): boolean {
  const now = new Date();
  
  // 1. 기본 상태 확인
  if (this.status !== "active") return false;
  if (!this.displayControl.isVisible) return false;
  
  // 2. 캠페인 기간 확인
  if (now < this.campaign.startDate || now > this.campaign.endDate) return false;
  
  // 3. 노출 위치 확인
  if (placement && this.displayControl.placements.length > 0) {
    if (!this.displayControl.placements.includes(placement as any)) return false;
  }
  
  // 4. 일일 노출 한도 확인
  if (this.displayControl.maxDailyImpressions) {
    // TODO: 일일 노출 수 체크 로직 (AdEvent 집계 필요)
  }
  
  // 5. 총 노출 한도 확인
  if (this.displayControl.maxTotalImpressions) {
    if (this.stats.impressions >= this.displayControl.maxTotalImpressions) return false;
  }
  
  // 6. 시간대 스케줄 확인
  if (this.displayControl.schedule?.startTime && this.displayControl.schedule?.endTime) {
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm
    if (currentTime < this.displayControl.schedule.startTime || 
        currentTime > this.displayControl.schedule.endTime) return false;
  }
  
  // 7. 요일 스케줄 확인
  if (this.displayControl.schedule?.daysOfWeek && this.displayControl.schedule.daysOfWeek.length > 0) {
    const currentDay = now.getDay();
    if (!this.displayControl.schedule.daysOfWeek.includes(currentDay)) return false;
  }
  
  return true;
};

// 인덱스
advertisementSchema.index({ "campaign.startDate": 1, "campaign.endDate": 1 });
advertisementSchema.index({ status: 1, "campaign.endDate": 1 });

export default mongoose.model<IAdvertisement>("Advertisement", advertisementSchema);
