// --------------------------------------
//  BIKA STORE — TELEGRAM BOT WEBHOOK
// --------------------------------------

import express from "express";
import axios from "axios";
import Order from "../models/Order.js";

const router = express.Router();

// ENV
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.BOT_ADMIN_ID;
const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// TEMP USER STATE (simple flow)
const userState = {};

// --------------------------------------
//  TELEGRAM WEBHOOK
// --------------------------------------
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    // -----------------------------
    // TEXT MESSAGE
    // -----------------------------
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // /start
      if (text === "/start") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "👋 *Welcome to BIKA Store!*\n\n" +
            "MLBB / PUBG / Telegram Premium / Stars ကို\n" +
            "လွယ်ကူလျင်မြန်စွာ order တင်နိုင်ပါတယ်။\n\n" +
            "👉 /menu ကိုနှိပ်ပြီး စတင်ပါ",
          parse_mode: "Markdown",
        });
      }

      // /menu
      if (text === "/menu") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
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

      // Waiting for payment slip
      if (userState[chatId]?.step === "WAIT_SLIP") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "📸 Payment Slip ပုံကို ပို့ပေးပါ",
        });
      }
    }

    // -----------------------------
    // CALLBACK BUTTON
    // -----------------------------
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      // INIT USER STATE
      userState[chatId] = { step: "SELECT_GAME", game: data };

      if (data === "MLBB") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "💎 *MLBB Diamonds*\n\n" +
            "အောက်ပါ format နဲ့ ပို့ပေးပါ 👇\n\n" +
            "`MLBB_ID SERVER_ID PACKAGE PRICE`\n\n" +
            "ဥပမာ:\n12345678 4321 WeeklyPass 5000",
          parse_mode: "Markdown",
        });
      }

      if (data === "PUBG") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "🔫 *PUBG UC*\n\n" +
            "အောက်ပါ format နဲ့ ပို့ပေးပါ 👇\n\n" +
            "`PUBG_ID PACKAGE PRICE`\n\n" +
            "ဥပမာ:\n512345678 UC60 3000",
          parse_mode: "Markdown",
        });
      }

      if (data === "TG") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "⭐ Telegram Premium / Stars\n\n" +
            "Website မှာ order တင်ပေးပါ 👇\n" +
            "https://bikastore-web.onrender.com",
        });
      }
    }

    // -----------------------------
    // PAYMENT SLIP (PHOTO)
    // -----------------------------
    if (update.message?.photo) {
      const chatId = update.message.chat.id;
      const state = userState[chatId];

      if (!state) return res.sendStatus(200);

      const fileId =
        update.message.photo[update.message.photo.length - 1].file_id;

      const orderId = Date.now(); // NUMBER

      // SAVE ORDER
      const order = await Order.create({
        orderId,
        userId: chatId,
        username: update.message.from.username || "unknown",
        game: state.game,
        mlbbId: state.mlbbId,
        mlbbServerId: state.serverId,
        pubgId: state.pubgId,
        packageName: state.package,
        price: state.price,
        paymentSlip: fileId,
        paidAt: new Date(),
        status: "PENDING_CONFIRM",
      });

      // SEND TO ADMIN
      await axios.post(`${TELEGRAM_URL}/sendPhoto`, {
        chat_id: ADMIN_ID,
        photo: fileId,
        caption:
          `🆕 *New Order*\n\n` +
          `Order ID: ${order.orderId}\n` +
          `User: @${order.username} (${order.userId})\n` +
          `Game: ${order.game}\n` +
          `Package: ${order.packageName}\n` +
          `Price: ${order.price} Ks`,
        parse_mode: "Markdown",
      });

      // CONFIRM USER
      await axios.post(`${TELEGRAM_URL}/sendMessage`, {
        chat_id: chatId,
        text:
          "✅ Payment Slip လက်ခံရရှိပါပြီ။\n" +
          "⏳ Admin စစ်ဆေးပြီး မကြာခင် ဆောင်ရွက်ပေးပါမယ်။",
      });

      delete userState[chatId];
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

export default router;
