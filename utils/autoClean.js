// --------------------------------------
//  AUTO CLEAN USER CHAT MESSAGES
// --------------------------------------

import axios from "axios";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// chatId => [messageIds]
const messageStore = {};

// Save every message id
export function trackMessage(chatId, messageId) {
  if (!messageStore[chatId]) {
    messageStore[chatId] = [];
  }
  messageStore[chatId].push(messageId);

  // safety limit (avoid memory leak)
  if (messageStore[chatId].length > 50) {
    messageStore[chatId].shift();
  }
}

// Clean chat, keep last N messages
export async function cleanChat(chatId, { keepLast = 1 } = {}) {
  const messages = messageStore[chatId];
  if (!messages || messages.length <= keepLast) return;

  const toDelete = messages.slice(0, messages.length - keepLast);

  for (const msgId of toDelete) {
    try {
      await axios.post(`${TELEGRAM_URL}/deleteMessage`, {
        chat_id: chatId,
        message_id: msgId,
      });
    } catch (_) {
      // ignore delete errors
    }
  }

  // keep only last N
  messageStore[chatId] = messages.slice(-keepLast);
}
