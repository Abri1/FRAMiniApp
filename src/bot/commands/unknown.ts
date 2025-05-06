// src/bot/commands/unknown.ts
// Handler for unknown commands - shows error message and help

import { TelegramChat, TelegramUser, sendTelegramMessage } from '../../integrations/telegram';
import logger from '../../logger';
import { handleHelpCommand } from './help';

/**
 * Handle unknown commands
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param command The unknown command that was entered
 */
export async function handleUnknownCommand(
  chat: TelegramChat, 
  user: TelegramUser, 
  command: string
): Promise<void> {
  await sendTelegramMessage({
    chat_id: chat.id,
    text: `Unrecognized command: /${command}\n\nPlease refer to the /help command for a full list of supported actions.\n\nForex Ring Alerts is designed for precision and reliability. If you need assistance, contact @abribooysen.`,
    parse_mode: 'Markdown'
  });
} 