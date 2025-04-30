// src/bot/commands/help.ts
// Handler for /help command - shows available commands and usage

import { TelegramChat, TelegramUser, sendTelegramMessage } from '../../integrations/telegram';
import logger from '../../logger';
import { mainMenuKeyboard } from '../menu';

/**
 * Handle the /help command
 * @param chat The chat object where the command was issued
 * @param user The Telegram user object
 * @param args Any arguments after the command
 * @returns Promise<void>
 */
export async function handleHelpCommand(chat: TelegramChat, user: TelegramUser, args: string): Promise<void> {
  logger.info('Handling /help command for user %d', user.id);
  const helpMessage =
    `*Forex Ring Alerts Help*

` +
    `Use the following commands:
` +
    `/start - Start the bot or re-register
` +
    `/createalert - Create a new price alert
` +
    `/listalerts - List your active alerts
` +
    `/deletealert - Delete an alert
` +
    `/help - Show this help message

` +
    `All commands must be sent as plain text. If you have any issues, contact support.`;

  await sendTelegramMessage({
    chat_id: chat.id,
    text: helpMessage,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: mainMenuKeyboard,
  });
} 