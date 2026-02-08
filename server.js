// ---------------------------
//  BIKA STORE API — server.js
//  DB-based Web Orders (FINAL DEBUG)
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
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => console.log("🍃 MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

// ---------------------------
//  WEB ORDER MODEL (TTL)
// ---------------------------
const webOrderSchema = new mongoose.Schema({
  startCode: { type: String, unique: true },
  game: { type: String, enum: ["MLBB", "PUBG"], required: true },
  cart: { type: Array, required: true },

  mlbbId: String,
  svId: String,
  pubgId: String,

  total: { type: Number, required: true },
  claimed: { type: Boolean, default: false },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 30, // ⏱ auto delete after 30 minutes
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
  });
});

// =====================================================
//  WEBSITE → CREATE WEB ORDER
//  POST /api/web-orders
// =====================================================
app.post("/api/web-orders", async (req, res) => {
  try {
    const { game, cart, mlbbId, svId, pubgId } = req.body || {};

    if (!game || !Array.isArray(cart) || !cart.length) {
      console.warn("⚠️ /api/web-orders invalid payload:", req.body);
      return res.json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (game === "MLBB" && (!mlbbId || !svId)) {
      return res.json({
        success: false,
        message: "MLBB ID + Server ID required",
      });
    }

    if (game === "PUBG" && !pubgId) {
      return res.json({
        success: false,
        message: "PUBG ID required",
      });
    }

    const total = cart.reduce(
      (s, i) => s + Number(i.price || 0) * Number(i.qty || 1),
      0
    );

    if (!Number.isFinite(total) || total <= 0) {
      return res.json({
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

    console.log("🌐 [CREATE] web order:", {
      startCode,
      game,
      total,
    });

    return res.json({
      success: true,
      startCode,
    });
  } catch (err) {
    console.error("❌ create web order:", err);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
});

// =====================================================
//  BOT → CLAIM WEB ORDER
//  POST /api/web-orders/claim
// =====================================================
app.post("/api/web-orders/claim", async (req, res) => {
  try {
    const { startCode, telegramUserId, username, firstName } = req.body || {};

    console.log("🌐 [CLAIM] request:", {
      startCode,
      telegramUserId,
      username,
    });

    if (!startCode) {
      return res.json({
        success: false,
        message: "startCode required",
      });
    }

    const order = await WebOrder.findOne({ startCode });

    if (!order) {
      console.warn("⚠️ [CLAIM] startCode not found:", startCode);
      return res.json({
        success: false,
        message: "Invalid or expired link",
      });
    }

    if (order.claimed) {
      console.warn("⚠️ [CLAIM] already claimed:", startCode);
      return res.json({
        success: false,
        message: "Order already claimed",
      });
    }

    // one-time use
    order.claimed = true;
    await order.save();
    await WebOrder.deleteOne({ _id: order._id });

    console.log("✅ [CLAIM] ok:", {
      startCode,
      game: order.game,
      total: order.total,
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
    return res.json({
      success: false,
      message: "Server error",
    });
  }
});

// ---------------------------
//  START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
