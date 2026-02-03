// --------------------------------------
//  BIKA STORE — TELEGRAM BOT WEBHOOK
// --------------------------------------

import express from "express";
import axios from "axios";
import Order from "../models/Order.js";

const router = express.Router();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.BOT_ADMIN_ID;
const API_BASE = process.env.API_BASE_URL;

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ------------------------------
// TELEGRAM WEBHOOK
// ------------------------------
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    // --------------------------
    // USER MESSAGE (/start, /menu)
    // --------------------------
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (text === "/start") {
        await axios.post(`${TG_API}/sendMessage`, {
          chat_id: chatId,
          text:
            `👋 Welcome to *BIKA Store*\n\n` +
            `MLBB / PUBG / Telegram Premium\n\n` +
            `👉 /menu ကိုနှိပ်ပြီး order တင်နိုင်ပါတယ်`,
          parse_mode: "Markdown",
        });
      }

      if (text === "/menu") {
        await axios.post(`${TG_API}/sendMessage`, {
          chat_id: chatId,
          text: "📦 *BIKA Store Menu*",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💎 MLBB Diamonds", callback_data: "MLBB" }],
              [{ text: "🔫 PUBG UC", callback_data: "PUBG" }],
              [{ text: "⭐ Telegram Premium / Stars", callback_data: "TG" }],
              [
                {
                  text: "🌐 Open Website",
                  url: "https://bikastore-web.onrender.com",
                },
              ],
            ],
          },
        });
      }
    }

    // --------------------------
    // CALLBACK BUTTON
    // --------------------------
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data;
      const chatId = cb.message.chat.id;
      const messageId = cb.message.message_id;

      // ADMIN ACTION
      if (data.startsWith("APPROVE_") || data.startsWith("REJECT_")) {
        const orderId = data.split("_")[1];
        const order = await Order.findOne({ orderId });

        if (!order) return res.sendStatus(200);

        if (data.startsWith("APPROVE_")) {
          order.status = "COMPLETED";
          await order.save();

          // notify user
          await axios.post(`${TG_API}/sendMessage`, {
            chat_id: order.userId,
            text:
              `🎉 *Order Completed!*\n\n` +
              `🆔 Order ID: ${order.orderId}\n` +
              `🎮 Game: ${order.game}\n` +
              `📦 Package: ${order.packageName}\n\n` +
              `ကျေးဇူးတင်ပါတယ် 🙏`,
            parse_mode: "Markdown",
          });

          await axios.post(`${TG_API}/editMessageReplyMarkup`, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {},
          });
        }

        if (data.startsWith("REJECT_")) {
          order.status = "REJECTED";
          await order.save();

          await axios.post(`${TG_API}/sendMessage`, {
            chat_id: order.userId,
            text:
              `❌ *Order Rejected*\n\n` +
              `🆔 Order ID: ${order.orderId}\n` +
              `ကျေးဇူးပြုပြီး admin ကိုဆက်သွယ်ပါ`,
            parse_mode: "Markdown",
          });

          await axios.post(`${TG_API}/editMessageReplyMarkup`, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {},
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Error:", err);
    res.sendStatus(500);
  }
});

// --------------------------------------
// SEND SLIP TO ADMIN (FROM WEB)
// --------------------------------------
router.post("/slip", async (req, res) => {
  try {
    const { orderId, filePath } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const mention = order.username
      ? `@${order.username}`
      : `[User](tg://user?id=${order.userId})`;

    const gameInfo =
      order.game === "MLBB"
        ? `MLBB ID: ${order.mlbbId}\nServer: ${order.mlbbServerId}`
        : `PUBG ID: ${order.pubgId}`;

    const caption =
      `📸 *Payment Slip Received*\n\n` +
      `🆔 Order ID: ${order.orderId}\n` +
      `👤 User: ${mention}\n` +
      `🧾 User ID: ${order.userId}\n\n` +
      `🎮 Game: ${order.game}\n` +
      `${gameInfo}\n\n` +
      `📦 Package: ${order.packageName}\n` +
      `💰 Price: ${order.price} Ks`;

    await axios.post(`${TG_API}/sendPhoto`, {
      chat_id: ADMIN_ID,
      photo: `${API_BASE}${filePath}`,
      caption,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Approve",
              callback_data: `APPROVE_${order.orderId}`,
            },
            {
              text: "❌ Reject",
              callback_data: `REJECT_${order.orderId}`,
            },
          ],
        ],
      },
    });

    order.status = "PENDING_CONFIRM";
    await order.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Slip Error:", err);
    res.status(500).json({ error: "Slip send failed" });
  }
});

export default router;
