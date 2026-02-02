import express from "express";
import multer from "multer";
import PaymentSlip from "../models/PaymentSlip.js";
import { notifyAdmin } from "../bot/notify.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/slips/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Upload slip
router.post("/:orderId", upload.single("slip"), async (req, res) => {
  try {
    const slip = await PaymentSlip.create({
      orderId: req.params.orderId,
      filePath: req.file.path,
    });

    await notifyAdmin(
      `🧾 *New Payment Slip Received!*\nOrder ID: ${req.params.orderId}`
    );

    res.json({ success: true, slip });
  } catch (err) {
    res.status(500).json({ error: "Slip upload failed." });
  }
});

export default router;
