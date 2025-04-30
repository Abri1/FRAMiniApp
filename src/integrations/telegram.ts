// src/integrations/telegram.ts
// Telegram Bot API integration for Forex Ring Alerts (Polling-only mode)
// Follows global rules: modular, testable, robust error handling

import fetch from 'node-fetch';
import logger from '../logger';
import { loadConfig } from '../config';

const config = loadConfig();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${config.telegramBotToken}`;

export interface TelegramSendMessageOptions {
  chat_id: number | string;
  text: string;
  /** Optional reply markup for custom keyboards or inline keyboards */
  reply_markup?: object;
  parse_mode?: 'Markdown' | 'HTML';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    entities?: TelegramMessageEntity[];
  };
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: any;
    data?: string;
  };
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

/**
 * Send a message via Telegram Bot API
 * @param options Message options including chat_id and text
 * @returns Promise resolving to success status
 */
export async function sendTelegramMessage(options: TelegramSendMessageOptions): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!data.ok) {
      logger.error('Telegram API error: %s', data.description);
      return false;
    }
    logger.info('Sent Telegram message to chat_id=%s', options.chat_id);
    return true;
  } catch (err) {
    logger.error('Failed to send Telegram message: %o', err);
    return false;
  }
}

/**
 * Get current bot information
 * @returns Promise resolving to bot info
 */
export async function getBotInfo(): Promise<TelegramBotInfo | null> {
  try {
    const res = await fetch(`${TELEGRAM_API_URL}/getMe`);
    const data = await res.json();
    if (!data.ok) {
      logger.error('Failed to get bot info: %s', data.description);
      return null;
    }
    return data.result;
  } catch (err) {
    logger.error('Error getting bot info: %o', err);
    return null;
  }
}

/**
 * Process a Telegram update object
 * This is called by the polling handler
 * @param update The update object from Telegram
 * @returns Promise resolving after update is processed
 */
export async function processUpdate(update: TelegramUpdate): Promise<void> {
  try {
    logger.info('Processing Telegram update: %o', { update_id: update.update_id });
    // Lazy-load the bot handler to avoid circular dependencies
    const { handleUpdate } = await import('../bot');
    await handleUpdate(update);
  } catch (err) {
    logger.error('Error processing Telegram update: %o', err);
  }
}

/**
 * Poll for new updates from Telegram using getUpdates (polling mode)
 * @param offset The update_id offset to fetch only new updates
 * @returns Promise resolving to an array of TelegramUpdate objects
 */
export async function getUpdates(offset: number = 0): Promise<TelegramUpdate[]> {
  try {
    const res = await fetch(`${TELEGRAM_API_URL}/getUpdates?timeout=30&offset=${offset}`);
    const data = await res.json();
    if (!data.ok) {
      logger.error('Telegram getUpdates API error: %s', data.description);
      return [];
    }
    return data.result as TelegramUpdate[];
  } catch (err) {
    logger.error('Failed to fetch updates from Telegram: %o', err);
    return [];
  }
}
