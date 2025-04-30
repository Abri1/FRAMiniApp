// src/bot/commands/createAlert.ts
// Handler for /createalert command - creates a new price alert

import { TelegramChat, TelegramUser, sendTelegramMessage } from '../../integrations/telegram';
import logger from '../../logger';
import { createAlert, AlertCreateData } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';

// Supported currency pairs
const SUPPORTED_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 
  'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
  'EURJPY', 'GBPJPY'
];

// Supported alert directions
const SUPPORTED_DIRECTIONS = ['above', 'below'] as const;
type AlertDirection = typeof SUPPORTED_DIRECTIONS[number];

// Regex to validate a proper price format (allows for up to 5 decimal places)
const PRICE_REGEX = /^\d+(\.\d{1,5})?$/;

/**
 * Handle the /createalert command
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param args Arguments after the command (should be: CURRENCY_PAIR DIRECTION PRICE)
 */
export async function handleCreateAlertCommand(
  chat: TelegramChat, 
  user: TelegramUser, 
  args: string
): Promise<void> {
  logger.info('Handling /createalert command for user %d with args: %s', user.id, args);
  
  // Parse the arguments
  const argsParts = args.trim().split(/\s+/);
  
  // Check if we have the correct number of arguments
  if (argsParts.length < 3) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '⚠️ Please provide all required information in the format:\n' +
            '`/createalert CURRENCY_PAIR DIRECTION PRICE`\n\n' +
            'Example: `/createalert EURUSD above 1.2500`',
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  
  // Extract and validate the currency pair
  const pair = argsParts[0].toUpperCase();
  if (!SUPPORTED_PAIRS.includes(pair)) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `⚠️ Sorry, "${pair}" is not a supported currency pair.\n\n` +
            `Supported pairs: ${SUPPORTED_PAIRS.join(', ')}`,
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  
  // Extract and validate the direction
  const directionInput = argsParts[1].toLowerCase();
  if (!SUPPORTED_DIRECTIONS.includes(directionInput as AlertDirection)) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `⚠️ Sorry, "${directionInput}" is not a valid direction.\n\n` +
            `Supported directions: ${SUPPORTED_DIRECTIONS.join(', ')}`,
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  
  const direction = directionInput as AlertDirection;
  
  // Extract and validate the price
  const priceStr = argsParts[2];
  if (!PRICE_REGEX.test(priceStr)) {
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `⚠️ Sorry, "${priceStr}" is not a valid price format.\n\n` +
            'Please use a valid number with up to 5 decimal places.',
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    return;
  }
  
  const price = parseFloat(priceStr);
  
  try {
    // Create the alert in the database
    const alertData: AlertCreateData = {
      user_id: String(user.id),
      pair,
      target_price: price,
      direction,
      active: true,
      notification_sent: false,
      retry_count: 0
    };
    
    const alertId = await createAlert(alertData);
    
    if (!alertId) {
      throw new Error('Failed to create alert');
    }
    
    await sendTelegramMessage({
      chat_id: chat.id,
      text: `✅ Alert created successfully!\n\n` +
            `*Alert Details:*\n` +
            `Currency Pair: ${pair}\n` +
            `Direction: ${direction}\n` +
            `Target Price: ${price}\n` +
            `Alert ID: ${alertId}\n\n` +
            `You'll be notified when ${pair} goes ${direction} ${price}.`,
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
    
    logger.info('Created alert for user %d: %s %s %s', user.id, pair, direction, price);
  } catch (error) {
    logger.error('Failed to create alert: %o', error);
    
    await sendTelegramMessage({
      chat_id: chat.id,
      text: '⚠️ Sorry, there was an error creating your alert. Please try again later.',
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard,
    });
  }
} 