import mongoose from "mongoose";
import { ENV } from "../config/env.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGO_URI, {
      dbName: "bikastore"
    });
    console.log("🟢 MongoDB Connected");
  } catch (err) {
    console.error("🔴 MongoDB Error:", err);
  }
};
