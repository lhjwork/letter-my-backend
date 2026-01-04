import mongoose, { Document, Schema } from "mongoose";

// 이벤트 타입
export type AdEventType = "impression" | "click" | "dwell";

// 유입 소스 타입
export type TrafficSource = "qr" | "direct" | "link" | "social" | "email" | "referral" | "other";

// 기기 타입
export type DeviceType = "mobile" | "tablet" | "desktop";

// 광고 이벤트 문서 인터페이스
export interface IAdEvent extends Document {
  _id: mongoose.Types.ObjectId;
  adId: mongoose.Types.ObjectId;
  adSlug: string;
  eventType: AdEventType;
  eventData?: {
    dwellTime?: number;
    clickTarget?: string;
  };
  letter?: {
    letterId?: mongoose.Types.ObjectId;
    letterType?: string;
  };
  traffic: {
    source: TrafficSource;
    medium?: string;
    campaign?: string;
    referrer?: string;
  };
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  device?: {
    type?: DeviceType;
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
  ip?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adEventSchema = new Schema<IAdEvent>(
  {
    // 광고 정보
    adId: {
      type: Schema.Types.ObjectId,
      ref: "Advertisement",
      required: true,
      index: true,
    },
    adSlug: {
      type: String,
      required: true,
      index: true,
    },

    // 이벤트 정보
    eventType: {
      type: String,
      required: true,
      enum: ["impression", "click", "dwell"],
      index: true,
    },
    eventData: {
      dwellTime: Number,
      clickTarget: String,
    },

    // 연결된 편지
    letter: {
      letterId: { type: Schema.Types.ObjectId, ref: "Letter" },
      letterType: String,
    },

    // 유입 경로
    traffic: {
      source: {
        type: String,
        enum: ["qr", "direct", "link", "social", "email", "referral", "other"],
        default: "direct",
      },
      medium: String,
      campaign: String,
      referrer: String,
    },

    // UTM 파라미터
    utm: {
      source: String,
      medium: String,
      campaign: String,
      content: String,
      term: String,
    },

    // 기기 정보
    device: {
      type: { type: String, enum: ["mobile", "tablet", "desktop"] },
      os: String,
      browser: String,
      screenWidth: Number,
      screenHeight: Number,
      userAgent: String,
    },

    // 세션/사용자
    session: {
      sessionId: String,
      visitorId: { type: String, index: true },
      isNewVisitor: Boolean,
    },

    // 메타
    ip: String,
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// 복합 인덱스
adEventSchema.index({ adId: 1, eventType: 1, createdAt: -1 });
adEventSchema.index({ adSlug: 1, createdAt: -1 });
adEventSchema.index({ "traffic.source": 1, createdAt: -1 });
adEventSchema.index({ createdAt: -1 });

export default mongoose.model<IAdEvent>("AdEvent", adEventSchema);
