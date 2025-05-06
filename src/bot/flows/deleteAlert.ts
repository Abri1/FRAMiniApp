// src/bot/flows/deleteAlert.ts
// Delete Alert flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { deleteAlert, getAlertById } from '../../integrations/supabase';
import { fetchUser } from '../../priceMonitor';
import { mainMenuKeyboard } from '../menu';
import { subscriptionManager } from '../../services/subscriptionManager';
import { viewAlerts } from './viewAlerts';

/**
 * Delete an alert by ID and notify the user
 */
export async function deleteAlertById(telegramId: number | string, alertId: number) {
  const alert = await getAlertById(alertId);
  if (!alert) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'Alert not found. Please check the alert ID and try again. If you believe this is an error, contact support.',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  const success = await deleteAlert(alertId);
  if (success) {
    try {
      subscriptionManager.removeAlertForPair(alert.pair, String(alertId));
    } catch (err) {
      console.error(`Failed to unsubscribe from ${alert.pair}: %o`, err);
    }
    // Log alert deletion
    let username = `user_${telegramId}`;
    try {
      const user = await fetchUser(alert.user_id);
      if (user && user.telegram_id) {
        username = `user_${user.telegram_id}`;
      } else if (alert.user_id) {
        username = `user_${alert.user_id}`;
      }
    } catch (e) {
      // fallback to telegramId
    }
    const formattedPair = `${alert.pair.slice(0,3)}/${alert.pair.slice(3,6)}`;
    import('../../logger').then(({ default: logger }) => {
      logger.info(`${username} deleted alert: [ID ${alert.id}] ${formattedPair} ${alert.direction} ${alert.target_price}`);
    });
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'Your alert has been removed and you will no longer receive notifications for this price level.',
      reply_markup: mainMenuKeyboard,
    });
    return;
  } else {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'Failed to delete alert. Please try again later or contact support if the issue persists.',
      reply_markup: mainMenuKeyboard,
    });
  }
} 