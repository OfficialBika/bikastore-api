import express from "express";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import Order from "../models/Order.js";

const router = express.Router();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.BOT_ADMIN_ID;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { orderId } = req.body;
    const filePath = req.file.path;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.json({ success: false, error: "Order not found" });
    }

    order.paymentSlip = filePath;
    order.status = "PENDING_CONFIRM";
    await order.save();

    // 🔥 Telegram sendPhoto (CORRECT WAY)
    const form = new FormData();
    form.append("chat_id", ADMIN_ID);
    form.append("caption",
      `📸 *Payment Slip Received*\n\n` +
      `🆔 Order ID: ${order.orderId}\n` +
      `🎮 Game: ${order.game}\n` +
      `📦 Package: ${order.packageName}\n` +
      `💰 Price: ${order.price} Ks`
    );
    form.append("parse_mode", "Markdown");
    form.append("photo", fs.createReadStream(filePath));

    await axios.post(`${TG_API}/sendPhoto`, form, {
      headers: form.getHeaders(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Slip upload error:", err.message);
    res.status(500).json({ success: false });
  }
});

export default router;
