// src/bot/commands/credits.ts
// Credits flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { getUserByTelegramId } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';

/**
 * Show the user's current credit balance and purchase instructions
 */
export async function showCredits(telegramId: number | string) {
  const user = await getUserByTelegramId(String(telegramId));
  if (!user) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '❌ Could not find your user record. Please try /start again.',
    });
    return;
  }
  await sendTelegramMessage({
    chat_id: telegramId,
    text: `💳 You currently have ${user.credits} credits available.\n\nTo purchase more credits, please contact @abribooysen`,
    ...(user.onboarded ? { reply_markup: mainMenuKeyboard } : {}),
  });
} 