import axios from "axios";
import { ENV } from "../config/env.js";

export const notifyAdmin = async (text) => {
  try {
    await axios.post(`${ENV.BOT_API_URL}/sendMessage`, {
      chat_id: ENV.BOT_ADMIN_ID,
      text,
      parse_mode: "Markdown"
    });
  } catch (err) {
    console.error("Bot send error:", err.response?.data || err);
  }
};

export const notifyUser = async (userId, text) => {
  try {
    await axios.post(`${ENV.BOT_API_URL}/sendMessage`, {
      chat_id: userId,
      text,
      parse_mode: "Markdown"
    });
  } catch (err) {
    console.error("Bot send error:", err.response?.data || err);
  }
};
