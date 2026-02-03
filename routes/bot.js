import express from "express";
import axios from "axios";
import Order from "../models/Order.js";
import fs from "fs";
import FormData from "form-data";

const router = express.Router();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.BOT_ADMIN_ID;
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ----------------------------
// Telegram Webhook
// ----------------------------
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    // ----------------------------
    // CALLBACK (Approve / Reject)
    // ----------------------------
    if (update.callback_query) {
      const data = update.callback_query.data;
      const msg = update.callback_query.message;
      const chatId = msg.chat.id;

      if (data.startsWith("approve:") || data.startsWith("reject:")) {
        const [action, orderId] = data.split(":");
        const order = await Order.findOne({ orderId: Number(orderId) });
        if (!order) return res.sendStatus(200);

        if (action === "approve") {
          order.status = "COMPLETED";
          order.confirmedAt = new Date();
          await order.save();

          // Edit admin message
          await axios.post(`${TG}/editMessageCaption`, {
            chat_id: chatId,
            message_id: msg.message_id,
            caption: `✅ *ORDER COMPLETED*\n\nOrder ID: ${order.orderId}`,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [] }
          });

          // Notify user
          await axios.post(`${TG}/sendMessage`, {
            chat_id: order.userId,
            text:
              `🎉 *Order Completed!*\n\n` +
              `🆔 Order ID: ${order.orderId}\n` +
              `📦 ${order.packageName}\n` +
              `💰 ${order.price} Ks\n\n` +
              `ကျေးဇူးတင်ပါတယ် ❤️`,
            parse_mode: "Markdown"
          });

          // Auto clean (delete old msgs)
          for (let i = msg.message_id - 20; i < msg.message_id; i++) {
            axios.post(`${TG}/deleteMessage`, {
              chat_id: order.userId,
              message_id: i
            }).catch(() => {});
          }
        }

        if (action === "reject") {
          order.status = "REJECTED";
          await order.save();

          await axios.post(`${TG}/editMessageCaption`, {
            chat_id: chatId,
            message_id: msg.message_id,
            caption: `❌ *ORDER REJECTED*\n\nOrder ID: ${order.orderId}`,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [] }
          });

          await axios.post(`${TG}/sendMessage`, {
            chat_id: order.userId,
            text: `❌ Order ${order.orderId} ကို Reject လုပ်လိုက်ပါတယ်`,
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Error:", err.message);
    res.sendStatus(500);
  }
});


// ----------------------------
// Send Order to Admin
// ----------------------------
router.post("/send-order", async (req, res) => {
  try {
    const order = req.body;

    const mention = order.username
      ? `@${order.username}`
      : `[User](tg://user?id=${order.userId})`;

    const caption =
      `🆕 *NEW ORDER*\n\n` +
      `🆔 Order ID: ${order.orderId}\n` +
      `👤 User: ${mention}\n\n` +
      `🎮 Game: ${order.game}\n` +
      `📦 Package: ${order.packageName}\n` +
      `💰 Price: ${order.price} Ks\n\n` +
      `📸 Waiting for slip...`;

    await axios.post(`${TG}/sendMessage`, {
      chat_id: ADMIN_ID,
      text: caption,
      parse_mode: "Markdown"
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false });
  }
});


// ----------------------------
// Send Slip to Admin (with buttons)
// ----------------------------
router.post("/send-slip", async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId });

    const mention = order.username
      ? `@${order.username}`
      : `[User](tg://user?id=${order.userId})`;

    const form = new FormData();
    form.append("chat_id", ADMIN_ID);
    form.append(
      "caption",
      `📸 *PAYMENT RECEIVED*\n\n` +
        `🆔 Order ID: ${order.orderId}\n` +
        `👤 User: ${mention}\n` +
        `📦 ${order.packageName}\n` +
        `💰 ${order.price} Ks`
    );
    form.append("parse_mode", "Markdown");
    form.append("photo", fs.createReadStream(order.paymentSlip));
    form.append("reply_markup", JSON.stringify({
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve:${order.orderId}` },
          { text: "❌ Reject", callback_data: `reject:${order.orderId}` }
        ]
      ]
    }));

    await axios.post(`${TG}/sendPhoto`, form, {
      headers: form.getHeaders()
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false });
  }
});

export default router;
