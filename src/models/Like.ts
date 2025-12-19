import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  letterId: mongoose.Types.ObjectId;
  createdAt: Date;
}

interface ILikeModel extends Model<ILike> {
  findByUserAndLetter(userId: string, letterId: string): Promise<ILike | null>;
  countByLetter(letterId: string): Promise<number>;
  findByUserId(userId: string): Promise<ILike[]>;
}

const LikeSchema = new Schema<ILike, ILikeModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    letterId: {
      type: Schema.Types.ObjectId,
      ref: "Letter",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// 복합 유니크 인덱스 (중복 좋아요 방지)
LikeSchema.index({ userId: 1, letterId: 1 }, { unique: true });

// Static 메서드
LikeSchema.statics.findByUserAndLetter = function (userId: string, letterId: string): Promise<ILike | null> {
  return this.findOne({ userId, letterId });
};

LikeSchema.statics.countByLetter = function (letterId: string): Promise<number> {
  return this.countDocuments({ letterId });
};

LikeSchema.statics.findByUserId = function (userId: string): Promise<ILike[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

const Like = mongoose.model<ILike, ILikeModel>("Like", LikeSchema);

export default Like;
