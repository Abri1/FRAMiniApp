// src/bot/commands/start.ts
// Handler for the /start command

import { sendTelegramMessage } from '../../integrations/telegram';
import { getUserByTelegramId } from '../../integrations/supabase';
import { TelegramChat, TelegramUser } from '../../integrations/telegram';
import { mainMenuKeyboard } from '../menu';

/**
 * Handle the /start command
 * @param chat The chat object where the command was issued
 * @param user The Telegram user object
 * @param args Any arguments after the command
 * @returns Promise<void>
 */
export async function handleStartCommand(chat: TelegramChat, user: TelegramUser, args: string): Promise<void> {
  const telegramId = user.id;
  const username = user.username || user.first_name || 'there';
  if (!telegramId) return;

  const dbUser = await getUserByTelegramId(String(telegramId));
  if (!dbUser) {
    // New user: greet and start onboarding (NO menu keyboard)
    await sendTelegramMessage({
      chat_id: telegramId,
      text:
        `👋 *Welcome, ${username}!*\n\n` +
        `This bot delivers *instant forex price alerts* via voice call and Telegram.\n\n` +
        `*To get started:*\n\n` +
        `1. Please type your phone number in *international format* (e.g. +1234567890).\n` +
        `*We will never share your phone number.*\n\n` +
        `Once your number is received, you'll be able to set alerts and access all features.\n\n` +
        `_Thank you for joining Forex Ring Alerts!_`,
      parse_mode: 'Markdown',
    });
    return;
  }
  // Existing user: check onboarded status
  if (dbUser.onboarded) {
    // Onboarded: show menu
    await sendTelegramMessage({
      chat_id: telegramId,
      text:
        `👋 Welcome back, ${username}!\n\n` +
        `You have *${dbUser.credits} credits* available.\n\n` +
        `Use the menu below to set or manage your alerts.`,
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  } else {
    // Not onboarded yet, prompt for phone number again (NO menu keyboard)
    await sendTelegramMessage({
      chat_id: telegramId,
      text:
        `👋 *Welcome, ${username}!*\n\n` +
        `This bot delivers *instant forex price alerts* via voice call and Telegram.\n\n` +
        `*To get started:*\n\n` +
        `1. Please type your phone number in *international format* (e.g. +1234567890).\n` +
        `*We will never share your phone number.*\n\n` +
        `Once your number is received, you'll be able to set alerts and access all features.\n\n` +
        `_Thank you for joining Forex Ring Alerts!_`,
      parse_mode: 'Markdown',
    });
    return;
  }
} 