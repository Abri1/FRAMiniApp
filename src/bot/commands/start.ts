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

Forex Ring Alerts helps you set up instant notifications for currency price changes, including optional voice call alerts.

This tool was created to provide fast, reliable notifications for anyone who wants to stay informed about currency movements. You can customize your alerts to fit your needs and receive updates directly in Telegram.

Please note: This service is for informational purposes only and does not provide financial or investment advice.`;
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