// src/bot/commands/start.ts
// Handler for the /start command

import { sendTelegramMessage } from '../../integrations/telegram';
import { getUserByTelegramId, createUser } from '../../integrations/supabase';
import { TelegramChat, TelegramUser } from '../../integrations/telegram';
import { mainMenuKeyboard } from '../menu';
import { FlowManager } from '../flows/flowManager';

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

  let dbUser = await getUserByTelegramId(String(telegramId));
  if (dbUser) {
    // Existing user: show menu
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `Welcome back, ${username}.
\nUse the menu below to set, view, or manage your alerts.`,
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  // New user: show welcome message with menu, then add to DB
  const welcomeMsg =
    `Welcome, ${username}.

You are about to experience the fastest, most reliable forex price alert system available.

I originally built this tool for my own trading requirements. After missing key market moves due to slow notifications from other services, I realized the need for true instant alerts—especially voice calls, which cut through the noise and distractions.

Since using this system, I've never missed a critical entry or exit, and my trading results have improved dramatically.

I've decided to make Forex Ring Alerts available to a few other traders as well, and I believe it will help you on your trading journey.`;
  await sendTelegramMessage({
    chat_id: chat.id,
    text: welcomeMsg,
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard,
  });
  // Now add the user to the DB
  await createUser({
    telegram_id: String(telegramId),
    credits: 0,
    phone_number: '',
    username: user.username || undefined,
    subscription_status: 'inactive',
    subscription_end: null,
    max_active_alerts: 5,
    created_via: args && args.trim() ? args.trim() : 'organic',
  });
  return;
} 