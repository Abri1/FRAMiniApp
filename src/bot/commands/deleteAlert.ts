// src/bot/commands/deleteAlert.ts
// Handler for /deletealert command - removes a user's alert

import { TelegramChat, TelegramUser, sendTelegramMessage } from '../../integrations/telegram';
import { deleteAlert, getAlertById, Alert } from '../../integrations/supabase';
import { getUserByTelegramId } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';
import { subscriptionManager } from '../../services/subscriptionManager';
import logger from '../../logger';

/**
 * Handle the /deletealert command
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param args Alert ID to delete
 */
export async function handleDeleteAlertCommand(
  chat: TelegramChat, 
  user: TelegramUser, 
  args: string
): Promise<void> {
  // Parse the arguments (expecting an alert ID)
  const alertId = parseInt(args.trim(), 10);
  if (isNaN(alertId)) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '⚠️ Please provide a valid numeric alert ID to delete.\n\n' +
            'Example: `/deletealert 123`\n\n' +
            'You can get your alert IDs by using the /listalerts command.',
      parse_mode: 'Markdown'
    });
    return;
  }
  try {
    // First check if the alert exists and belongs to this user
    const alert = await getAlertById(alertId);
    const dbUser = await getUserByTelegramId(String(user.id));
    if (!alert) {
      await sendTelegramMessage({
        chat_id: chat.id,
        text: `⚠️ Alert with ID \`${alertId}\` not found.`,
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard,
      });
      return;
    }
    // Verify that the alert belongs to this user
    if (alert.user_id !== String(user.id)) {
      await sendTelegramMessage({
        chat_id: chat.id,
        text: `⚠️ Alert with ID \`${alertId}\` not found.`,
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard,
      });
      return;
    }
    // Delete the alert
    await deleteAlert(alertId);
    // Remove subscription for this pair if needed
    try {
      subscriptionManager.removeAlertForPair(alert.pair, alertId.toString());
    } catch (err) {
      console.error(`Failed to unsubscribe from ${alert.pair}: %o`, err);
    }
    // Log alert deletion
    const username = user.username ? `@${user.username}` : `user_${user.id}`;
    const formattedPair = `${alert.pair.slice(0,3)}/${alert.pair.slice(3,6)}`;
    logger.info(`${username} deleted alert: [ID ${alert.id}] ${formattedPair} ${alert.direction} ${alert.target_price}`);
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `✅ Alert for ${alert.pair} ${alert.direction} ${alert.target_price} has been deleted.`,
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
  } catch (error) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '⚠️ Sorry, there was an error deleting your alert. Please try again later.',
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
  }
} 