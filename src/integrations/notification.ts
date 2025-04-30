// src/integrations/notification.ts
// Notification integration for Forex Ring Alerts
// Modular, type-safe, robust error handling, testable, follows global rules

// src/integrations/notification.ts
// Voice call notification integration for Forex Ring Alerts
// Modular, type-safe, robust error handling, testable, follows global rules

import { Twilio } from 'twilio';
import logger from '../logger';
import { loadConfig } from '../config';

const config = loadConfig();

/** Notification channel types */
export type NotificationChannel = 'voice' | 'telegram';

/** Notification payload for voice call */
export interface VoiceNotificationPayload {
  to: string; // E.164 phone number
  message: string; // Message to be spoken
  channel: 'voice';
  telegramFallbackChatId?: string | number; // fallback for call failures
}

/**
 * Place a voice call via Twilio Programmable Voice
 * @param to - E.164 formatted phone number
 * @param message - Message to be spoken (will be converted to TwiML <Say>)
 * @returns true if call initiated, false otherwise
 */
export async function sendVoiceCall(to: string, message: string): Promise<boolean> {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
    logger.error('Twilio config missing. Cannot place voice call.');
    return false;
  }
  try {
    const client = new Twilio(config.twilioAccountSid, config.twilioAuthToken);
    const twiml = `<Response><Say>${message}</Say></Response>`;
    const call = await client.calls.create({
      twiml,
      to,
      from: config.twilioPhoneNumber,
    });
    logger.info('Placed voice call to %s (sid=%s)', to, call.sid);
    return true;
  } catch (err) {
    logger.error('Failed to place voice call via Twilio: %o', err);
    return false;
  }
}

/**
 * Generic notification sender for voice (with Telegram fallback)
 * @param payload - VoiceNotificationPayload
 * @returns true if sent successfully, false otherwise
 */
export async function sendNotification(payload: VoiceNotificationPayload): Promise<boolean> {
  if (payload.channel === 'voice') {
    const called = await sendVoiceCall(payload.to, payload.message);
    if (!called && payload.telegramFallbackChatId) {
      logger.warn('Voice call failed, falling back to Telegram for chat_id=%s', payload.telegramFallbackChatId);
      try {
        // Dynamically import to avoid circular dep
        const { sendTelegramMessage } = await import('./telegram');
        return await sendTelegramMessage({
          chat_id: payload.telegramFallbackChatId,
          text: payload.message,
        });
      } catch (err) {
        logger.error('Telegram fallback failed: %o', err);
        return false;
      }
    }
    return called;
  } else if (payload.channel === 'telegram') {
    try {
      const { sendTelegramMessage } = await import('./telegram');
      return await sendTelegramMessage({
        chat_id: payload.to,
        text: payload.message,
      });
    } catch (err) {
      logger.error('Failed to send Telegram message: %o', err);
      return false;
    }
  } else {
    logger.error('Unknown notification channel: %s', payload.channel);
    return false;
  }
}
