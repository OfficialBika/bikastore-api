// src/routes/webOrders.js
import express from "express";
import crypto from "crypto";

const router = express.Router();

// In-memory store for website orders
// (server restart ဖြစ်ရင် order history မဆက်လိုပါက ဒီလိုနည်းနဲ့လောက်ရပြီ)
const webOrders = new Map();

// -----------------------------
//   POST /api/web-orders
//   Website → create order + startCode အစ
// -----------------------------
router.post("/", (req, res) => {
  try {
    const { game, cart, mlbbId, svId, pubgId } = req.body || {};

    if (!game || !Array.isArray(cart) || !cart.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload (game/cart missing)",
      });
    }

    const total = cart.reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );

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
    console.error("POST /api/web-orders error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// -----------------------------
//   POST /api/web-orders/claim
//   Bot → /start web_xxx နဲ့ claim
// -----------------------------
router.post("/claim", (req, res) => {
  try {
    const { startCode, telegramUserId, username, firstName } =
      req.body || {};

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

    // one-time use
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
    console.error("POST /api/web-orders/claim error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
