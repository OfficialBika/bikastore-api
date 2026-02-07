// ------------------------------
//  BIKA STORE — MongoDB Connect
//  File: db/mongo.js (FIXED)
// ------------------------------

import mongoose from "mongoose";

const connectMongo = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ ERROR: MONGO_URI missing in .env");
    process.exit(1);
  }

  try {
    console.log("⏳ Connecting to MongoDB Atlas...");

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000, // Render cold start safe
      maxPoolSize: 10,
    });

    console.log("🍃 MongoDB Connected Successfully!");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);

    // Auto retry after 5 sec (Render friendly)
    setTimeout(connectMongo, 5000);
  }
};

export default connectMongo;
