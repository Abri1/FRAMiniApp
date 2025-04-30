// src/bot/flows/deleteAlert.ts
// Delete Alert flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { deleteAlert, getAlertById } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';

/**
 * Delete an alert by ID and notify the user
 */
export async function deleteAlertById(telegramId: number | string, alertId: string) {
  const alert = await getAlertById(alertId);
  if (!alert) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '❌ Could not find the alert to delete.',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  const success = await deleteAlert(alertId);
  if (success) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '✅ Alert deleted successfully.',
      reply_markup: mainMenuKeyboard,
    });
  } else {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '❌ Failed to delete alert. Please try again later.',
      reply_markup: mainMenuKeyboard,
    });
  }
} 