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
  await sendTelegramMessage({
    chat_id: telegramId,
    text: `<b>Forex Ring Alerts – Quick Guide</b>\n\n"Set, manage, and receive forex price alerts instantly. No setup required."\n\n<b>How It Works</b>\n\n• Set an alert for any forex pair and price\n• The bot monitors prices 24/7\n• Get instant Telegram alerts (always free)\n• Add credits for instant voice call alerts\n\n<b>Menu Options</b>\n\n• <b>Set Alert</b> – Create a new price alert\n• <b>View Alerts</b> – Manage your active alerts\n• <b>Account</b> – Check your balance and User ID\n\n<b>Upgrade</b>\n\nAdd credits to unlock voice call alerts and unlimited active alerts.\n\nQuestions or feedback? Message <a href="https://t.me/abribooysen">@abribooysen</a>.`,
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard,
  });
} 