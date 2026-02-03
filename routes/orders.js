import express from "express";
import Order from "../models/Order.js";
import axios from "axios";

const router = express.Router();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.BOT_ADMIN_ID;
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// CREATE ORDER (from Web)
router.post("/", async (req, res) => {
  try {
    const order = await Order.create(req.body);

    // 🔔 SEND TO ADMIN BOT
    await axios.post(`${TG}/sendMessage`, {
      chat_id: ADMIN_ID,
      text:
        `🆕 *New Web Order*\n\n` +
        `🆔 Order ID: ${order.orderId}\n` +
        `🎮 Game: ${order.game}\n` +
        `📦 Package: ${order.packageName}\n` +
        `💰 Price: ${order.price} Ks`,
      parse_mode: "Markdown"
    });

    res.json({ success: true, orderId: order.orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

export default router;
