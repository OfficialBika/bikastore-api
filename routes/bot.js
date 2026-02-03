// --------------------------------------
//  BIKA STORE — BOT CONNECTOR + WEBHOOK
// --------------------------------------

import express from "express";
import axios from "axios";

const router = express.Router();

// ENV
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN = process.env.BOT_ADMIN_ID;
const API_BASE_URL = process.env.API_BASE_URL || "https://bikastore-api.onrender.com";

if (!BOT_TOKEN) {
  console.warn("⚠️ BOT_TOKEN is missing. Bot routes will NOT work correctly.");
}
if (!ADMIN) {
  console.warn("⚠️ BOT_ADMIN_ID is missing. Admin notifications will fail.");
}

const TELEGRAM_URL = BOT_TOKEN
  ? `https://api.telegram.org/bot${BOT_TOKEN}`
  : null;

// --------------------------------------
//  Telegram Webhook (Telegram ➝ API)
//  URL: POST /bot/webhook
// --------------------------------------

router.post("/webhook", async (req, res) => {
  const update = req.body;
  const message = update.message;

  try {
    if (!message || !message.chat) {
      return res.status(200).send("OK");
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // /start ကို handle
    if (text === "/start") {
      await axios.post(`${TELEGRAM_URL}/sendMessage`, {
        chat_id: chatId,
        text:
          "👋 Welcome to BIKA Store!\n\n" +
          "MLBB / PUBG / Telegram Premium / Stars ကို ဒီနေရာမှာ တစ်ခုတည်းလုံး order လုပ်လို့ရပါတယ်.\n\n" +
          "👉 /menu လို့ရိုက်ပြီး ပစ္စည်းစာရင်းကို ကြည့်ပါ။"
      });
    }

    // /menu ကို handle (နောက်ပိုင်းမှာ Inline Keyboard တွေထည့်သွားရမယ်)
    else if (text === "/menu") {
      await axios.post(`${TELEGRAM_URL}/sendMessage`, {
        chat_id: chatId,
        text:
          "📦 BIKA Store Menu\n\n" +
          "1️⃣ MLBB Diamonds / Weekly Pass\n" +
          "2️⃣ PUBG UC\n" +
          "3️⃣ Telegram Premium / Stars\n\n" +
          "အခုတော့ Website ကနေ သွားဝယ်ရမှာ ဖြစ်တယ်.\n" +
          "👉 https://bikastore-web.onrender.com"
      });
    }

    // အခြား message တွေအတွက် default reply (ချင်ရင်ပဲထား)
    else {
      await axios.post(`${TELEGRAM_URL}/sendMessage`, {
        chat_id: chatId,
        text: `🔁 Echo from API: ${text}`
      });
    }
  } catch (err) {
    console.error("Webhook handler error:", err.message);
  }

  // Telegram ကို အမြန် OK ပြန်ပို့
  res.status(200).send("OK");
});
// --------------------------------------
//  Web ➝ Admin (order info ပို့တာ)
//  URL: POST /bot/order
// --------------------------------------

router.post("/order", async (req, res) => {
  if (!TELEGRAM_URL || !ADMIN) {
    return res
      .status(500)
      .json({ error: "BOT_TOKEN or BOT_ADMIN_ID not set" });
  }

  try {
    const {
      orderId,
      userId,
      username,
      game,
      mlbbId,
      mlbbServerId,
      pubgId,
      packageName,
      price,
    } = req.body;

    const caption =
      `🆕 New Web Order\n` +
      `Order ID: ${orderId}\n` +
      `User: @${username || "unknown"} (${userId})\n\n` +
      `Game: ${game}\n` +
      (game === "MLBB"
        ? `MLBB ID: ${mlbbId}\nSV ID: ${mlbbServerId}\n`
        : `PUBG ID: ${pubgId}\n`) +
      `Package: ${packageName}\n` +
      `Price: ${price} Ks\n\n` +
      `Waiting for slip.`;

    await axios.post(`${TELEGRAM_URL}/sendMessage`, {
      chat_id: ADMIN,
      text: caption,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Bot order send error:", err.message);
    res.status(500).json({ error: "Bot send failed" });
  }
});

// --------------------------------------
//  Web ➝ Admin (payment slip ပို့တာ)
//  URL: POST /bot/slip
// --------------------------------------

router.post("/slip", async (req, res) => {
  if (!TELEGRAM_URL || !ADMIN) {
    return res
      .status(500)
      .json({ error: "BOT_TOKEN or BOT_ADMIN_ID not set" });
  }

  try {
    const { orderId, userId, filePath } = req.body;

    const text = `📸 Payment Slip Received\nOrder ID: ${orderId}\nFrom User: ${userId}`;
    const photoUrl = API_BASE_URL + filePath; // e.g. https://bikastore-api.onrender.com/uploads/payments/xxx.png

    await axios.post(`${TELEGRAM_URL}/sendPhoto`, {
      chat_id: ADMIN,
      photo: photoUrl,
      caption: text,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Slip send error:", err.message);
    res.status(500).json({ error: "Bot send failed" });
  }
});

// --------------------------------------
//  Admin Panel ➝ User (status update)
//  URL: POST /bot/status-update
// --------------------------------------

router.post("/status-update", async (req, res) => {
  if (!TELEGRAM_URL) {
    return res.status(500).json({ error: "BOT_TOKEN not set" });
  }

  try {
    const { orderId, status, userId } = req.body;

    let msg = "";
    if (status === "COMPLETED")
      msg = `🎉 Your order ${orderId} is completed! Thank you.`;
    if (status === "REJECTED")
      msg = `❌ Your order ${orderId} was rejected.\nPlease contact support if you think this is a mistake.`;

    if (!msg) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await axios.post(`${TELEGRAM_URL}/sendMessage`, {
      chat_id: userId,
      text: msg,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Bot update error:", err.message);
    res.status(500).json({ error: "Bot notify failed" });
  }
});

export default router;
