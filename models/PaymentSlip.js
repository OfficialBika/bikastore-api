import mongoose from "mongoose";

const PaymentSlipSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    filePath: String,
  },
  { timestamps: true }
);

export default mongoose.model("PaymentSlip", PaymentSlipSchema);
