// index.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import TelegramBot from "node-telegram-bot-api";

// ================ ENV =================
const {
  BOT_TOKEN,
  ADMIN_CHAT_ID,
  MONGO_URI,
  PORT = 3000,
  PUBLIC_BOT_USERNAME,
  FRONTEND_URL,
} = process.env;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing in .env");
  process.exit(1);
}
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env");
  process.exit(1);
}
if (!ADMIN_CHAT_ID) {
  console.warn("⚠️ ADMIN_CHAT_ID is not set. Admin notifications won't work.");
}

// ================ MONGOOSE =============
mongoose.set("strictQuery", false);
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });


// ================ ORDER MODEL ===========
const ItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "343 Diamonds" / "Weekly Pass 1 (wp1)"
    game: { type: String, enum: ["MLBB", "PUBG"], required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: Number, index: true, unique: true },
    orderCode: { type: String, index: true }, // e.g. BKS000001

    startToken: { type: String, index: true }, // "web_xxx" payload key

    source: {
      type: String,
      enum: ["web", "bot"],
      default: "web",
    },

    userId: { type: Number }, // Telegram chat id
    username: { type: String }, // @username
    game: { type: String, enum: ["MLBB", "PUBG"], required: true },

    mlbbId: { type: String },
    mlbbServerId: { type: String },
    pubgId: { type: String },

    items: { type: [ItemSchema], required: true },
    totalPrice: { type: Number, required: true },

    slipFileId: { type: String }, // Telegram photo file_id

    status: {
      type: String,
      enum: [
        "waiting_for_slip",
        "waiting_user_confirm",
        "pending_admin",
        "completed",
        "rejected",
      ],
      default: "waiting_for_slip",
    },

    // Clean-up info
    userMessages: [{ type: Number }], // message_ids in user chat
    adminMessageId: { type: Number },
    adminChatId: { type: Number },
  },
  { timestamps: true }
);

// Auto-increment orderId & BKS000001
OrderSchema.pre("save", async function (next) {
  if (!this.isNew || this.orderId) return next();

  const last = await this.constructor
    .findOne({})
    .sort({ orderId: -1 })
    .select("orderId")
    .lean();

  this.orderId = last?.orderId ? last.orderId + 1 : 1;
  this.orderCode = "BKS" + String(this.orderId).padStart(6, "0");
  next();
});

const Order = mongoose.model("Order", OrderSchema);

// ================ TELEGRAM BOT ==========
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log("🤖 BIKA Store Bot polling started");

// Helper: format time
function formatDateTime(date) {
  const d = new Date(date);
  const options = {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return d.toLocaleString("en-GB", options).replace(",", "");
}

// Helper: build items summary "343 + wp1"
function buildItemsShort(items) {
  // label ထဲပါ code တွေလည်း ဖြစ်နိူင်တော့ လွယ်လွယ်က i.label တွေကို + နဲ့ချိတ်
  return items.map((i) => i.label).join(" + ");
}

// Helper: full caption for summary
function buildOrderCaption(order, mentionUser = true) {
  const lines = [];

  // 1. Slip photo (photo ကို သီးသန့်ပို့မယ်, caption မှာ စာ)
  if (mentionUser && order.username) {
    lines.push(`2. User - @${order.username}`);
  } else if (mentionUser && order.userId) {
    lines.push(`2. User ID - ${order.userId}`);
  }

  lines.push(`3. Game - ${order.game}`);

  if (order.game === "MLBB") {
    lines.push(
      `4. ID+Sv ID - ${order.mlbbId || "-"} ${order.mlbbServerId || "-"}`
    );
  } else if (order.game === "PUBG") {
    lines.push(`4. PUBG ID - ${order.pubgId || "-"}`);
  } else {
    lines.push(`4. ID - -`);
  }

  const itemsShort = buildItemsShort(order.items);
  lines.push(`5. Items - ${itemsShort}`);
  lines.push(`6. Total MMK - ${order.totalPrice.toLocaleString()} Ks`);
  lines.push(`7. Order ID - ${order.orderCode}`);
  lines.push(`8. Time - ${formatDateTime(order.createdAt)}`);

  return lines.join("\n");
}

// ================ EXPRESS API ===========
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("BIKA STORE API & BOT is running ✅");
});

/**
 * POST /api/orders/web-order
 * Body JSON:
 * {
 *   game: "MLBB" | "PUBG",
 *   cart: [{ label, game, price, qty }, ...],
 *   mlbbId,
 *   svId,
 *   pubgId
 * }
 */
app.post("/api/orders/web-order", async (req, res) => {
  try {
    const { game, cart, mlbbId, svId, pubgId } = req.body;

    if (!game || !["MLBB", "PUBG"].includes(game)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing game" });
    }

    if (!Array.isArray(cart) || !cart.length) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty" });
    }

    if (game === "MLBB" && (!mlbbId || !svId)) {
      return res.status(400).json({
        success: false,
        message: "MLBB ID and Server ID are required",
      });
    }

    if (game === "PUBG" && !pubgId) {
      return res
        .status(400)
        .json({ success: false, message: "PUBG ID is required" });
    }

    const items = cart.map((i) => ({
      label: i.label,
      game: i.game || game,
      price: Number(i.price || 0),
      qty: Number(i.qty || 0),
    }));

    const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    if (!totalPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Total price is 0" });
    }

    // random start token
    const token =
      Math.random().toString(36).slice(2, 8) +
      Math.random().toString(36).slice(2, 5);

    const order = await Order.create({
      startToken: token,
      game,
      mlbbId: game === "MLBB" ? mlbbId : undefined,
      mlbbServerId: game === "MLBB" ? svId : undefined,
      pubgId: game === "PUBG" ? pubgId : undefined,
      items,
      totalPrice,
      source: "web",
      status: "waiting_for_slip",
    });

    return res.json({
      success: true,
      startCode: `web_${token}`,
      orderCode: order.orderCode,
    });
  } catch (err) {
    console.error("web-order error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// ================ BOT HANDLERS ==========


// FRONTEND_URL ကို .env ထဲသတ်မှတ်ထားတယ်ဆိုရင်
const WEB_URL = FRONTEND_URL || "https://bikastore-web.onrender.com"; // မသတ်မှတ်ရင် backup link

// /start handler
bot.onText(/^\/start(?:\s+(.+))?/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const payload = match[1];

    // 🌐 normal /start (no web_ payload)
    if (!payload || !payload.startsWith("web_")) {
      const text = [
        "👋 BIKA Store Bot ထဲသို့ ကြိုဆိုပါတယ်။",
        "",
        "Web မှာ Order လုပ်ချင်ရင် အောက်က Web Store button ကိုနှိပ်ပါ။",
        "Web ပေါ်မှာ Item တွေသတ်မှတ်သွားပြီးရင်",
        "Open in Telegram / Go to Bot ကိုနှိပ်ပြီး ဒီ Bot ထဲကို ပြန်ဝင်ပါ။",
      ].join("\n");

      await bot.sendMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🌐 Open Web Store",
                url: WEB_URL,
              },
            ],
          ],
        },
      });
      return;
    }

    // 🔗 /start web_xxxxx (web-order link ကနေသွားရာ)
    const token = payload.slice(4); // remove "web_"
    const order = await Order.findOne({ startToken: token });

    if (!order) {
      await bot.sendMessage(
        chatId,
        "😕 ဒီ web order ကို မတွေ့ရပါဘူး။ Order time ပြီးသွားပြီး ဖြစ်နိုင်ပါတယ်။"
      );
      return;
    }

    // User info ချိတ်
    order.userId = chatId;
    order.username = msg.from?.username || "";
    await order.save();

    // Items string
    const itemsList = order.items
      .map(
        (i) =>
          `• ${i.label} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} Ks`
      )
      .join("\n");

    let idLine = "";
    if (order.game === "MLBB") {
      idLine = `ID + SV ID - ${order.mlbbId} ${order.mlbbServerId}`;
    } else if (order.game === "PUBG") {
      idLine = `PUBG ID - ${order.pubgId}`;
    }

    const text = [
      "🧾 Web Order Preview",
      "",
      `Game - ${order.game}`,
      idLine,
      "",
      "Items:",
      itemsList,
      "",
      `Total MMK - ${order.totalPrice.toLocaleString()} Ks`,
      "",
      "💵 Payment Info",
      "KPay: Shine Htet Aung (09 264 202 637)",
      "WavePay: Shine Htet Aung (09 264 202 637)",
      "",
      "ကျသင့်ငွေကို ပေးချေပြီး Slip ပုံကို ဒီ chat ထဲကို ပို့ပေးပါ။",
    ].join("\n");

    const sent = await bot.sendMessage(chatId, text);
    order.userMessages.push(sent.message_id);
    await order.save();
  } catch (err) {
    console.error("start handler error:", err);
  }
});

// User sends slip photo
bot.on("photo", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const fromId = msg.from?.id;
    if (!fromId) return;

    // Find latest waiting_for_slip order for this user
    const order = await Order.findOne({
      userId: fromId,
      status: "waiting_for_slip",
    }).sort({ createdAt: -1 });

    if (!order) {
      // Not related to web order
      return;
    }

    // largest size
    const photos = msg.photo || [];
    const fileId = photos[photos.length - 1]?.file_id;
    if (!fileId) return;

    order.slipFileId = fileId;
    order.status = "waiting_user_confirm";
    await order.save();

    const caption = [
      "🧾 Order Summary",
      "",
      buildOrderCaption(order, true),
      "",
      "အချက်အလက်တွေ မှန်ကန်ရင် ✅ Confirm ကိုနှိပ်ပါ။",
    ].join("\n");

    const sent = await bot.sendPhoto(chatId, fileId, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Confirm", callback_data: `user_confirm:${order._id}` }],
        ],
      },
    });

    order.userMessages.push(sent.message_id);
    await order.save();
  } catch (err) {
    console.error("photo handler error:", err);
  }
});

// Callback queries (Confirm / Approve / Reject)
bot.on("callback_query", async (query) => {
  try {
    const data = query.data || "";
    const fromId = query.from.id;

    if (data.startsWith("user_confirm:")) {
      const orderId = data.split(":")[1];
      const order = await Order.findById(orderId);
      if (!order) {
        await bot.answerCallbackQuery(query.id, {
          text: "Order not found.",
          show_alert: true,
        });
        return;
      }

      order.status = "pending_admin";
      await order.save();

      await bot.answerCallbackQuery(query.id, {
        text: "အော်ဒါကို Admin ဆီ ပို့ပေးထားပါတယ်။",
        show_alert: false,
      });

      // Admin ကို notify
      if (ADMIN_CHAT_ID && order.slipFileId) {
        const caption = [
          "🆕 Web Order (Pending)",
          "",
          buildOrderCaption(order, true),
          "",
          "Admin action:",
        ].join("\n");

        const sentAdmin = await bot.sendPhoto(
          Number(ADMIN_CHAT_ID),
          order.slipFileId,
          {
            caption,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Approve",
                    callback_data: `admin_approve:${order._id}`,
                  },
                  {
                    text: "❌ Reject",
                    callback_data: `admin_reject:${order._id}`,
                  },
                ],
              ],
            },
          }
        );

        order.adminChatId = Number(ADMIN_CHAT_ID);
        order.adminMessageId = sentAdmin.message_id;
        await order.save();
      }

      // User ကို info message
      const info = await bot.sendMessage(
        order.userId,
        "သင့်အော်ဒါကို Admin ဆီ ပို့ပေးပြီးပါပြီ။ ခဏလောက် စောင့်ပေးပါ။"
      );
      order.userMessages.push(info.message_id);
      await order.save();
    }

    if (data.startsWith("admin_approve:") || data.startsWith("admin_reject:")) {
      const [action, orderId] = data.split(":");
      const order = await Order.findById(orderId);
      if (!order) {
        await bot.answerCallbackQuery(query.id, {
          text: "Order not found.",
          show_alert: true,
        });
        return;
      }

      const isApprove = action === "admin_approve";
      order.status = isApprove ? "completed" : "rejected";
      await order.save();

      await bot.answerCallbackQuery(query.id, {
        text: isApprove ? "Order approved." : "Order rejected.",
        show_alert: false,
      });

      // Admin message ဖျက်
      if (query.message) {
        const adminChatId = query.message.chat.id;
        const adminMsgId = query.message.message_id;
        try {
          await bot.deleteMessage(adminChatId, adminMsgId);
        } catch (e) {}
      }

      // User အနေနဲ့ ရလဒ် ပို့
      let userText = "";
      if (isApprove) {
        userText =
          "သင့်အော်ဒါ အောင်မြင်စွာပြီးဆုံးသွားပါပြီ။\nဝယ်ယူအားပေးမှုအတွက် ကျေးဇူးအထူးပါ။";
      } else {
        userText =
          "သင့်အော်ဒါကို Admin မှ ငြင်းပယ်လိုက်ပါသည်။\nထပ်မံ လိုအပ်တာရှိရင် @Official_Bika ထံ ဆက်သွယ်ပေးပါ။";
      }

      const userChatId = order.userId;
      const resultMsg = await bot.sendMessage(userChatId, userText);

      // Order info စာတွေ ဖျက် (သင့်ကြိုက်လို မထားချင်တဲ့ message တွေ)
      const toDelete = [...order.userMessages];
      for (const mid of toDelete) {
        try {
          await bot.deleteMessage(userChatId, mid);
        } catch (e) {}
      }
      order.userMessages = [resultMsg.message_id]; // နောက်သုံးဖို့လိုရင်
      await order.save();
    }
  } catch (err) {
    console.error("callback_query error:", err);
  }
});

// ================ START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Express API running on port ${PORT}`);
});
