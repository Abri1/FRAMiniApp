// src/bot/menu.ts
// Persistent main menu for Telegram bot

import logger from '../logger';
import { sendTelegramMessage } from '../integrations/telegram';

export const MENU_BUTTONS: string[][] = [
  ['🚀 Open App'],
  ['Set Alert', 'View Alerts'],
  ['Account', 'Info'],
];

export function buildMainMenuKeyboard() {
  return {
    keyboard: MENU_BUTTONS.map(row => row.map(text => ({ text }))),
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false,
  };
}

// Constant keyboard object for easy reuse
export const mainMenuKeyboard = buildMainMenuKeyboard();

/**
 * Show the persistent main menu to the user with no prompt (just the keyboard).
 * @param telegramId Telegram user ID
 */
export async function showMainMenu(telegramId: number | string) {
  let text = '\u200B'; // Default to zero-width space
  // Defensive: if text is empty or whitespace, use zero-width space
  if (!text || text.trim() === '') text = '\u200B';
  await sendTelegramMessage({
    chat_id: telegramId,
    text,
    reply_markup: mainMenuKeyboard,
  });
} 