// src/bot/flows/setAlert.ts
// Set Alert flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { createAlert, getUserByTelegramId } from '../../integrations/supabase';
import { showMainMenu } from '../menu';

// Per-user in-memory state (replace with persistent store if needed)
interface SetAlertState {
  step: 'pair' | 'price' | 'direction' | 'confirm' | 'done';
  pair?: string;
  price?: number;
  direction?: 'above' | 'below';
}
export const setAlertStates = new Map<string, SetAlertState>();

/**
 * Start the Set Alert flow for a user
 */
export async function startSetAlertFlow(telegramId: number | string) {
  setAlertStates.set(String(telegramId), { step: 'pair' });
  await sendTelegramMessage({
    chat_id: telegramId,
    text: "Let's set up a new alert!\n\nPlease enter the forex pair (e.g., EURUSD):",
  });
}

/**
 * Handle the next step in the Set Alert flow
 */
export async function handleSetAlertStep(telegramId: number | string, message: string) {
  const state = setAlertStates.get(String(telegramId));
  if (!state) {
    await startSetAlertFlow(telegramId);
    return;
  }
  if (state.step === 'pair') {
    state.pair = message.trim().toUpperCase();
    state.step = 'price';
    await sendTelegramMessage({
      chat_id: telegramId,
      text: `Great! Now enter the target price for ${state.pair}:`,
    });
    return;
  }
  if (state.step === 'price') {
    const price = parseFloat(message);
    if (isNaN(price) || price <= 0) {
      await sendTelegramMessage({
        chat_id: telegramId,
        text: '❌ Invalid price. Please enter a valid number:',
      });
      return;
    }
    state.price = price;
    state.step = 'direction';
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'Should the alert trigger when the price goes above or below this value? (Reply with "above" or "below")',
    });
    return;
  }
  if (state.step === 'direction') {
    const dir = message.trim().toLowerCase();
    if (dir !== 'above' && dir !== 'below') {
      await sendTelegramMessage({
        chat_id: telegramId,
        text: '❌ Please reply with "above" or "below":',
      });
      return;
    }
    state.direction = dir as 'above' | 'below';
    state.step = 'confirm';
    await sendTelegramMessage({
      chat_id: telegramId,
      text: `Please confirm your alert:\nPair: ${state.pair}\nPrice: ${state.price}\nDirection: ${state.direction}\n\nReply "yes" to confirm or "no" to cancel.`,
    });
    return;
  }
  if (state.step === 'confirm') {
    if (message.trim().toLowerCase() === 'yes') {
      const user = await getUserByTelegramId(String(telegramId));
      if (!user) {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: '❌ Could not find your user record. Please try /start again.',
        });
        setAlertStates.delete(String(telegramId));
        return;
      }
      const alertId = await createAlert({
        user_id: user.id,
        pair: state.pair!,
        target_price: state.price!,
        direction: state.direction!,
        active: true,
        notification_sent: false,
        retry_count: 0,
        last_failure_reason: null
      });
      if (alertId) {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: '✅ Your alert has been created!',
        });
      } else {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: '❌ Failed to create alert. Please try again later.',
        });
      }
      setAlertStates.delete(String(telegramId));
      await showMainMenu(telegramId);
      return;
    } else {
      await sendTelegramMessage({
        chat_id: telegramId,
        text: 'Alert creation cancelled.',
      });
      setAlertStates.delete(String(telegramId));
      await showMainMenu(telegramId);
      return;
    }
  }
} 