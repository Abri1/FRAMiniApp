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

// Helper: Map currency codes to full names
const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  NZD: 'New Zealand Dollar',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  ZAR: 'South African Rand',
  MXN: 'Mexican Peso',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  TRY: 'Turkish Lira',
  PLN: 'Polish Zloty',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  DKK: 'Danish Krone',
  RUB: 'Russian Ruble',
  INR: 'Indian Rupee',
  CNY: 'Chinese Yuan',
  KRW: 'South Korean Won',
  BRL: 'Brazilian Real',
  SAR: 'Saudi Riyal',
  AED: 'UAE Dirham',
  THB: 'Thai Baht',
  MYR: 'Malaysian Ringgit',
  IDR: 'Indonesian Rupiah',
  PHP: 'Philippine Peso',
  TWD: 'Taiwan Dollar',
  ILS: 'Israeli Shekel',
  ARS: 'Argentine Peso',
  CLP: 'Chilean Peso',
  COP: 'Colombian Peso',
  PEN: 'Peruvian Sol',
  RON: 'Romanian Leu',
  BGN: 'Bulgarian Lev',
  HRK: 'Croatian Kuna',
  ISK: 'Icelandic Krona',
  // Add more as needed
};

function spellOut(code: string): string {
  return code.split('').join(' ');
}

function getFullPairName(pair: string): string {
  const base = pair.slice(0, 3).toUpperCase();
  const quote = pair.slice(3, 6).toUpperCase();
  const baseName = CURRENCY_NAMES[base] || spellOut(base);
  const quoteName = CURRENCY_NAMES[quote] || spellOut(quote);
  return `${baseName} ${quoteName}`;
}

function getPairDecimals(pair: string): number {
  const quote = pair.slice(3, 6).toUpperCase();
  return quote === 'JPY' ? 3 : 5;
}

function buildVoiceAlertTwiML(pair: string, direction: string, price: number): string {
  const fullPair = getFullPairName(pair);
  const decimals = getPairDecimals(pair);
  const priceStr = price.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
  const alertMsg = `${fullPair} has reached ${priceStr}.`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Pause length="1"/>\n  <Say voice="Google.en-US-Neural2-F" language="en-US">Hello! This is your Forex Ring Alert. ${alertMsg} I repeat, ${alertMsg} Happy trading. Goodbye.</Say>\n</Response>`;
}

export type VoiceCallResult = { success: true } | { success: false, error: string };

/**
 * Place a voice call via Twilio Programmable Voice
 * @param to - E.164 formatted phone number
 * @param message - Message to be spoken (will be converted to TwiML <Say>)
 * @returns true if call initiated, false otherwise
 */
export async function sendVoiceCall(to: string, message: string, pair?: string, direction?: string, price?: number, alertId?: string, retryCount?: number): Promise<VoiceCallResult> {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
    logger.error('Twilio config missing. Cannot place voice call.');
    // If alertId is provided, update failure reason and retry count
    if (alertId) {
      await import('./supabase').then(({ supabase }) =>
        supabase.from('alerts')
          .update({ notification_sent: false, last_failure_reason: 'Twilio config missing', retry_count: (retryCount ?? 0) + 1 })
          .eq('uuid', alertId)
      );
    }
    return { success: false, error: 'Twilio config missing' };
  }
  try {
    const client = new Twilio(config.twilioAccountSid, config.twilioAuthToken);
    // If all alert params provided, use custom TwiML
    const twiml = (pair && direction && typeof price === 'number')
      ? buildVoiceAlertTwiML(pair, direction, price)
      : `<Response><Say voice=\"Google.en-US-Neural2-F\" language=\"en-US\">${message}</Say></Response>`;
    // Set statusCallback URL
    const statusCallback = `${process.env.PUBLIC_URL || 'https://yourdomain.com'}/api/twilio/call-status`;
    const call = await client.calls.create({
      twiml,
      to,
      from: config.twilioPhoneNumber,
      timeout: 120,
      statusCallback,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });
    // Store notification_sent, last_failure_reason, retry_count in alerts table by alertId if provided
    if (alertId) {
      const { error } = await import('./supabase').then(({ supabase }) =>
        supabase.from('alerts')
          .update({ notification_sent: true, last_failure_reason: null, retry_count: (retryCount ?? 0) + 1 })
          .eq('uuid', alertId)
      );
      if (error) {
        logger.error('[sendVoiceCall] Failed to update alert with notification_sent/last_failure_reason/retry_count: %o', error);
      }
    }
    return { success: true };
  } catch (err: any) {
    logger.error('Failed to place voice call via Twilio: %o', err);
    // If alertId is provided, set notification_sent to false, update last_failure_reason and retry_count
    if (alertId) {
      const reason = err && (err.code || err.status || err.message)
        ? `Twilio error${err.code ? ' code ' + err.code : ''}: ${err.message || err.status || err}`
        : (typeof err === 'string' ? err : 'Unknown error');
      await import('./supabase').then(({ supabase }) =>
        supabase.from('alerts')
          .update({ notification_sent: false, last_failure_reason: reason, retry_count: (retryCount ?? 0) + 1 })
          .eq('uuid', alertId)
      );
    }
    let reason = 'Unknown error';
    if (err && (err.code || err.status || err.message)) {
      reason = `Twilio error${err.code ? ' code ' + err.code : ''}: ${err.message || err.status || err}`;
    } else if (typeof err === 'string') {
      reason = err;
    }
    return { success: false, error: reason };
  }
}

/**
 * Generic notification sender for voice (with Telegram fallback)
 * @param payload - VoiceNotificationPayload
 * @returns true if sent successfully, false otherwise
 */
export async function sendNotification(payload: VoiceNotificationPayload & { pair?: string, direction?: string, price?: number, alertId?: string, retryCount?: number }): Promise<true | string> {
  if (payload.channel === 'voice') {
    const result = await sendVoiceCall(payload.to, payload.message, payload.pair, payload.direction, payload.price, payload.alertId, payload.retryCount);
    // notification_sent, last_failure_reason, retry_count are already updated in sendVoiceCall
    if (!result.success && payload.alertId) {
      // Defensive: ensure notification_sent is false, update last_failure_reason and retry_count if failed
      await import('./supabase').then(({ supabase }) =>
        supabase.from('alerts')
          .update({ notification_sent: false, last_failure_reason: typeof result.error === 'string' ? result.error : 'Unknown error', retry_count: (payload.retryCount ?? 0) + 1 })
          .eq('uuid', payload.alertId)
      );
    }
    if (!result.success && payload.telegramFallbackChatId) {
      logger.warn('Voice call failed, falling back to Telegram for chat_id=%s', payload.telegramFallbackChatId);
      try {
        const { sendTelegramMessage } = await import('./telegram');
        await sendTelegramMessage({
          chat_id: payload.telegramFallbackChatId,
          text: payload.message,
        });
        // If Telegram fallback succeeds, set notification_sent true, last_failure_reason null, increment retry_count
        if (payload.alertId) {
          await import('./supabase').then(({ supabase }) =>
            supabase.from('alerts')
              .update({ notification_sent: true, last_failure_reason: null, retry_count: (payload.retryCount ?? 0) + 1 })
              .eq('uuid', payload.alertId)
          );
        }
      } catch (err) {
        logger.error('Telegram fallback failed: %o', err);
        // Defensive: ensure notification_sent is false, update last_failure_reason and retry_count if fallback fails
        if (payload.alertId) {
          await import('./supabase').then(({ supabase }) =>
            supabase.from('alerts')
              .update({ notification_sent: false, last_failure_reason: typeof err === 'string' ? err : (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' ? err.message : 'Telegram fallback failed'), retry_count: (payload.retryCount ?? 0) + 1 })
              .eq('uuid', payload.alertId)
          );
        }
      }
    }
    return result.success ? true : result.error;
  } else if (payload.channel === 'telegram') {
    try {
      const { sendTelegramMessage } = await import('./telegram');
      await sendTelegramMessage({
        chat_id: payload.to,
        text: payload.message,
      });
      // Set notification_sent true, last_failure_reason null, increment retry_count for telegram-only alerts
      if (payload.alertId) {
        await import('./supabase').then(({ supabase }) =>
          supabase.from('alerts')
            .update({ notification_sent: true, last_failure_reason: null, retry_count: (payload.retryCount ?? 0) + 1 })
            .eq('uuid', payload.alertId)
        );
      }
      return true;
    } catch (err) {
      logger.error('Failed to send Telegram message: %o', err);
      // Defensive: ensure notification_sent is false, update last_failure_reason and retry_count if failed
      if (payload.alertId) {
        await import('./supabase').then(({ supabase }) =>
          supabase.from('alerts')
            .update({ notification_sent: false, last_failure_reason: typeof err === 'string' ? err : (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' ? err.message : 'Failed to send Telegram message'), retry_count: (payload.retryCount ?? 0) + 1 })
            .eq('uuid', payload.alertId)
        );
      }
      return 'Failed to send Telegram message';
    }
  } else {
    logger.error('Unknown notification channel: %s', payload.channel);
    return 'Unknown notification channel';
  }
}

/**
 * Fetch the Twilio voice call rate for a given phone number using the Pricing API
 * @param phoneNumber The phone number in E.164 format
 * @returns The price per minute (number, in account currency) or null if unavailable
 */
export async function getTwilioVoiceRate(phoneNumber: string): Promise<number | null> {
  try {
    // Lazy require to avoid breaking environments where the lib isn't installed
    // (You must add twilio to your dependencies)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.pricing.v2.voice.numbers(phoneNumber).fetch();
    // result.outboundCallPrice.current_price is the price per minute
    if (result && result.outboundCallPrice && result.outboundCallPrice.current_price) {
      return parseFloat(result.outboundCallPrice.current_price);
    }
    return null;
  } catch (err) {
    // Optionally log error
    // console.error('Twilio Pricing API error:', err);
    return null;
  }
}
