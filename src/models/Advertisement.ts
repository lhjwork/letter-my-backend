import mongoose, { Document, Schema } from "mongoose";

// 광고 상태 타입
export type AdStatus = "draft" | "active" | "paused" | "expired";

// 광고 테마 타입
export type AdTheme = "wedding" | "birthday" | "congratulation" | "general";

// 노출 위치 타입
export type AdPlacement = "landing" | "banner" | "sidebar" | "footer" | "popup";

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
  isDisplayable(placement?: AdPlacement): boolean;
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
    if (!this.displayControl.placements.includes(placement)) return false;
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
  if (this.displayControl.schedule?.daysOfWeek?.length > 0) {
    const currentDay = now.getDay();
    if (!this.displayControl.schedule.daysOfWeek.includes(currentDay)) return false;
  }
  
  return true;
};

// 인덱스
advertisementSchema.index({ "campaign.startDate": 1, "campaign.endDate": 1 });
advertisementSchema.index({ status: 1, "campaign.endDate": 1 });

export default mongoose.model<IAdvertisement>("Advertisement", advertisementSchema);
