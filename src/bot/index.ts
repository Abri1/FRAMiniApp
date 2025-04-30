// src/bot/index.ts
// Telegram bot command routing and message handling
// Main entry point for Telegram bot functionality

import logger from '../logger';
import { TelegramUpdate, TelegramChat, TelegramUser, sendTelegramMessage } from '../integrations/telegram';
import { handleStartCommand } from './commands/start';
import { handleHelpCommand } from './commands/help';
import { handleCreateAlertCommand } from './commands/createAlert';
import { handleListAlertsCommand } from './commands/listAlerts';
import { handleDeleteAlertCommand } from './commands/deleteAlert';
import { handleUnknownCommand } from './commands/unknown';
import { startSetAlertFlow } from './flows/setAlert';
import { viewAlerts } from './flows/viewAlerts';
import { showCredits } from './commands/credits';
import { showInfo } from './commands/info';
import { showMainMenu, mainMenuKeyboard } from './menu';
import { deleteAlertById } from './flows/deleteAlert';
import { editAlertById } from './flows/editAlert';
import { handlePhoneNumberSubmission } from './flows/onboarding';
import { getUserByTelegramId } from '../integrations/supabase';

// In-memory map to track which user is editing which alert
const editAlertStates = new Map<string, string>(); // telegramId -> alertId

// Command prefix
const COMMAND_PREFIX = '/';

// Map of command handlers
const commandHandlers: Record<string, (chat: TelegramChat, user: TelegramUser, args: string) => Promise<void>> = {
  'start': handleStartCommand,
  'help': handleHelpCommand,
  'createalert': handleCreateAlertCommand,
  'listalerts': handleListAlertsCommand,
  'deletealert': handleDeleteAlertCommand,
};

/**
 * Process a text message from Telegram
 * @param chat The chat object
 * @param user The user who sent the message
 * @param text The message text
 */
export async function processMessage(chat: TelegramChat, user: TelegramUser, text: string): Promise<void> {
  try {
    logger.info('Processing message from user %d: %s', user.id, text);
    // Check if this is a slash command
    if (text.startsWith(COMMAND_PREFIX)) {
      const fullCommand = text.substring(COMMAND_PREFIX.length);
      const [command, ...argArray] = fullCommand.split(' ');
      const commandName = command.toLowerCase().replace('@forexringalertsbot', '');
      const args = argArray.join(' ');

      // Execute command handler or fallback
      const handler = commandHandlers[commandName];
      if (handler) {
        await handler(chat, user, args);
      } else {
        await handleUnknownCommand(chat, user, commandName);
      }
      return;
    } else {
      const trimmed = text.trim();
      const trimmedLower = trimmed.toLowerCase();
      // Handle menu button presses
      if (trimmedLower === 'set alert') {
        await startSetAlertFlow(chat.id);
        return;
      }
      if (trimmedLower === 'view alerts') {
        await viewAlerts(chat.id);
        return;
      }
      if (trimmedLower === 'credits') {
        await showCredits(chat.id);
        return;
      }
      if (trimmedLower === 'info') {
        await showInfo(chat.id); // info handler now includes keyboard
        return;
      }
      // Continue with onboarding or main menu logic
      // 1. If this looks like a phone number, treat as onboarding submission
      if (/^\+[1-9]\d{9,14}$/.test(trimmed)) {
        await handlePhoneNumberSubmission(user.id, trimmed);
        return;
      }
      // 2. Otherwise, fetch the user once to decide next step
      const dbUser = await getUserByTelegramId(String(user.id));
      if (!dbUser || !dbUser.onboarded) {
        // Re-prompt onboarding instructions
        await handleStartCommand(chat, user, '');
        return;
      }
      // 3. User fully onboarded: show main menu
      await showMainMenu(user.id);
      return;
    }
  } catch (err) {
    logger.error('Error processing message: %o', err);
    await sendTelegramMessage({ 
      chat_id: chat.id, 
      text: '⚠️ Sorry, an error occurred while processing your message. Please try again later.' 
    });
  }
}

/**
 * Process a callback query (inline button click)
 * @param queryId The callback query ID
 * @param user The user who clicked the button
 * @param data The callback data
 * @param chat Optional chat object
 */
export async function processCallbackQuery(
  queryId: string,
  user: TelegramUser,
  data: string,
  chat?: TelegramChat
): Promise<void> {
  try {
    logger.info('Processing callback query from user %d: %s', user.id, data);
    const [action, ...params] = data.split(':');
    switch (action) {
      case 'delete_alert':
        if (chat && params[0]) {
          await deleteAlertById(chat.id, params[0]);
        }
        break;
      case 'edit_alert':
        if (chat && params[0]) {
          editAlertStates.set(String(chat.id), params[0]);
          await editAlertById(chat.id, params[0]);
        }
        break;
      default:
        logger.warn('Unknown callback action: %s', action);
    }
  } catch (err) {
    logger.error('Error processing callback query: %o', err);
    if (chat) {
      await sendTelegramMessage({
        chat_id: chat.id,
        text: '⚠️ Sorry, an error occurred while processing your request. Please try again later.'
      });
    }
  }
}

/**
 * Main entry point for processing Telegram updates
 * @param update The Telegram update object
 */
export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  logger.info('handleUpdate raw update: %o', update);
  const message = update.message?.text?.trim();
  const chatObj = update.message?.chat;
  const userObj = update.message?.from;
  // Route all text messages through processMessage for unified handling
  if (message && chatObj && userObj) {
    await processMessage(chatObj, userObj, message);
    return;
  }

  // Process callback queries (inline button clicks)
  if (update.callback_query?.data && update.callback_query.from) {
    const chat = update.callback_query.message?.chat;
    const { id: queryId, data } = update.callback_query;
    await processCallbackQuery(queryId, update.callback_query.from, data, chat);
  }
} 