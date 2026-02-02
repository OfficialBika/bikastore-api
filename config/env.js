import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI,
  BOT_TOKEN: process.env.BOT_TOKEN,
  BOT_API_URL: `https://api.telegram.org/bot${process.env.BOT_TOKEN}`,
  BOT_ADMIN_ID: process.env.BOT_ADMIN_ID
};
