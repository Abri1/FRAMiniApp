// src/bot/commands/listAlerts.ts
// Handler for /listalerts command - displays user's active alerts

import { TelegramChat, TelegramUser, sendTelegramMessage } from '../../integrations/telegram';
import logger from '../../logger';
import { getAlertsByUserId, Alert, getUserByTelegramId } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';
import { getLatestForexPrice } from '../../integrations/forex';

/**
 * Handle the /listalerts command
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param args Any arguments after the command (not used for this command)
 */
export async function handleListAlertsCommand(
  chat: TelegramChat, 
  user: TelegramUser, 
  args: string
): Promise<void> {
  try {
    // Get all active alerts for this user from the database
    const alerts = await getAlertsByUserId(String(user.id));
    const dbUser = await getUserByTelegramId(String(user.id));
    
    if (!alerts || alerts.length === 0) {
      await sendTelegramMessage({
        chat_id: chat.id,
        text: '📝 You don\'t have any active alerts.\n\nCreate one with the /createalert command!',
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard,
      });
      return;
    }
    
    // Construct the message with all alerts
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
        { text: 'Edit', callback_data: `edit_alert:${alert.id}` },
        { text: 'Delete', callback_data: `delete_alert:${alert.id}` },
      ]);
    }
    
    message += 'To delete an alert, use `/deletealert ALERT_ID`';
    
    await sendTelegramMessage({
      chat_id: chat.id,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard },
    });
    
  } catch (error) {
    logger.error('Failed to fetch alerts: %o', error);
    
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '⚠️ Sorry, there was an error fetching your alerts. Please try again later.',
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
  }
} 