import express from "express";
import cors from "cors";
import { connectDB } from "./db/mongo.js";
import { ENV } from "./config/env.js";
import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

connectDB();

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("BIKA STORE API is running...");
});

app.listen(ENV.PORT, () =>
  console.log(`🚀 API running on port ${ENV.PORT}`)
);
