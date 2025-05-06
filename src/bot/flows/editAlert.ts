// src/bot/flows/editAlert.ts
// Edit Alert flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { getAlertById, updateAlert } from '../../integrations/supabase';
import { showMainMenu } from '../menu';
import { FlowManager, BotFlow } from './flowManager';
import logger from '../../logger';
import { viewAlerts } from './viewAlerts';
import { getLatestPriceFromCache } from '../../integrations/forex';

interface EditAlertState {
  alertId: number;
  step: 'price';
}
const editAlertStates = new Map<string, EditAlertState>();

function getPairDecimals(pair: string): number {
  const quote = pair.slice(3, 6).toUpperCase();
  return quote === 'JPY' ? 3 : 5;
}

export const EditAlertFlow: BotFlow = {
  async start(telegramId: number | string, alertId: number) {
    const alert = await getAlertById(alertId);
    if (!alert) {
      await sendTelegramMessage({
        chat_id: telegramId,
        text: 'Alert not found. Please check the alert ID and try again. If you believe this is an error, contact support.',
      });
      await showMainMenu(telegramId);
      await FlowManager.endFlow(telegramId);
      return;
    }
    editAlertStates.set(String(telegramId), { alertId, step: 'price' });
    await sendTelegramMessage({
      chat_id: telegramId,
      text: `Edit Alert\n\nPair: ${alert.pair}\nCurrent Target: ${alert.target_price}\n\nPlease enter the new target price:`,
    });
  },
  async handleMessage(telegramId: number | string, message: string) {
    const state = editAlertStates.get(String(telegramId));
    if (!state) {
      await sendTelegramMessage({
        chat_id: telegramId,
        text: 'No alert is being edited. Please select an alert to edit from your active alerts list.',
      });
      await showMainMenu(telegramId);
      await FlowManager.endFlow(telegramId);
      return;
    }
    if (state.step === 'price') {
      const price = parseFloat(message);
      if (isNaN(price) || price <= 0) {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: 'Invalid price. Please enter a valid positive number for the new target price.',
        });
        return;
      }
      const oldAlert = await getAlertById(state.alertId);
      let direction: 'above' | 'below' | null = null;
      if (oldAlert) {
        const livePrice = getLatestPriceFromCache(oldAlert.pair);
        if (typeof livePrice === 'number') {
          direction = livePrice < price ? 'above' : 'below';
        } else {
          direction = null; // Will be set on next price update
        }
      }
      const success = await updateAlert(state.alertId, { target_price: price, direction: null });
      if (success) {
        if (oldAlert) {
          const formattedPair = `${oldAlert.pair.slice(0,3)}/${oldAlert.pair.slice(3,6)}`;
          const username = oldAlert.user_id ? `user_${oldAlert.user_id}` : `user_${telegramId}`;
          const decimals = getPairDecimals(oldAlert.pair);
          logger.info(`${username} updated alert: [ID ${oldAlert.id}] ${formattedPair} ${oldAlert.target_price.toFixed(decimals)} → ${price.toFixed(decimals)}`);
          // Remove old subscription and re-add with new state
          try {
            const { subscriptionManager } = await import('../../services/subscriptionManager');
            subscriptionManager.removeAlertForPair(oldAlert.pair, String(state.alertId));
            const { getAlertById } = await import('../../integrations/supabase');
            const updatedAlert = await getAlertById(state.alertId);
            if (updatedAlert) {
              const { createAlertCallback } = await import('../../priceMonitor');
              const { fetchUser } = await import('../../priceMonitor');
              const { processAlert } = await import('../../alertProcessor');
              subscriptionManager.addAlertForPair(updatedAlert.pair, createAlertCallback(updatedAlert, fetchUser, processAlert), updatedAlert.id.toString());
            }
          } catch (err) {
            logger.error(`[EditAlertFlow] Failed to re-subscribe alert after edit: %o`, err);
          }
        }
        await sendTelegramMessage({
          chat_id: telegramId,
          text: 'Alert updated successfully.\n\nYour alert has been updated and will trigger when the new target is reached.',
          reply_markup: (await import('../menu')).mainMenuKeyboard,
        });
      } else {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: 'Failed to update alert. Please try again later or contact support if the issue persists.',
        });
      }
      editAlertStates.delete(String(telegramId));
      await FlowManager.endFlow(telegramId);
      return;
    }
  },
  async end(telegramId: number | string) {
    editAlertStates.delete(String(telegramId));
  },
};

export async function startEditAlertFlow(telegramId: number | string, alertId: number) {
  const alert = await getAlertById(alertId);
  if (!alert) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'Alert not found. Please check the alert ID and try again. If you believe this is an error, contact support.',
    });
    await showMainMenu(telegramId);
    await FlowManager.endFlow(telegramId);
    return;
  }
  await sendTelegramMessage({
    chat_id: telegramId,
    text: `Edit Alert\n\nPair: ${alert.pair}\nCurrent Target: ${alert.target_price}\n\nPlease enter the new target price:`,
  });
} 