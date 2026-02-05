// ---------------------------
//  BIKA STORE API — SERVER.JS
// ---------------------------

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";                 // 👈 web-order အတွက်လိုမလား

import connectMongo from "./db/mongo.js";    // ✅ Correct import name

// Routes
import orderRoutes from "./routes/orders.js";
import reviewRoutes from "./routes/reviews.js";
import paymentRoutes from "./routes/payments.js";
import botRoutes from "./routes/bot.js";

// Load .env
dotenv.config();

// Initialize
const app = express();
const PORT = process.env.PORT || 5000;

// Helpers for dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------
//   MIDDLEWARES
// ---------------------------

app.use(
  cors({
    origin: process.env.WEB_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Parse JSON
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Static folder for payment slip uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------------------
//   CONNECT DATABASE
// ---------------------------
connectMongo(); // ✅ Correct function name

// ---------------------------
//   WEB ORDER BRIDGE (website <-> bot)
//   /api/orders/web-order          = website မှာ အော်ဒါတင်တဲ့အချိန်
//   /api/orders/web-order/claim    = bot /start web_xxx မှာ ဖတ်တဲ့အချိန်
// ---------------------------

// In-memory store for web orders (Render restart 된ရင် ရှင်းသွားမယ်)
const webOrders = new Map();

// Website → create web order + startCode
app.post("/api/orders/web-order", (req, res) => {
  try {
    const { game, cart, mlbbId, svId, pubgId } = req.body || {};

    if (!game || !Array.isArray(cart) || !cart.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload (game/cart missing)",
      });
    }

    const total = cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );

    // eg. web_0af31c92b3aa
    const startCode = "web_" + crypto.randomBytes(6).toString("hex");

    webOrders.set(startCode, {
      game,
      cart,
      mlbbId: mlbbId || "",
      svId: svId || "",
      pubgId: pubgId || "",
      total,
      createdAt: Date.now(),
      claimed: false,
    });

    return res.json({ success: true, startCode });
  } catch (err) {
    console.error("POST /api/orders/web-order error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Bot → /start web_xxx နဲ့ claim လုပ်ဖို့
app.post("/api/orders/web-order/claim", (req, res) => {
  try {
    const { startCode, telegramUserId, username, firstName } = req.body || {};

    if (!startCode) {
      return res.status(400).json({
        success: false,
        message: "startCode is required",
      });
    }

    const record = webOrders.get(startCode);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired startCode",
      });
    }

    // one-time use (တစ်ကြိမ်သုံးရင်ပဲ ရှိအောင်)
    webOrders.delete(startCode);

    return res.json({
      success: true,
      order: {
        game: record.game,
        cart: record.cart,
        total: record.total,
        mlbbId: record.mlbbId,
        svId: record.svId,
        pubgId: record.pubgId,
        telegramUserId,
        username,
        firstName,
      },
    });
  } catch (err) {
    console.error("POST /api/orders/web-order/claim error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ---------------------------
//   ROUTES (existing)
// ---------------------------

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "BIKA Store API",
    version: "1.0.0",
    author: "OfficialBika",
  });
});

app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/bot", botRoutes);

// ---------------------------
//   HANDLE 404
// ---------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------------------------
//   START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`🚀 BIKA API running on port ${PORT}`);
});
