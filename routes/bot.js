// --------------------------------------------------
//  BIKA STORE — TELEGRAM BOT WEBHOOK (FULL)
//  Includes:
//  A Webhook
//  B Menu
//  C Order + Slip Save (MongoDB)
//  D Admin Confirm / Reject
//  E Auto Clean (Order Complete)
//  F Website ↔ Bot Sync
// --------------------------------------------------

import express from "express";
import axios from "axios";
import Order from "../models/Order.js";
import { trackMessage, cleanChat } from "../utils/autoClean.js";

const router = express.Router();

// ENV
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.BOT_ADMIN_ID);
const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// TEMP USER STATE (runtime memory)
const userState = {};

// --------------------------------------------------
//  TELEGRAM WEBHOOK
// --------------------------------------------------
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;

    // ==================================================
    // TEXT MESSAGE
    // ==================================================
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // ---------- /start ----------
      if (text?.startsWith("/start")) {
        // Web order confirm: /start web_xxx
        if (text.startsWith("/start web_")) {
          const orderId = Number(text.replace("/start web_", ""));
          const order = await Order.findOne({ orderId });

          if (!order) {
            const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
              chat_id: chatId,
              text: "❌ Order မတွေ့ပါ။ Website မှာ ပြန်စစ်ပါ။",
            });
            trackMessage(chatId, sent.data.result.message_id);
            return res.sendStatus(200);
          }

          order.status = "WAITING_SLIP";
          await order.save();

          const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
            chat_id: chatId,
            text:
              `🧾 *Web Order Confirmed*\n\n` +
              `Order ID: ${order.orderId}\n` +
              `Game: ${order.game}\n` +
              `Package: ${order.packageName}\n` +
              `Price: ${order.price} Ks\n\n` +
              `📸 ငွေလွှဲပြီး Payment Slip ပုံကို ပို့ပေးပါ`,
            parse_mode: "Markdown",
          });

          trackMessage(chatId, sent.data.result.message_id);
          return res.sendStatus(200);
        }

        // Normal start
        const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text:
            "👋 *Welcome to BIKA Store*\n\n" +
            "MLBB / PUBG / Telegram Premium & Stars\n" +
            "လွယ်ကူလျင်မြန်စွာ order တင်နိုင်ပါတယ် 💎\n\n" +
            "👉 /menu ကိုနှိပ်ပြီး စတင်ပါ",
          parse_mode: "Markdown",
        });

        trackMessage(chatId, sent.data.result.message_id);
      }

      // ---------- /menu ----------
      if (text === "/menu") {
        const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
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

        trackMessage(chatId, sent.data.result.message_id);
      }

      // ---------- COLLECT TEXT INPUT ----------
      if (userState[chatId]?.step === "INPUT") {
        const parts = text.split(" ");

        if (userState[chatId].game === "MLBB" && parts.length >= 4) {
          userState[chatId].mlbbId = parts[0];
          userState[chatId].mlbbServerId = parts[1];
          userState[chatId].package = parts[2];
          userState[chatId].price = Number(parts[3]);
        }

        if (userState[chatId].game === "PUBG" && parts.length >= 3) {
          userState[chatId].pubgId = parts[0];
          userState[chatId].package = parts[1];
          userState[chatId].price = Number(parts[2]);
        }

        userState[chatId].step = "WAIT_SLIP";

        const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: "📸 Payment Slip ပုံကို ပို့ပေးပါ",
        });

        trackMessage(chatId, sent.data.result.message_id);
      }
    }

    // ==================================================
    // CALLBACK QUERY
    // ==================================================
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const msgId = update.callback_query.message.message_id;
      const data = update.callback_query.data;

      // ---------- USER GAME SELECT ----------
      if (["MLBB", "PUBG"].includes(data)) {
        userState[chatId] = { game: data, step: "INPUT" };

        const msg =
          data === "MLBB"
            ? "💎 MLBB အတွက်\n`ID SERVER_ID PACKAGE PRICE` ပုံစံနဲ့ ပို့ပါ"
            : "🔫 PUBG အတွက်\n`ID PACKAGE PRICE` ပုံစံနဲ့ ပို့ပါ";

        const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: chatId,
          text: msg,
          parse_mode: "Markdown",
        });

        trackMessage(chatId, sent.data.result.message_id);
      }

      // ---------- ADMIN CONFIRM ----------
      if (data.startsWith("confirm_") && chatId === ADMIN_ID) {
        const orderId = Number(data.replace("confirm_", ""));
        const order = await Order.findOne({ orderId });
        if (!order) return res.sendStatus(200);

        order.status = "COMPLETED";
        order.confirmedAt = new Date();
        await order.save();

        await axios.post(`${TELEGRAM_URL}/editMessageText`, {
          chat_id: chatId,
          message_id: msgId,
          text: `✅ Order ${order.orderId} COMPLETED`,
        });

        const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: order.userId,
          text:
            `🎉 *Order Completed*\n\n` +
            `Order ID: ${order.orderId}\n` +
            `Game: ${order.game}\n` +
            `Package: ${order.packageName}\n\n` +
            `ကျေးဇူးတင်ပါတယ် 💚`,
          parse_mode: "Markdown",
        });

        trackMessage(order.userId, sent.data.result.message_id);
        await cleanChat(order.userId, { keepLast: 1 });

        return res.sendStatus(200);
      }

      // ---------- ADMIN REJECT ----------
      if (data.startsWith("reject_") && chatId === ADMIN_ID) {
        const orderId = Number(data.replace("reject_", ""));
        const order = await Order.findOne({ orderId });
        if (!order) return res.sendStatus(200);

        order.status = "REJECTED";
        order.confirmedAt = new Date();
        await order.save();

        await axios.post(`${TELEGRAM_URL}/editMessageText`, {
          chat_id: chatId,
          message_id: msgId,
          text: `❌ Order ${order.orderId} REJECTED`,
        });

        const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
          chat_id: order.userId,
          text:
            `❌ *Order Rejected*\n\n` +
            `Order ID: ${order.orderId}\n` +
            `Admin က payment ကို အတည်မပြုနိုင်ပါ။`,
          parse_mode: "Markdown",
        });

        trackMessage(order.userId, sent.data.result.message_id);
        return res.sendStatus(200);
      }
    }

    // ==================================================
    // PAYMENT SLIP (PHOTO)
    // ==================================================
    if (update.message?.photo) {
      const chatId = update.message.chat.id;
      const state = userState[chatId];
      if (!state) return res.sendStatus(200);

      const fileId =
        update.message.photo[update.message.photo.length - 1].file_id;

      const orderId = Date.now();

      const order = await Order.create({
        orderId,
        userId: chatId,
        username: update.message.from.username || "unknown",
        game: state.game,
        mlbbId: state.mlbbId,
        mlbbServerId: state.mlbbServerId,
        pubgId: state.pubgId,
        packageName: state.package,
        price: state.price,
        paymentSlip: fileId,
        paidAt: new Date(),
        status: "PENDING_CONFIRM",
      });

      await axios.post(`${TELEGRAM_URL}/sendPhoto`, {
        chat_id: ADMIN_ID,
        photo: fileId,
        caption:
          `🆕 New Order\n\n` +
          `Order ID: ${order.orderId}\n` +
          `User: @${order.username}\n` +
          `Game: ${order.game}\n` +
          `Package: ${order.packageName}\n` +
          `Price: ${order.price} Ks`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Confirm", callback_data: `confirm_${order.orderId}` },
              { text: "❌ Reject", callback_data: `reject_${order.orderId}` },
            ],
          ],
        },
      });

      const sent = await axios.post(`${TELEGRAM_URL}/sendMessage`, {
        chat_id: chatId,
        text:
          "✅ Payment Slip လက်ခံရရှိပါပြီ。\n" +
          "⏳ Admin စစ်ဆေးပြီး မကြာခင် ပြန်ကြားပါမယ်။",
      });

      trackMessage(chatId, sent.data.result.message_id);
      delete userState[chatId];
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

export default router;
