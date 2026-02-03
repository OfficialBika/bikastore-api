// --------------------------------------
//  BIKA STORE — BOT WEBHOOK ROUTER
// --------------------------------------

import express from "express";
import axios from "axios";

const router = express.Router();

// ENV
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory user state (STEP CONTROL)
const userState = {};

// --------------------------------------
//  TELEGRAM WEBHOOK
// --------------------------------------
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    // ==============================
    // MESSAGE HANDLER
    // ==============================
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // -------- /start --------
      if (text === "/start") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "👋 Welcome to *BIKA Store!*\n\n" +
            "MLBB / PUBG / Telegram Premium / Stars ကို အလွယ်တကူ order လုပ်နိုင်ပါတယ်။\n\n" +
            "👉 */menu* ကိုရိုက်ပြီး စတင်ပါ။",
          parse_mode: "Markdown"
        });

        return res.sendStatus(200);
      }

      // -------- /menu --------
      if (text === "/menu") {
        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "📦 *BIKA Store Menu*",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💎 MLBB Diamonds", callback_data: "MLBB" }],
              [{ text: "🔫 PUBG UC", callback_data: "PUBG" }],
              [{ text: "⭐ Telegram Premium / Stars", callback_data: "TG_PREMIUM" }],
              [{ text: "🌐 Open Website", url: "https://bikastore-web.onrender.com" }]
            ]
          }
        });

        return res.sendStatus(200);
      }

      // -------- STEP HANDLING --------
      const state = userState[chatId];

      // MLBB ID
      if (state?.step === "WAITING_MLBB_ID") {
        state.mlbbId = text;
        state.step = "WAITING_MLBB_SERVER";

        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "📍 MLBB Server ID (SV ID) ကို ထည့်ပေးပါ"
        });

        return res.sendStatus(200);
      }

      // MLBB SERVER ID
      if (state?.step === "WAITING_MLBB_SERVER") {
        state.serverId = text;
        state.step = "WAITING_MLBB_PACKAGE";

        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "📦 Package ကို ရွေးပါ",
          reply_markup: {
            inline_keyboard: [
              [{ text: "86 💎", callback_data: "PKG_86" }],
              [{ text: "172 💎", callback_data: "PKG_172" }],
              [{ text: "Weekly Pass", callback_data: "PKG_WEEKLY" }]
            ]
          }
        });

        return res.sendStatus(200);
      }

      // PUBG ID
      if (state?.step === "WAITING_PUBG_ID") {
        state.pubgId = text;
        state.step = "WAITING_PUBG_PACKAGE";

        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "📦 PUBG UC Package ကို ရွေးပါ",
          reply_markup: {
            inline_keyboard: [
              [{ text: "60 UC", callback_data: "PUBG_60" }],
              [{ text: "325 UC", callback_data: "PUBG_325" }],
              [{ text: "660 UC", callback_data: "PUBG_660" }]
            ]
          }
        });

        return res.sendStatus(200);
      }
    }

    // ==============================
    // CALLBACK QUERY HANDLER
    // ==============================
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      // -------- GAME SELECT --------
      if (data === "MLBB") {
        userState[chatId] = {
          step: "WAITING_MLBB_ID",
          game: "MLBB"
        };

        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "💎 MLBB ID ကို ထည့်ပေးပါ"
        });
      }

      if (data === "PUBG") {
        userState[chatId] = {
          step: "WAITING_PUBG_ID",
          game: "PUBG"
        };

        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "🔫 PUBG ID ကို ထည့်ပေးပါ"
        });
      }

      // -------- MLBB PACKAGE --------
      if (data.startsWith("PKG_")) {
        const state = userState[chatId];
        if (!state) return res.sendStatus(200);

        state.package = data.replace("PKG_", "");

        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "✅ *Order Summary*\n\n" +
            `Game: MLBB\n` +
            `MLBB ID: ${state.mlbbId}\n` +
            `Server ID: ${state.serverId}\n` +
            `Package: ${state.package}\n\n` +
            "📸 Payment slip ပို့ပါ။",
          parse_mode: "Markdown"
        });
      }

      // -------- PUBG PACKAGE --------
      if (data.startsWith("PUBG_")) {
        const state = userState[chatId];
        if (!state) return res.sendStatus(200);

        state.package = data.replace("PUBG_", "");

        await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "✅ *Order Summary*\n\n" +
            `Game: PUBG\n` +
            `PUBG ID: ${state.pubgId}\n` +
            `Package: ${state.package} UC\n\n` +
            "📸 Payment slip ပို့ပါ။",
          parse_mode: "Markdown"
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Error:", err);
    res.sendStatus(500);
  }
});

export default router;
