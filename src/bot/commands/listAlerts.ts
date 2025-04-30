// src/bot/commands/listAlerts.ts
// Handler for /listalerts command - displays user's active alerts

import { TelegramChat, TelegramUser, sendTelegramMessage } from '../../integrations/telegram';
import logger from '../../logger';
import { getAlertsByUserId, Alert, getUserByTelegramId } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';

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
  logger.info('Handling /listalerts command for user %d', user.id);
  
  try {
    // Get all active alerts for this user from the database
    const alerts = await getAlertsByUserId(String(user.id));
    const dbUser = await getUserByTelegramId(String(user.id));
    
    if (!alerts || alerts.length === 0) {
      await sendTelegramMessage({
        chat_id: chat.id,
        text: '📝 You don\'t have any active alerts.\n\nCreate one with the /createalert command!',
        parse_mode: 'Markdown',
        ...(dbUser && dbUser.onboarded ? { reply_markup: mainMenuKeyboard } : {}),
      });
      return;
    }
    
    // Construct the message with all alerts
    let message = '*Your Active Alerts:*\n\n';
    
    alerts.forEach((alert: Alert, index: number) => {
      message += `*${index + 1}. ${alert.pair}*\n`;
      message += `   Direction: ${alert.direction}\n`;
      message += `   Target Price: ${alert.target_price}\n`;
      message += `   Alert ID: \`${alert.id}\`\n\n`;
    });
    
    message += 'To delete an alert, use `/deletealert ALERT_ID`';
    
    await sendTelegramMessage({
      chat_id: chat.id,
      text: message,
      parse_mode: 'Markdown',
      ...(dbUser && dbUser.onboarded ? { reply_markup: mainMenuKeyboard } : {}),
    });
    
  } catch (error) {
    logger.error('Failed to fetch alerts: %o', error);
    
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '⚠️ Sorry, there was an error fetching your alerts. Please try again later.',
      parse_mode: 'Markdown'
    });
  }
} 