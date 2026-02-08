// ---------------------------
//  BIKA STORE API — server.js
//  Web Orders (DB + Multi-Claim)
// ---------------------------

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------
//  MIDDLEWARE
// ---------------------------
app.use(
  cors({
    origin: process.env.WEB_ORIGIN || "*",
    credentials: true,
  })
);

app.use(bodyParser.json({ limit: "10mb" }));

// ---------------------------
//  MONGODB CONNECT
// ---------------------------
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  })
  .then(() => console.log("🍃 MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ---------------------------
//  WEB ORDER MODEL (TTL + multi-claim)
// ---------------------------
const webOrderSchema = new mongoose.Schema({
  startCode: { type: String, unique: true, required: true },

  // "MLBB" or "PUBG"
  game: { type: String, enum: ["MLBB", "PUBG"], required: true },

  // Cart from website (array of items)
  cart: { type: Array, required: true },

  // MLBB fields
  mlbbId: String,
  svId: String,

  // PUBG field
  pubgId: String,

  // total amount (MMK)
  total: { type: Number, required: true },

  // ✅ multi-claim support (how many times this link is used)
  claimedCount: { type: Number, default: 0 },

  // TTL — document auto-deletes after 30 minutes
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 30, // 30 minutes
  },
});

const WebOrder = mongoose.model("WebOrder", webOrderSchema);

// ---------------------------
//  HEALTH CHECK
// ---------------------------
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "BIKA Store API",
    version: "web-orders-multi-claim",
  });
});

// =====================================================
//  WEBSITE → CREATE WEB ORDER
//  POST /api/web-orders
// =====================================================
app.post("/api/web-orders", async (req, res) => {
  try {
    const { game, cart, mlbbId, svId, pubgId } = req.body || {};

    // Basic validation
    if (!game || (game !== "MLBB" && game !== "PUBG")) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing game type",
      });
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    if (game === "MLBB" && (!mlbbId || !svId)) {
      return res.status(400).json({
        success: false,
        message: "MLBB ID + Server ID required",
      });
    }

    if (game === "PUBG" && !pubgId) {
      return res.status(400).json({
        success: false,
        message: "PUBG ID required",
      });
    }

    const total = cart.reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Number(item.qty || 1),
      0
    );

    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart total",
      });
    }

    const startCode = "web_" + crypto.randomBytes(6).toString("hex");

    await WebOrder.create({
      startCode,
      game,
      cart,
      mlbbId: mlbbId || "",
      svId: svId || "",
      pubgId: pubgId || "",
      total,
    });

    console.log("📝 Created WebOrder:", { startCode, game, total });

    return res.json({
      success: true,
      startCode, // e.g. web_a1b2c3d4e5f6
    });
  } catch (err) {
    console.error("❌ create web order:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// =====================================================
//  BOT → CLAIM WEB ORDER (multi-claim allowed)
//  POST /api/web-orders/claim
// =====================================================
app.post("/api/web-orders/claim", async (req, res) => {
  try {
    const { startCode, telegramUserId, username, firstName } = req.body || {};

    if (!startCode) {
      return res.status(400).json({
        success: false,
        message: "startCode required",
      });
    }

    const order = await WebOrder.findOne({ startCode });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired link",
      });
    }

    // ❌ မစစ်တော့: one-time-use
    // if (order.claimed) { ... }

    // ✅ multi-claim: link ကို ကြိမ်တွေဖုံး သုံးလို့ရ
    order.claimedCount = (order.claimedCount || 0) + 1;
    await order.save();

    console.log("🔁 Claimed WebOrder:", {
      startCode,
      game: order.game,
      total: order.total,
      claimedCount: order.claimedCount,
      telegramUserId,
    });

    return res.json({
      success: true,
      order: {
        game: order.game,
        cart: order.cart,
        total: order.total,
        mlbbId: order.mlbbId,
        svId: order.svId,
        pubgId: order.pubgId,
        telegramUserId,
        username,
        firstName,
      },
    });
  } catch (err) {
    console.error("❌ claim web order:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ---------------------------
//  START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`🚀 BIKA Store API running on port ${PORT}`);
});
