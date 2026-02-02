import express from "express";
import Review from "../models/Review.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: "Review failed" });
  }
});

// Show recent reviews
router.get("/", async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 }).limit(20);
  res.json(reviews);
});

export default router;
