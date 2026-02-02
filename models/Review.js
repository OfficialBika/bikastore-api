// ------------------------------
//  BIKA STORE — Review Model
// ------------------------------

import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },
    username: { type: String },

    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: { type: String },

    fromWeb: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Review", ReviewSchema);
