// src/bot/flows/viewAlerts.ts
// View Alerts flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { getUserByTelegramId, getAlertsByUserId } from '../../integrations/supabase';
import { showMainMenu } from '../menu';

/**
 * Show all alerts for the user as individual cards/messages
 */
export async function viewAlerts(telegramId: number | string) {
  const user = await getUserByTelegramId(String(telegramId));
  if (!user) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '❌ Could not find your user record. Please try /start again.',
    });
    await showMainMenu(telegramId);
    return;
  }
  const alerts = await getAlertsByUserId(user.id, false); // show all alerts
  if (!alerts.length) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'You have no alerts set up yet. Use "Set Alert" to create one!',
    });
    await showMainMenu(telegramId);
    return;
  }
  for (const alert of alerts) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: `🔔 Alert\nPair: ${alert.pair}\nPrice: ${alert.target_price}\nDirection: ${alert.direction}\nStatus: ${alert.active ? 'Active' : 'Inactive'}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Edit', callback_data: `edit_alert:${alert.id}` },
            { text: 'Delete', callback_data: `delete_alert:${alert.id}` },
          ],
        ],
      },
    } as any);
  }
  // showMainMenu removed; the persistent keyboard remains visible
} 