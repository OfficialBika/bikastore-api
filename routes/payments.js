// --------------------------------------
//  BIKA STORE — Payment Slip Upload
// --------------------------------------

import express from "express";
import multer from "multer";
import PaymentSlip from "../models/PaymentSlip.js";
import Order from "../models/Order.js";
import axios from "axios";

const router = express.Router();

// File storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Upload slip POST endpoint
router.post("/upload", upload.single("slip"), async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const slip = await PaymentSlip.create({
      orderId,
      userId,
      filePath: "/uploads/payments/" + req.file.filename,
      originalName: req.file.originalname
    });

    order.paymentSlip = slip.filePath;
    order.status = "PENDING_CONFIRM";
    order.paidAt = new Date();
    await order.save();

    // Notify bot admin
    await axios.post(`${process.env.API_BASE_URL}/bot/slip`, {
      orderId,
      userId,
      filePath: slip.filePath
    });

    return res.json({ success: true, slip });
  } catch (err) {
    console.error("Slip upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
