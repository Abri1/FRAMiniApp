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
import { viewAlerts } from './flows/viewAlerts';
import { showAccount } from './commands/account';
import { showMainMenu, mainMenuKeyboard } from './menu';
import { deleteAlertById } from './flows/deleteAlert';
import { getUserByTelegramId, updateUserUsername, updateLastActiveAt } from '../integrations/supabase';
import { FlowManager } from './flows/flowManager';
import { SetAlertFlow } from './flows/setAlert';
import { EditAlertFlow } from './flows/editAlert';
import { showInfo } from './commands/info';

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
    // Track user activity
    await updateLastActiveAt(String(user.id));
    // Update username in DB if changed or missing
    if (user.username) {
      const dbUser = await getUserByTelegramId(String(user.id));
      if (!dbUser || dbUser.username !== user.username) {
        await updateUserUsername(String(user.id), user.username);
      }
    }
    // 1. Check for global commands (slash commands)
    if (text.startsWith(COMMAND_PREFIX)) {
      await FlowManager.endFlow(user.id);
      const fullCommand = text.substring(COMMAND_PREFIX.length);
      const [command, ...argArray] = fullCommand.split(' ');
      const commandName = command.toLowerCase().replace('@forexringalertsbot', '');
      const args = argArray.join(' ');
      const handler = commandHandlers[commandName];
      if (handler) {
        await handler(chat, user, args);
      } else {
        await handleUnknownCommand(chat, user, commandName);
      }
      return;
    }
    // 2. Check for main menu button presses
    const trimmed = text.trim();
    const trimmedLower = trimmed.toLowerCase();
    if ([
      'set alert',
      'view alerts',
      'account',
      'info'
    ].includes(trimmedLower)) {
      await FlowManager.endFlow(user.id);
      if (trimmedLower === 'set alert') {
        await FlowManager.startFlow(user.id, SetAlertFlow);
        return;
      }
      if (trimmedLower === 'view alerts') {
        await viewAlerts(chat.id);
        return;
      }
      if (trimmedLower === 'account') {
        await showAccount(chat.id);
        return;
      }
      if (trimmedLower === 'info') {
        await showInfo(chat.id);
        return;
      }
    }
    // 3. If user is in a flow, delegate to FlowManager
    if (await FlowManager.handleMessage(user.id, text)) {
      return;
    }
    // 4. Continue with main menu logic
    const dbUser = await getUserByTelegramId(String(user.id));
    if (!dbUser) {
      await showMainMenu(user.id);
      return;
    }
    await showMainMenu(user.id);
    return;
  } catch (err) {
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
    const [action, ...params] = data.split(':');
    switch (action) {
      case 'delete_alert':
        if (chat && params[0]) {
          await deleteAlertById(chat.id, parseInt(params[0], 10));
        }
        break;
      case 'edit_alert':
        if (chat && params[0]) {
          await FlowManager.startFlow(chat.id, EditAlertFlow, params[0]);
        }
        break;
      default:
        logger.warn('Unknown callback action: %s', action);
    }
  } catch (err) {
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