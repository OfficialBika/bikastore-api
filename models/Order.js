// ------------------------------
//  BIKA STORE — Order Model
// ------------------------------

import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: Number, required: true, unique: true },

    // User info
    userId: { type: Number, required: true },
    username: { type: String },

    // Game type
    game: { type: String, enum: ["MLBB", "PUBG"], required: true },

    // Game details
    mlbbId: { type: String },
    mlbbServerId: { type: String },
    pubgId: { type: String },

    // Package
    packageName: { type: String, required: true },
    price: { type: Number, required: true },

    // Payment
    paymentSlip: { type: String }, // file path or telegram file_id
    paidAt: { type: Date },

    // Status
    status: {
      type: String,
      enum: ["PENDING", "WAITING_SLIP", "PENDING_CONFIRM", "COMPLETED", "REJECTED"],
      default: "PENDING",
    },

    // Timestamps
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
