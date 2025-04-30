// src/bot/commands/deleteAlert.ts
// Handler for /deletealert command - removes a user's alert

import { TelegramChat, TelegramUser, sendTelegramMessage } from '../../integrations/telegram';
import logger from '../../logger';
// This import will need to be updated once Supabase integration is fully implemented
import { deleteAlert, getAlertById, Alert } from '../../integrations/supabase';
import { getUserByTelegramId } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';

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
  logger.info('Handling /deletealert command for user %d with args: %s', user.id, args);
  
  // Parse the arguments (expecting an alert ID)
  const alertId = args.trim();
  
  if (!alertId) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '⚠️ Please provide an alert ID to delete.\n\n' +
            'Example: `/deletealert ABC123`\n\n' +
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
        ...(dbUser && dbUser.onboarded ? { reply_markup: mainMenuKeyboard } : {}),
      });
      return;
    }
    
    // Verify that the alert belongs to this user
    if (alert.user_id !== String(user.id)) {
      logger.warn('User %d attempted to delete alert %s belonging to another user', user.id, alertId);
      await sendTelegramMessage({
        chat_id: chat.id,
        text: `⚠️ Alert with ID \`${alertId}\` not found.`,
        parse_mode: 'Markdown',
        ...(dbUser && dbUser.onboarded ? { reply_markup: mainMenuKeyboard } : {}),
      });
      return;
    }
    
    // Delete the alert
    await deleteAlert(alertId);
    
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `✅ Alert for ${alert.pair} ${alert.direction} ${alert.target_price} has been deleted.`,
      parse_mode: 'Markdown',
      ...(dbUser && dbUser.onboarded ? { reply_markup: mainMenuKeyboard } : {}),
    });
    
    logger.info('Deleted alert %s for user %d', alertId, user.id);
  } catch (error) {
    logger.error('Failed to delete alert: %o', error);
    
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '⚠️ Sorry, there was an error deleting your alert. Please try again later.',
      parse_mode: 'Markdown'
    });
  }
} 