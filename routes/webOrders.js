// src/routes/webOrders.js
// -----------------------------
//  BIKA STORE – Website Web Orders
//  - Website: POST /api/web-orders
//  - Bot:     POST /api/web-orders/claim
// -----------------------------

import express from "express";
import crypto from "crypto";

const router = express.Router();

// In-memory store for website orders
// Server restart ဖြစ်ရင် ဒီအထဲက data တွေ မလိုတော့ရင် ဒီနည်းလောက်နဲ့ OK
const webOrders = new Map();

// Order TTL (optional) – 30 minutes
const TTL_MS = 30 * 60 * 1000;

// Small helper: expired orders cleanup
function cleanupExpired() {
  const now = Date.now();
  for (const [code, record] of webOrders.entries()) {
    if (record.createdAt + TTL_MS < now) {
      webOrders.delete(code);
    }
  }
}

// -----------------------------
//   POST /api/web-orders
//   Website → create order + startCode ထုတ်ပေး
// -----------------------------
router.post("/", (req, res) => {
  try {
    cleanupExpired();

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

    // Compute total
    const total = cart.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 0) || 1;
      return sum + price * qty;
    }, 0);

    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart total",
      });
    }

    // Game-specific required fields
    if (game === "MLBB") {
      if (!mlbbId || !svId) {
        return res.status(400).json({
          success: false,
          message: "MLBB ID and Server ID are required",
        });
      }
    } else if (game === "PUBG") {
      if (!pubgId) {
        return res.status(400).json({
          success: false,
          message: "PUBG ID is required",
        });
      }
    }

    // Unique startCode for this order
    const startCode = "web_" + crypto.randomBytes(6).toString("hex");

    // Save to in-memory store
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

    console.log("[WEB-ORDERS] Created web order:", {
      startCode,
      game,
      total,
    });

    return res.json({
      success: true,
      startCode, // e.g. web_a1b2c3d4e5f6
    });
  } catch (err) {
    console.error("POST /api/web-orders error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// -----------------------------
//   POST /api/web-orders/claim
//   Bot → /start web_xxx နဲ့ order data ယူသုံး
// -----------------------------
router.post("/claim", (req, res) => {
  try {
    cleanupExpired();

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

    // One-time use – claim လုပ်သွားရင် ဖျက်လိုက်မယ်
    webOrders.delete(startCode);

    console.log("[WEB-ORDERS] Claimed web order:", {
      startCode,
      game: record.game,
      total: record.total,
      telegramUserId,
    });

    return res.json({
      success: true,
      order: {
        game: record.game,
        cart: record.cart,
        total: record.total,
        mlbbId: record.mlbbId,
        svId: record.svId,
        pubgId: record.pubgId,
        telegramUserId: telegramUserId || null,
        username: username || "",
        firstName: firstName || "",
      },
    });
  } catch (err) {
    console.error("POST /api/web-orders/claim error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
