// --------------------------------
//  BIKA STORE — Payment Slip Model
// --------------------------------

import mongoose from "mongoose";

const PaymentSlipSchema = new mongoose.Schema(
  {
    orderId: { type: Number, required: true },
    userId: { type: Number, required: true },

    filePath: { type: String, required: true }, // /uploads/payments/xxx.jpg
    originalName: { type: String },

    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("PaymentSlip", PaymentSlipSchema);
