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
  const helpMessage =
    `Forex Ring Alerts – Command Reference\n\nWelcome to your professional trading edge. Every feature is designed for speed, precision, and reliability.\n\nAvailable Commands\n\n/start         – Begin or re-register your account\n/createalert   – Set a new price alert for any major forex pair\n/listalerts    – View and manage your active alerts\n/deletealert   – Remove an alert by its ID\n/help          – Display this command reference\n\nAll commands must be sent as plain text.\n\nFor advanced support or bespoke trading needs, contact @abribooysen.\n\nMaximize your trading potential with instant, reliable alerts.\n`;

  await sendTelegramMessage({
    chat_id: chat.id,
    text: helpMessage,
  });
} 