// index.js  (bikastore-api project)

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory store for web orders
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
    console.error("POST /web-order error:", err);
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
    console.error("POST /web-order/claim error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

app.get("/", (req, res) => {
  res.send("BIKA STORE API is running.");
});

app.listen(PORT, () => {
  console.log("🚀 BIKA STORE API listening on port", PORT);
});
