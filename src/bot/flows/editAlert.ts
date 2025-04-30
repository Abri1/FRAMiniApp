// src/bot/flows/editAlert.ts
// Edit Alert flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { getAlertById, updateAlert } from '../../integrations/supabase';
import { showMainMenu } from '../menu';

/**
 * Edit an alert by ID (prompt for new price, update, and notify user)
 */
export async function editAlertById(telegramId: number | string, alertId: string) {
  const alert = await getAlertById(alertId);
  if (!alert) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '❌ Could not find the alert to edit.',
    });
    await showMainMenu(telegramId);
    return;
  }
  // For simplicity, prompt for new price only (extend to direction, pair, etc. as needed)
  await sendTelegramMessage({
    chat_id: telegramId,
    text: `Editing alert for ${alert.pair} (${alert.direction} ${alert.target_price}).\n\nPlease enter the new target price:`,
  });
}

/**
 * Handle the next step in the Edit Alert flow (user submits new price)
 */
export async function handleEditAlertStep(telegramId: number | string, alertId: string, message: string) {
  const price = parseFloat(message);
  if (isNaN(price) || price <= 0) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '❌ Invalid price. Please enter a valid number:',
    });
    return;
  }
  const success = await updateAlert(alertId, { target_price: price });
  if (success) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '✅ Alert updated successfully.',
    });
  } else {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '❌ Failed to update alert. Please try again later.',
    });
  }
  await showMainMenu(telegramId);
} 