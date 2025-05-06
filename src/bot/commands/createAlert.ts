// src/bot/commands/createAlert.ts
// Handler for /createalert command - creates a new price alert

import { TelegramChat, TelegramUser, sendTelegramMessage } from '../../integrations/telegram';
import logger from '../../logger';
import { createAlert, AlertCreateData } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';
import { isPairValid } from '../../integrations/forex';
import { ALERT_DEFAULTS } from '../../config/alertDefaults';
import { sanitizeArgs, extractPriceArg, isValidPairFormat, isValidDirection, isValidPriceForPair, normalizePrice } from '../../utils/validation';
import { t } from '../../utils/i18n';
import { SUPPORTED_DIRECTIONS } from '../../config/forex';

/**
 * Handle the /createalert command
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param args Arguments after the command (should be: CURRENCY_PAIR PRICE)
 */
export async function handleCreateAlertCommand(
  chat: TelegramChat, 
  user: TelegramUser, 
  args: string
): Promise<void> {
  // Sanitize and parse arguments
  const argsParts = sanitizeArgs(args);
  if (argsParts.length < 2) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: 'Usage: /createalert CURRENCY_PAIR PRICE',
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }

  // Validate currency pair format before API call
  const pair = argsParts[0].toUpperCase();
  if (!isValidPairFormat(pair)) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: t('INVALID_PAIR_FORMAT'),
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  if (!(await isPairValid(pair))) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: t('INVALID_PAIR', { pair }),
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }

  // Extract and validate price
  const priceStr = argsParts[1];
  if (!isValidPriceForPair(pair, priceStr)) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: t('INVALID_PRICE', { price: priceStr, pair }),
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  const price = normalizePrice(pair, parseFloat(priceStr));

  // Fetch current price
  const from = pair.slice(0, 3);
  const to = pair.slice(3, 6);
  const { getLatestForexPrice } = await import('../../integrations/forex');
  const current = await getLatestForexPrice(from, to);
  if (!current) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '❌ Could not fetch the current price. Please try again later.',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  const decimals = getPairDecimals(pair);
  if (price === current.mid) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `❌ The current price for ${pair} is ${current.mid.toFixed(decimals)}, which matches your target. Please enter a different price.`,
      reply_markup: mainMenuKeyboard,
    });
    return;
  }

  // Fetch full user record for delivery_type logic
  const dbUser = await import('../../integrations/supabase').then(m => m.getUserByTelegramId(String(user.id)));
  if (!dbUser) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '❌ Could not find your user record. Please try /start again.',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }

  try {
    // Create the alert in the database using centralized defaults
    let deliveryType: 'premium' | 'telegram' = 'telegram';
    if (dbUser.credits > 0 || (dbUser.subscription_status === 'active' && dbUser.subscription_end && new Date(dbUser.subscription_end) > new Date())) {
      deliveryType = 'premium';
    }
    const alertData: AlertCreateData = {
      user_id: String(user.id),
      pair,
      target_price: price,
      direction: null,
      ...ALERT_DEFAULTS,
      delivery_type: deliveryType
    };
    const alertId = await createAlert(alertData);
    if (!alertId) {
      throw new Error('Failed to create alert');
    }
    // Log alert creation (single, clear entry)
    const username = user.username ? `@${user.username}` : `user_${user.id}`;
    logger.info(`${username} created alert: [ID ${alertId}] ${pair} (pending direction) ${price}`);
    // Send success message with correct decimals and computed direction
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `✅ *Alert Created!*

*Pair:* ${pair}
*Price:* ${price.toFixed(decimals)}
*Direction:* _(to be set on first price update)_

1 credit has been deducted from your balance.

_You'll be notified when your alert triggers._`,
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
  } catch (error: any) {
    logger.error('Failed to create alert: %o', error);
    await sendTelegramMessage({
      chat_id: chat.id,
      text: error?.message?.includes('Supabase')
        ? t('DB_ERROR', { error: error.message })
        : t('ALERT_ERROR'),
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
  }
}

/**
 * Get the number of decimals for a pair (JPY: 3, others: 5)
 */
function getPairDecimals(pair: string): number {
  const quote = pair.slice(3, 6).toUpperCase();
  return quote === 'JPY' ? 3 : 5;
} 