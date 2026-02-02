// --------------------------------------
//  BIKA STORE — Reviews Routes
// --------------------------------------

import express from "express";
import Review from "../models/Review.js";

const router = express.Router();

// Submit review
router.post("/add", async (req, res) => {
  try {
    const { userId, username, rating, reviewText } = req.body;

    if (!rating) return res.status(400).json({ error: "Rating required" });

    const review = await Review.create({
      userId,
      username,
      rating,
      reviewText
    });

    return res.json({ success: true, review });
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get latest reviews
router.get("/latest", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(20);
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

export default router;
