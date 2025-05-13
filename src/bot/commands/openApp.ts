// src/bot/commands/openApp.ts
// Handler for the 'Open App' menu button

import { sendTelegramMessage, TelegramChat, TelegramUser } from '../../integrations/telegram';
import { loadConfig } from '../../config';

const config = loadConfig();

/**
 * Sends a message with an inline button to open the Telegram Mini App.
 * @param chat The chat object where the command was issued
 * @param user The Telegram user object (optional, for context if needed)
 */
export async function handleOpenAppCommand(chat: TelegramChat, user?: TelegramUser): Promise<void> {
  if (!config.miniAppUrl) {
    // Fallback or error if URL is not configured
    await sendTelegramMessage({
      chat_id: chat.id,
      text: 'Sorry, the Mini App is not available at the moment. Please try again later.',
    });
    return;
  }

  await sendTelegramMessage({
    chat_id: chat.id,
    text: 'Click below to open the Forex Ring Alerts app:',
    reply_markup: {
      inline_keyboard: [[{
        text: 'Open App ✨',
        web_app: { url: config.miniAppUrl }
      }]]
    }
  });
} 