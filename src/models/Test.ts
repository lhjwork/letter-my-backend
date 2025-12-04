import mongoose, { Schema, Document, Model } from "mongoose";

// Test Document 인터페이스
export interface ITest extends Document {
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Test Model 인터페이스
interface ITestModel extends Model<ITest> {
  findByStatus(status: string): Promise<ITest[]>;
  findByPriority(minPriority: number): Promise<ITest[]>;
}

// Test 스키마
const TestSchema = new Schema<ITest, ITestModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 3,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// 인덱스 설정
TestSchema.index({ status: 1, priority: -1 });
TestSchema.index({ createdBy: 1 });

// Static 메서드: 상태로 검색
TestSchema.statics.findByStatus = function (status: string): Promise<ITest[]> {
  return this.find({ status }).sort({ priority: -1, createdAt: -1 });
};

// Static 메서드: 우선순위로 검색
TestSchema.statics.findByPriority = function (minPriority: number): Promise<ITest[]> {
  return this.find({ priority: { $gte: minPriority } }).sort({ priority: -1 });
};

// Test 모델 생성 및 내보내기
const Test = mongoose.model<ITest, ITestModel>("Test", TestSchema);

export default Test;
