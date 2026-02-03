import express from "express";
import multer from "multer";
import axios from "axios";
import Order from "../models/Order.js";

const router = express.Router();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.BOT_ADMIN_ID;
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { orderId } = req.body;
    const filePath = req.file.path;

    const order = await Order.findOne({ orderId });
    if (!order) return res.json({ success: false });

    order.paymentSlip = filePath;
    order.status = "PENDING_CONFIRM";
    await order.save();

    // 🔔 SEND SLIP TO ADMIN BOT
    await axios.post(`${TG}/sendPhoto`, {
      chat_id: ADMIN_ID,
      photo: `${process.env.API_BASE_URL}/${filePath}`,
      caption:
        `📸 *Payment Slip Received*\n\n` +
        `🆔 Order ID: ${order.orderId}\n` +
        `💰 ${order.price} Ks`,
      parse_mode: "Markdown"
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

export default router;
