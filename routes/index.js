import express from "express";
import orders from "./orders.js";
import reviews from "./reviews.js";
import payments from "./payments.js";

const router = express.Router();

router.use("/orders", orders);
router.use("/reviews", reviews);
router.use("/payments", payments);

export default router;
