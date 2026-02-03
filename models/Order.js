import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  orderId: Number,
  userId: Number,
  username: String,

  game: String,
  packageName: String,
  price: Number,

  paymentSlip: String,

  status: {
    type: String,
    enum: ["PENDING", "PENDING_CONFIRM", "COMPLETED", "REJECTED"],
    default: "PENDING"
  },

  confirmedAt: Date
}, { timestamps: true });

export default mongoose.model("Order", OrderSchema);
