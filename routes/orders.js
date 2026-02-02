import express from "express";
import Order from "../models/Order.js";
import { notifyAdmin, notifyUser } from "../bot/notify.js";

const router = express.Router();

// CREATE ORDER
router.post("/", async (req, res) => {
  try {
    const order = await Order.create(req.body);

    await notifyAdmin(
      `🆕 *New Order Incoming!*\n\nGame: ${order.game}\nPackage: ${order.package}\nPrice: ${order.price} Ks\n\nUser: @${order.telegramUsername}`
    );

    res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order failed." });
  }
});

// CONFIRM ORDER
router.post("/confirm/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: "CONFIRMED" },
      { new: true }
    );

    await notifyUser(
      order.telegramUserId,
      `🎉 *Your Order is Confirmed!*\n\nPackage: ${order.package}\nPrice: ${order.price} Ks`
    );

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: "Confirm failed." });
  }
});

export default router;
