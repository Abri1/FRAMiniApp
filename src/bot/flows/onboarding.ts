// src/bot/flows/onboarding.ts
// Onboarding flow for new users

import { sendTelegramMessage } from '../../integrations/telegram';
import { getUserByTelegramId, createUser, updateUserPhoneNumber, setUserOnboarded } from '../../integrations/supabase';
import { showMainMenu } from '../menu';
import { showInfo } from '../commands/info';
import logger from '../../logger';

/**
 * Handle phone number submission during onboarding.
 * @param telegramId Telegram user ID
 * @param phoneNumber Phone number string (from contact or text)
 */
export async function handlePhoneNumberSubmission(telegramId: number | string, phoneNumber: string) {
  logger.info('handlePhoneNumberSubmission called for %s with %s', telegramId, phoneNumber);
  // 2. Validate phone number (E.164/international format)
  if (!validatePhoneNumber(phoneNumber)) {
    logger.warn('Invalid phone number for %s: %s', telegramId, phoneNumber);
    await sendTelegramMessage({
      chat_id: telegramId,
      text: '❌ Invalid phone number format. Please send your number in international format (e.g., +1234567890).',
    });
    return;
  }
  logger.info('Phone validated for %s', telegramId);

  // 3. Ensure user exists and onboard them
  let user = await getUserByTelegramId(String(telegramId));
  if (!user) {
    const userId = await createUser({
      telegram_id: String(telegramId),
      credits: 0,
      phone_number: phoneNumber,
      onboarded: true,
    });
    if (!userId) {
      logger.error('Failed to create user for Telegram ID %s during onboarding', telegramId);
      await sendTelegramMessage({
        chat_id: telegramId,
        text: '❌ Failed to create your user record. Please try again or contact support.',
      });
      return;
    }
    logger.info('User created for %s', telegramId);
  } else {
    await updateUserPhoneNumber(String(telegramId), phoneNumber);
    await setUserOnboarded(String(telegramId), true);
    logger.info('User updated for %s', telegramId);
  }

  // 4. Show info page (user guide)
  logger.info('Calling showInfo for %s', telegramId);
  await showInfo(telegramId);
  logger.info('Onboarding complete for %s', telegramId);
}

/**
 * Validate phone number (E.164/international format)
 */
function validatePhoneNumber(phone: string): boolean {
  // Simple E.164 regex: starts with +, then 10-15 digits
  return /^\+[1-9]\d{9,14}$/.test(phone);
} 