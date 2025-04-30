// src/alertProcessor.ts
// Processes triggered alerts and notifies users via voice call (Twilio) with Telegram fallback
// Modular, type-safe, robust error handling, testable, follows global rules

import { Alert, User } from './integrations/supabase';
import { sendNotification } from './integrations/notification';
import logger from './logger';

/**
 * Process a triggered alert for a user: place a voice call, fallback to Telegram if needed
 * @param alert - The triggered alert object
 * @param user - The user to notify (must have phone and Telegram ID)
 * @returns true if notification sent successfully, false otherwise
 */
export async function processAlert(alert: Alert, user: User): Promise<boolean> {
  if (!user || !user.id || !user.telegram_id) {
    logger.error('Invalid user for alert processing: %o', user);
    return false;
  }
  if (!user.phone_number) {
    logger.error('User %s has no phone number for voice call', user.id);
    return false;
  }

  const message = `Forex Alert: ${alert.pair} is now ${alert.direction} ${alert.target_price}.`;

  try {
    const sent = await sendNotification({
      to: user.phone_number,
      message,
      channel: 'voice',
      telegramFallbackChatId: user.telegram_id,
    });
    if (sent) {
      logger.info('Alert notification sent for alert %s to user %s', alert.id, user.id);
    } else {
      logger.error('Failed to notify user %s for alert %s', user.id, alert.id);
    }
    return sent;
  } catch (err) {
    logger.error('processAlert error: %o', err);
    return false;
  }
}

// For testability, export types
export type { Alert, User };
