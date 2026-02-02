import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    stars: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    telegramUserId: Number,
    telegramUsername: String,
  },
  { timestamps: true }
);

export default mongoose.model("Review", ReviewSchema);
