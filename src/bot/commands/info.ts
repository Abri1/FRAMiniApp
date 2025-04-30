// src/bot/commands/info.ts
// Info flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import logger from '../../logger';
import { mainMenuKeyboard } from '../menu';
import { getUserByTelegramId } from '../../integrations/supabase';

/**
 * Show a detailed guide on how the bot works and how to use it
 */
export async function showInfo(telegramId: number | string) {
  try {
    logger.info('showInfo called for %s', telegramId);
    const user = await getUserByTelegramId(String(telegramId));
    await sendTelegramMessage({
      chat_id: telegramId,
      text: `ℹ️ *Forex Ring Alerts – User Guide*\n\nWelcome! Tap the buttons below to interact with the bot:\n\n🔲 *Menu Options*\n• Set Alert – Create a new forex price alert\n• View Alerts – List or manage your alerts\n• Credits – View your available credits\n• Info – Display this guide\n\n *How It Works*\n1️⃣ You choose a currency pair, target price, and direction\n2️⃣ The bot tracks live forex prices for you\n3️⃣ When your target is reached, you receive a voice call and Telegram alert\n4️⃣ Each alert uses 1 credit upon triggering\n\n💡 *Tip*\n• Use the menu buttons—no slash commands needed\n• Contact @abribooysen for support\n\nHappy trading! 🚀`,
      parse_mode: 'Markdown',
      ...(user && user.onboarded ? { reply_markup: mainMenuKeyboard } : {}),
    });
  } catch (err) {
    logger.error('showInfo error for %s: %o', telegramId, err);
  }
} 