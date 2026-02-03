// ----------------------------------
//  BIKA STORE — Payment Slip Upload
// ----------------------------------

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Order from "../models/Order.js";
import axios from "axios";

const router = express.Router();

// Ensure upload folder exists
const uploadDir = "uploads/payments";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `slip_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// -----------------------------
//  POST /api/payments/upload
// -----------------------------
router.post("/upload", upload.single("slip"), async (req, res) => {
  try {
    const { orderId } = req.body;
    const file = req.file;

    if (!orderId || !file) {
      return res.status(400).json({ error: "Missing orderId or slip" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.paymentSlip = `/uploads/payments/${file.filename}`;
    order.status = "PENDING_CONFIRM";
    order.paidAt = new Date();
    await order.save();

    // Notify admin via Telegram
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const ADMIN_ID = process.env.BOT_ADMIN_ID;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      chat_id: ADMIN_ID,
      photo: process.env.API_BASE_URL + order.paymentSlip,
      caption:
        `📸 *Payment Slip Received*\n\n` +
        `Order ID: ${order.orderId}\n` +
        `Game: ${order.game}\n` +
        `Package: ${order.packageName}\n` +
        `Price: ${order.price} Ks`,
      parse_mode: "Markdown",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Slip upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
