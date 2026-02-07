// ---------------------------
//  BIKA STORE API — SERVER.JS
// ---------------------------

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectMongo from "./db/mongo.js";

// Routes
import orderRoutes from "./routes/orders.js";
import reviewRoutes from "./routes/reviews.js";
import paymentRoutes from "./routes/payments.js";
import webOrderRoutes from "./routes/webOrders.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------
//   MIDDLEWARES
// ---------------------------
app.use(cors({
  origin: process.env.WEB_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------------------
//   CONNECT DATABASE
// ---------------------------
connectMongo();

// ---------------------------
//   ROUTES
// ---------------------------
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "BIKA Store API",
    version: "1.0.0",
  });
});

// ✅ Bot / App orders
app.use("/api/orders", orderRoutes);

// ✅ Website → Bot web-order flow
app.use("/api/webOrders", webOrderRoutes);

app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);

// ---------------------------
//   404
// ---------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------------------------
//   START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`🚀 BIKA API running on port ${PORT}`);
});
