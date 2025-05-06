// src/alertProcessor.ts
// Processes triggered alerts and notifies users via voice call (Twilio) with Telegram fallback
// Modular, type-safe, robust error handling, testable, follows global rules

import { Alert, User, updateUserCredits, isUserSubscriptionActive, updateLastAlertTriggeredAt } from './integrations/supabase';
import { sendNotification } from './integrations/notification';
import { sendTelegramMessage } from './integrations/telegram';
import logger from './logger';

/**
 * Process a triggered alert for a user: place a voice call, fallback to Telegram if needed
 * @param alert - The triggered alert object
 * @param user - The user to notify (must have phone and Telegram ID)
 * @returns true if notification sent successfully, false otherwise
 */
export async function processAlert(alert: Alert, user: User): Promise<boolean | string> {
  // logger.info(`[processAlert] START alertId=${alert.id} userId=${user.id} credits=${user.credits} subActive=${isUserSubscriptionActive(user)} phone=${user.phone_number} time=${new Date().toISOString()}`);

  if (!user || !user.id || !user.telegram_id) {
    logger.error('Invalid user for alert processing: %o', user);
    return false;
  }

  const directionText = alert.direction ? '' : '(pending direction)';
  const message = `Forex Alert: ${alert.pair} has reached ${alert.target_price}.`;

  try {
    if (alert.delivery_type === 'premium') {
      if (user.phone_number) {
        const notificationPayload: any = {
          to: user.phone_number,
          message,
          channel: 'voice',
          telegramFallbackChatId: user.telegram_id,
          pair: alert.pair,
          price: alert.target_price,
          alertId: alert.uuid,
        };
        if (alert.direction) notificationPayload.direction = alert.direction;
        const result = await sendNotification(notificationPayload);
        if (result === true) {
          const formattedPair = `${alert.pair.slice(0,3)}/${alert.pair.slice(3,6)}`;
          await updateLastAlertTriggeredAt(user.id);
          logger.info(`Alert sent: ${formattedPair} ${alert.direction} ${alert.target_price} to user ${user.id}`);
          return true;
        } else {
          logger.error('Failed to notify user %s for alert %s: %s', user.id, alert.id, result);
          return result;
        }
      } else {
        // Premium alert but no phone number
        await sendTelegramMessage({
          chat_id: user.telegram_id,
          text: message + '\n\nYou have a premium alert, but no phone number is set for voice alerts. Please contact support to add your number.',
        });
        logger.info(`User ${user.id} has premium alert but missing phone number.`);
        return true;
      }
    } else {
      // Telegram-only alert
      await sendTelegramMessage({
        chat_id: user.telegram_id,
        text: message + '\n\nWant premium instant voice call alerts? Add credits. Contact @abribooysen.',
      });
      logger.info(`Telegram-only alert sent to user ${user.id} (telegram delivery_type)`);
      return true;
    }
  } catch (err) {
    logger.error('processAlert error: %o', err);
    return String(err);
  }
}

// For testability, export types
export type { Alert, User };
