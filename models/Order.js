import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    game: { type: String, required: true }, // MLBB or PUBG
    package: { type: String, required: true },
    price: { type: Number, required: true },

    // MLBB → id + sv  
    // PUBG → id only
    gameId: String,
    serverId: String,

    telegramUserId: Number,
    telegramUsername: String,

    status: {
      type: String,
      default: "PENDING" // PENDING / CONFIRMED / CANCELLED
    }
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
