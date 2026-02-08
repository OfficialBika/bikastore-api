// ---------------------------
//  BIKA STORE API — server.js
//  DB-based Web Orders (SAFE + IDEMPOTENT CLAIM)
//  Single-file production friendly
// ---------------------------

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

// ---------------------------
//  ENV
// ---------------------------
const PORT = Number(process.env.PORT || 5000);
const WEB_ORIGIN = String(process.env.WEB_ORIGIN || "*").trim();
const MONGO_URI = String(process.env.MONGO_URI || "").trim();

// ---------------------------
//  MIDDLEWARE
// ---------------------------

// ✅ CORS NOTE:
// - If you use credentials:true, origin cannot be "*"
// - For simplicity: if WEB_ORIGIN="*" => credentials=false
const corsOptions = {
  origin: WEB_ORIGIN === "*" ? true : WEB_ORIGIN,
  credentials: WEB_ORIGIN === "*" ? false : true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// ---------------------------
//  MONGODB CONNECT
// ---------------------------
if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10,
  })
  .then(() => console.log("🍃 MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err?.message || err);
    process.exit(1);
  });

// ---------------------------
//  WEB ORDER MODEL (TTL)
// ---------------------------
// TTL: expires after 30 minutes from createdAt
const webOrderSchema = new mongoose.Schema(
  {
    startCode: { type: String, unique: true, index: true },

    game: { type: String, enum: ["MLBB", "PUBG"], required: true },
    cart: { type: Array, required: true },

    mlbbId: { type: String, default: "" },
    svId: { type: String, default: "" },
    pubgId: { type: String, default: "" },

    total: { type: Number, required: true },

    // Claim state (idempotent)
    claimed: { type: Boolean, default: false, index: true },
    claimedBy: { type: String, default: "" }, // telegramUserId as string
    claimedAt: { type: Date, default: null },

    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 30, // 30 minutes TTL
      index: true,
    },
  },
  { versionKey: false }
);

const WebOrder = mongoose.model("WebOrder", webOrderSchema);

// ---------------------------
//  HELPERS
// ---------------------------
function sanitizeCart(cart) {
  // prevent weird payload / huge objects
  if (!Array.isArray(cart)) return [];
  return cart
    .slice(0, 50)
    .map((i) => ({
      game: String(i?.game || ""),
      label: String(i?.label || ""),
      display: String(i?.display || ""),
      price: Number(i?.price || 0),
      qty: Number(i?.qty || 1),
    }))
    .filter((i) => Number.isFinite(i.price) && Number.isFinite(i.qty));
}

function computeTotal(cart) {
  return cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0);
}

function buildOrderResponse(orderDoc, passthrough) {
  return {
    game: orderDoc.game,
    cart: orderDoc.cart,
    total: orderDoc.total,
    mlbbId: orderDoc.mlbbId,
    svId: orderDoc.svId,
    pubgId: orderDoc.pubgId,
    ...passthrough,
  };
}

async function generateUniqueStartCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = "web_" + crypto.randomBytes(6).toString("hex");
    const exists = await WebOrder.findOne({ startCode: code }).select("_id").lean();
    if (!exists) return code;
  }
  // fallback (extremely rare)
  return "web_" + crypto.randomBytes(10).toString("hex");
}

// ---------------------------
//  HEALTH CHECK
// ---------------------------
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "BIKA Store API",
    time: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.json({ ok: true, dbConnected: dbState === 1 });
});

// =====================================================
//  WEBSITE → CREATE WEB ORDER
//  POST /api/web-orders
// =====================================================
app.post("/api/web-orders", async (req, res) => {
  try {
    const { game, cart, mlbbId, svId, pubgId } = req.body || {};

    if (!game) {
      return res.status(400).json({ success: false, message: "game is required" });
    }
    if (game !== "MLBB" && game !== "PUBG") {
      return res.status(400).json({ success: false, message: "Invalid game type" });
    }

    const safeCart = sanitizeCart(cart);
    if (!safeCart.length) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload (cart empty)" });
    }

    if (game === "MLBB") {
      if (!mlbbId || !svId) {
        return res.status(400).json({
          success: false,
          message: "MLBB ID + Server ID required",
        });
      }
    }

    if (game === "PUBG") {
      if (!pubgId) {
        return res.status(400).json({
          success: false,
          message: "PUBG ID required",
        });
      }
    }

    const total = computeTotal(safeCart);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart total",
      });
    }

    const startCode = await generateUniqueStartCode();

    await WebOrder.create({
      startCode,
      game,
      cart: safeCart,
      mlbbId: mlbbId || "",
      svId: svId || "",
      pubgId: pubgId || "",
      total,
      claimed: false,
      claimedBy: "",
      claimedAt: null,
    });

    return res.json({ success: true, startCode });
  } catch (err) {
    // handle duplicate key (very rare)
    if (err && err.code === 11000) {
      return res.status(500).json({
        success: false,
        message: "Please try again (code collision)",
      });
    }

    console.error("❌ POST /api/web-orders error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================================================
//  BOT → CLAIM WEB ORDER (IDEMPOTENT + ATOMIC)
//  POST /api/web-orders/claim
// =====================================================
app.post("/api/web-orders/claim", async (req, res) => {
  try {
    const { startCode, telegramUserId, username, firstName } = req.body || {};
    if (!startCode) {
      return res.status(400).json({ success: false, message: "startCode required" });
    }

    const tgId = telegramUserId ? String(telegramUserId) : "";
    const pass = { telegramUserId, username, firstName };

    // 1) Fast path: try atomic claim if not claimed
    //    If two users click same time, only one will succeed here.
    const claimedNow = await WebOrder.findOneAndUpdate(
      { startCode, claimed: false },
      { $set: { claimed: true, claimedBy: tgId || "", claimedAt: new Date() } },
      { new: true }
    ).lean();

    if (claimedNow) {
      return res.json({
        success: true,
        order: buildOrderResponse(claimedNow, pass),
      });
    }

    // 2) If not found above:
    //    - Either expired (not found)
    //    - Or already claimed (maybe same user / other user)
    const existing = await WebOrder.findOne({ startCode }).lean();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired link",
      });
    }

    if (existing.claimed) {
      // Same user => idempotent return
      if (tgId && existing.claimedBy && existing.claimedBy === tgId) {
        return res.json({
          success: true,
          order: buildOrderResponse(existing, {
            ...pass,
            note: "already_claimed_by_same_user",
          }),
        });
      }

      // Different user => block
      return res.status(400).json({
        success: false,
        message: "Order already claimed",
      });
    }

    // Edge: tgId missing but order not claimed (shouldn't happen often)
    // Do a second atomic claim without tgId check
    const claimedEdge = await WebOrder.findOneAndUpdate(
      { startCode, claimed: false },
      { $set: { claimed: true, claimedBy: tgId || "", claimedAt: new Date() } },
      { new: true }
    ).lean();

    if (claimedEdge) {
      return res.json({
        success: true,
        order: buildOrderResponse(claimedEdge, pass),
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to claim (please retry)",
    });
  } catch (err) {
    console.error("❌ POST /api/web-orders/claim error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------------------
//  404
// ---------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ---------------------------
//  START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
