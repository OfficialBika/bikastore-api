// --------------------------------------
//  BIKA STORE — Order Routes (Website)
// --------------------------------------

import express from "express";
import Order from "../models/Order.js";
import axios from "axios";

const router = express.Router();

// Auto increment orderId
let lastOrderId = Date.now();

// Create order from Website
router.post("/create", async (req, res) => {
  try {
    const { userId, username, game, mlbbId, mlbbServerId, pubgId, packageName, price } = req.body;

    if (!userId || !game || !packageName || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate order ID
    const orderId = ++lastOrderId;

    const order = await Order.create({
      orderId,
      userId,
      username,
      game,
      mlbbId,
      mlbbServerId,
      pubgId,
      packageName,
      price,
      status: "WAITING_SLIP"
    });

    // Forward order to bot admin panel
    await axios.post(`${process.env.API_BASE_URL}/bot/order`, {
      orderId,
      userId,
      username,
      game,
      mlbbId,
      mlbbServerId,
      pubgId,
      packageName,
      price
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.error("Order create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user orders (website)
router.get("/user/:id", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: "fetch failed" });
  }
});

// Admin confirm / reject from website
router.post("/update-status", async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    order.confirmedAt = new Date();
    await order.save();

    // Notify bot
    await axios.post(`${process.env.API_BASE_URL}/bot/status-update`, {
      orderId,
      status
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
