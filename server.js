// ---------------------------
//  BIKA STORE API — SERVER.JS
//  DB BASED WEB ORDER FLOW
// ---------------------------

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =======================
// MIDDLEWARE
// =======================
app.use(cors({
  origin: process.env.WEB_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// =======================
// MONGODB CONNECT
// =======================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  })
  .then(() => console.log("🍃 MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

// =======================
// ORDER MODEL
// =======================
const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: Number, unique: true, index: true },

    source: {
      type: String,
      enum: ["WEB", "BOT"],
      default: "WEB",
    },

    game: {
      type: String,
      enum: ["MLBB", "PUBG"],
      required: true,
    },

    cart: [
      {
        label: String,
        price: Number,
        qty: Number,
      },
    ],

    totalPrice: { type: Number, required: true },

    mlbbId: String,
    serverId: String,
    pubgId: String,

    telegramUserId: Number,
    username: String,
    firstName: String,

    status: {
      type: String,
      enum: [
        "CREATED",
        "CLAIMED",
        "AWAITING_PAYMENT",
        "AWAITING_CONFIRM",
        "COMPLETED",
        "REJECTED",
        "CANCELLED",
      ],
      default: "CREATED",
      index: true,
    },

    paidAt: Date,
    confirmedAt: Date,
    adminNote: String,
  },
  { timestamps: true }
);

// auto increment orderId
OrderSchema.pre("save", async function (next) {
  if (this.orderId) return next();

  const last = await mongoose
    .model("Order")
    .findOne({})
    .sort({ orderId: -1 })
    .select("orderId");

  this.orderId = last ? last.orderId + 1 : 1001;
  next();
});

const Order = mongoose.model("Order", OrderSchema);

// =======================
// HEALTH CHECK
// =======================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "BIKA Store API",
  });
});

// ===================================================
// 1️⃣ WEBSITE → CREATE ORDER
// POST /api/web-orders
// ===================================================
app.post("/api/web-orders", async (req, res) => {
  try {
    const { game, cart, mlbbId, svId, pubgId } = req.body;

    if (!game || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    if (game === "MLBB" && (!mlbbId || !svId)) {
      return res.status(400).json({
        success: false,
        message: "MLBB ID & Server ID required",
      });
    }

    if (game === "PUBG" && !pubgId) {
      return res.status(400).json({
        success: false,
        message: "PUBG ID required",
      });
    }

    const total = cart.reduce(
      (s, i) => s + Number(i.price || 0) * Number(i.qty || 0),
      0
    );

    const order = await Order.create({
      source: "WEB",
      game,
      cart,
      totalPrice: total,
      mlbbId,
      serverId: svId,
      pubgId,
      status: "CREATED",
    });

    const startCode = `web_${order.orderId}`;

    return res.json({
      success: true,
      startCode,
    });
  } catch (err) {
    console.error("❌ /api/web-orders:", err);
    res.status(500).json({ success: false });
  }
});

// ===================================================
// 2️⃣ BOT → CLAIM ORDER
// POST /api/web-orders/claim
// ===================================================
app.post("/api/web-orders/claim", async (req, res) => {
  try {
    const { startCode, telegramUserId, username, firstName } = req.body;

    if (!startCode || !startCode.startsWith("web_")) {
      return res.status(400).json({
        success: false,
        message: "Invalid startCode",
      });
    }

    const orderId = Number(startCode.replace("web_", ""));

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "CREATED") {
      return res.status(400).json({
        success: false,
        message: "Order already claimed",
      });
    }

    order.telegramUserId = telegramUserId;
    order.username = username;
    order.firstName = firstName;
    order.status = "CLAIMED";

    await order.save();

    return res.json({
      success: true,
      order: {
        orderId: order.orderId,
        game: order.game,
        cart: order.cart,
        total: order.totalPrice,
        mlbbId: order.mlbbId,
        svId: order.serverId,
        pubgId: order.pubgId,
      },
    });
  } catch (err) {
    console.error("❌ /api/web-orders/claim:", err);
    res.status(500).json({ success: false });
  }
});

// =======================
// 404
// =======================
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// =======================
// START
// =======================
app.listen(PORT, () => {
  console.log(`🚀 BIKA API running on port ${PORT}`);
});
