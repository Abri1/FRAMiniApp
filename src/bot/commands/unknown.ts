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
  logger.info('Handling unknown command "%s" for user %d', command, user.id);
  
  // Send error message
  await sendTelegramMessage({
    chat_id: chat.id,
    text: `⚠️ Sorry, I don't understand the command "/${command}".`,
    parse_mode: 'Markdown'
  });
  
  // Show help message
  await handleHelpCommand(chat, user, '');
} 