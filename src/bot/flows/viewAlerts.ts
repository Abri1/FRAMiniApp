// src/bot/flows/viewAlerts.ts
// View Alerts flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { getUserByTelegramId, getAlertsByUserId } from '../../integrations/supabase';
import { showMainMenu } from '../menu';
import { getLatestForexPrice } from '../../integrations/forex';

/**
 * Show all alerts for the user as individual cards/messages
 */
export async function viewAlerts(telegramId: number | string) {
  const user = await getUserByTelegramId(String(telegramId));
  if (!user) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'Account not found. Please use /start to register and access your alerts.',
    });
    await showMainMenu(telegramId);
    return;
  }
  const alerts = await getAlertsByUserId(user.id, true); // show only active alerts
  if (!alerts.length) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'No active alerts.\n\nTap "Set Alert" to create a forex alert.',
    });
    return;
  }
  let message = '*Your Active Alerts:*\n\n';
  const inline_keyboard: any[][] = [];
  for (const [index, alert] of alerts.entries()) {
    let alertType = alert.delivery_type === 'premium' ? 'Premium Voice Alert' : 'Telegram Alert';
    // Fetch current price for the pair
    const from = alert.pair.slice(0, 3);
    const to = alert.pair.slice(3, 6);
    let currentPrice = 'N/A';
    try {
      const priceObj = await getLatestForexPrice(from, to);
      if (priceObj && typeof priceObj.mid === 'number') {
        const decimals = to === 'JPY' ? 3 : 5;
        currentPrice = priceObj.mid.toFixed(decimals);
      }
    } catch (e) {
      // If price fetch fails, leave as N/A
    }
    message += `*${index + 1}. ${alert.pair}*  _(${alertType})_\n`;
    message += `   Current Price: ${currentPrice}\n`;
    message += `   Target Price: ${alert.target_price}\n`;
    message += `   Alert ID: \`${alert.id}\`\n\n`;
    inline_keyboard.push([
      { text: `Edit ${index + 1}`, callback_data: `edit_alert:${alert.id}` },
      { text: `Delete ${index + 1}`, callback_data: `delete_alert:${alert.id}` },
    ]);
  }
  await sendTelegramMessage({
    chat_id: telegramId,
    text: message,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard },
  });
  // showMainMenu removed; the persistent keyboard remains visible
} 