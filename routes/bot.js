// --------------------------------------
//  BIKA STORE — BOT CONNECTOR
// --------------------------------------

import express from "express";
import axios from "axios";

const router = express.Router();

// Reuse BOT TOKEN + ADMIN ID
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN = process.env.BOT_ADMIN_ID;
const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;


// Send order to admin
router.post("/order", async (req, res) => {
  try {
    const { orderId, userId, username, game, mlbbId, mlbbServerId, pubgId, packageName, price } = req.body;

    const caption =
      `🆕 New Web Order\n` +
      `Order ID: ${orderId}\n` +
      `User: @${username || "unknown"} (${userId})\n\n` +
      `Game: ${game}\n` +
      (game === "MLBB" ? `MLBB ID: ${mlbbId}\nSV ID: ${mlbbServerId}\n` : `PUBG ID: ${pubgId}\n`) +
      `Package: ${packageName}\n` +
      `Price: ${price} Ks\n\n` +
      `Waiting for slip.`;

    await axios.post(`${TELEGRAM_URL}/sendMessage`, {
      chat_id: ADMIN,
      text: caption
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Bot order send error:", err);
    res.status(500).json({ error: "Bot send failed" });
  }
});


// Send slip to admin
router.post("/slip", async (req, res) => {
  try {
    const { orderId, userId, filePath } = req.body;

    const text = `📸 Payment Slip Received\nOrder ID: ${orderId}\nFrom User: ${userId}`;

    await axios.post(`${TELEGRAM_URL}/sendPhoto`, {
      chat_id: ADMIN,
      photo: process.env.API_BASE_URL + filePath,
      caption: text
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Slip send error:", err);
    res.status(500).json({ error: "Bot send failed" });
  }
});


// Update user after admin confirms
router.post("/status-update", async (req, res) => {
  try {
    const { orderId, status } = req.body;

    let msg = "";
    if (status === "COMPLETED") msg = `🎉 Your order ${orderId} is completed!`;
    if (status === "REJECTED") msg = `❌ Your order ${orderId} was rejected.`;

    // Send to user
    await axios.post(`${TELEGRAM_URL}/sendMessage`, {
      chat_id: req.body.userId,
      text: msg
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Bot update error:", err);
    res.status(500).json({ error: "Bot notify failed" });
  }
});

export default router;
