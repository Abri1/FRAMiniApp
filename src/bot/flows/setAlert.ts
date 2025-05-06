// src/bot/flows/setAlert.ts
// Set Alert flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { createAlert, getUserByTelegramId, getAlertsByUserId, updateUserCredits, isUserSubscriptionActive } from '../../integrations/supabase';
import { showMainMenu, mainMenuKeyboard } from '../menu';
import { isSupportedDirection, isValidPriceFormat } from '../../config/forex';
import { isPairValid } from '../../integrations/forex';
import { FlowManager, BotFlow } from './flowManager';
import { subscriptionManager } from '../../services/subscriptionManager';
import logger from '../../logger';
import { isValidPairFormat, isValidDirection, isValidPriceForPair } from '../../utils/validation';
import { getLatestPriceFromCache } from '../../integrations/forex';
import { isRateLimited } from '../../utils/rateLimiter';

interface SetAlertState {
  step: 'pair' | 'price' | 'direction' | 'confirm' | 'done';
  pair?: string;
  price?: number;
  direction?: 'above' | 'below' | null;
}
const setAlertStates = new Map<string, SetAlertState>();

function getPairDecimals(pair: string): number {
  const quote = pair.slice(3, 6).toUpperCase();
  return quote === 'JPY' ? 3 : 5;
}

export const SetAlertFlow: BotFlow = {
  async start(telegramId: number | string) {
    // Rate limit: max 5 alert creations per 60 seconds
    if (isRateLimited(String(telegramId), 'createAlert', 5, 60)) {
      await sendTelegramMessage({
        chat_id: telegramId,
        text: '🚫 You are creating alerts too quickly. Please wait a minute before trying again.',
        reply_markup: mainMenuKeyboard,
      });
      return;
    }
    setAlertStates.set(String(telegramId), { step: 'pair' });
    await sendTelegramMessage({
      chat_id: telegramId,
      text: `<b>Set Up a New Alert</b>\n\nEnter the forex pair (e.g., <b>EURUSD</b>):`,
      parse_mode: 'HTML',
    });
  },
  async handleMessage(telegramId: number | string, message: string) {
    const state = setAlertStates.get(String(telegramId));
    if (!state) {
      await sendTelegramMessage({
        chat_id: telegramId,
        text: 'No alert is being set. Please use the menu to start again.',
      });
      return;
    }
    if (state.step === 'pair') {
      const pair = message.trim().toUpperCase();
      if (!(await isPairValid(pair))) {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: `❌ Unsupported currency pair. Please enter a valid forex pair (e.g., EURUSD, GBPUSD, USDJPY).`,
        });
        return;
      }
      state.pair = pair;
      state.step = 'price';
      await sendTelegramMessage({
        chat_id: telegramId,
        text:
          `<b>Enter your target price for ${state.pair}</b>\n\n` +
          `<i>Tip: For best results, set your alert just before your target—slightly below if aiming above, or slightly above if aiming below. This helps account for spreads and ensures your alert triggers.</i>`,
        parse_mode: 'HTML',
      });
      return;
    }
    if (state.step === 'price') {
      if (!state.pair) {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: '❌ Internal error: missing pair. Please restart the alert flow.',
        });
        return;
      }
      const priceInput = message.trim();
      if (!isValidPriceForPair(state.pair, priceInput)) {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: `❌ Invalid price format. Please enter a valid number for ${state.pair} (e.g., 1.23456 for EURUSD, 123.456 for USDJPY):`,
        });
        return;
      }
      const price = parseFloat(priceInput);
      if (isNaN(price) || price <= 0) {
        await sendTelegramMessage({
          chat_id: telegramId,
          text: '❌ Invalid price. Please enter a positive number:',
        });
        return;
      }
      state.price = price;
      // Try to get a fresh price from the live cache
      const livePrice = getLatestPriceFromCache(state.pair);
      if (typeof livePrice === 'number') {
        // Set direction immediately based on live price
        state.direction = livePrice < price ? 'above' : 'below';
        state.step = 'confirm';
        await sendTelegramMessage({
          chat_id: telegramId,
          text: `Alert Confirmation\n\nPair: ${state.pair}\nTarget Price: ${priceInput}`,
          reply_markup: {
            keyboard: [[{ text: 'Yes' }, { text: 'No' }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else {
        // No fresh price, direction will be set on first price update
        state.direction = null;
        state.step = 'confirm';
        await sendTelegramMessage({
          chat_id: telegramId,
          text: `Alert Confirmation\n\nPair: ${state.pair}\nTarget Price: ${priceInput}`,
          reply_markup: {
            keyboard: [[{ text: 'Yes' }, { text: 'No' }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      }
      return;
    }
    if (state.step === 'direction') {
      await sendTelegramMessage({
        chat_id: telegramId,
        text: '❌ Internal error: direction step should not occur. Please restart the alert flow.',
      });
      setAlertStates.delete(String(telegramId));
      await FlowManager.endFlow(telegramId);
      return;
    }
    if (state.step === 'confirm') {
      if (message.trim().toLowerCase() === 'yes') {
        // --- VALIDATION LOGIC ---
        if (!isValidPairFormat(state.pair!)) {
          await sendTelegramMessage({
            chat_id: telegramId,
            text: '⚠️ Invalid pair format. Please use a 6-letter pair like EURUSD.',
            reply_markup: mainMenuKeyboard,
          });
          setAlertStates.delete(String(telegramId));
          await FlowManager.endFlow(telegramId);
          return;
        }
        // Convert price to string for validation
        const priceStr = String(state.price!);
        if (!isValidPriceForPair(state.pair!, priceStr)) {
          await sendTelegramMessage({
            chat_id: telegramId,
            text: `⚠️ Invalid price format for ${state.pair}. Please enter a valid number for ${state.pair} (e.g., 1.23456 for EURUSD, 123.456 for USDJPY):`,
          });
          setAlertStates.delete(String(telegramId));
          await FlowManager.endFlow(telegramId);
          return;
        }
        // --- END VALIDATION LOGIC ---
        const user = await getUserByTelegramId(String(telegramId));
        if (!user) {
          await sendTelegramMessage({
            chat_id: telegramId,
            text: '❌ Could not find your user record. Please try /start again.',
          });
          setAlertStates.delete(String(telegramId));
          await FlowManager.endFlow(telegramId);
          return;
        }
        // Prevent duplicate alerts: check for existing active alert with same pair, price, direction
        const existingAlerts = await getAlertsByUserId(user.id, true);
        const duplicate = existingAlerts.find(a =>
          a.pair === state.pair &&
          a.target_price === state.price &&
          a.direction === state.direction
        );
        if (duplicate) {
          await sendTelegramMessage({
            chat_id: telegramId,
            text: '⚠️ You already have an active alert for this pair, price, and direction. Duplicate alerts are not allowed.',
            reply_markup: mainMenuKeyboard,
          });
          setAlertStates.delete(String(telegramId));
          await FlowManager.endFlow(telegramId);
          return;
        }
        // Enforce max_active_alerts cap for free users: only count telegram alerts
        const telegramAlertsCount = existingAlerts.filter(a => a.delivery_type === 'telegram').length;
        const maxActiveAlerts = typeof user.max_active_alerts === 'number' ? user.max_active_alerts : 5;
        const isPremium = user.credits > 0;
        if (!isPremium && telegramAlertsCount >= maxActiveAlerts) {
          await sendTelegramMessage({
            chat_id: telegramId,
            text: `🚫 You have reached your limit of ${maxActiveAlerts} active Telegram alerts as a free user.\n\nAdd credits to unlock unlimited active alerts and instant voice call notifications.\n\nContact @abribooysen to get started.`,
            reply_markup: mainMenuKeyboard,
          });
          setAlertStates.delete(String(telegramId));
          await FlowManager.endFlow(telegramId);
          return;
        }
        // CREDIT CHECK (user row version)
        let usedCredit = false;
        if (user.credits > 0) {
          const creditUpdated = await updateUserCredits(user.id, user.credits - 1);
          if (!creditUpdated) {
            await sendTelegramMessage({
              chat_id: telegramId,
              text: '❌ Failed to update your credits. Please try again later.',
              reply_markup: mainMenuKeyboard,
            });
            setAlertStates.delete(String(telegramId));
            await FlowManager.endFlow(telegramId);
            return;
          }
          usedCredit = true;
        }
        let deliveryType: 'premium' | 'telegram' = 'telegram';
        if (usedCredit) {
          deliveryType = 'premium';
        }
        const alertId = await createAlert({
          user_id: user.id,
          pair: state.pair!,
          target_price: state.price!,
          direction: state.direction!,
          active: true,
          notification_sent: false,
          retry_count: 0,
          last_failure_reason: null,
          delivery_type: deliveryType
        });
        if (alertId) {
          // Fetch the full alert object for robust callback
          const alert = await import('../../integrations/supabase').then(m => m.getAlertById(alertId));
          if (alert) {
            try {
              const { createAlertCallback } = await import('../../priceMonitor');
              const { fetchUser } = await import('../../priceMonitor');
              const { processAlert } = await import('../../alertProcessor');
              subscriptionManager.addAlertForPair(alert.pair, createAlertCallback(alert, fetchUser, processAlert), alert.id.toString());
            } catch (err) {
              logger.error(`[SetAlertFlow] Failed to subscribe to ${alert.pair}: %o`, err);
            }
            // Log alert creation
            const username = user.telegram_id ? `user_${user.telegram_id}` : `user_${user.id}`;
            const formattedPair = `${alert.pair.slice(0,3)}/${alert.pair.slice(3,6)}`;
            logger.info(`${username} created alert: [ID ${alert.id}] ${formattedPair} ${alert.direction} ${alert.target_price}`);
          } else {
            logger.error(`[SetAlertFlow] Could not fetch alert ${alertId} for subscription.`);
          }
          let alertMsg =
            '✅ *Alert Created!*\n' +
            'Your alert is now *active*.\n' +
            '\n' +
            '_One credit has been deducted from your balance._\n' +
            '\n' +
            'You will receive a *premium instant voice alert* when your target is reached.';
          if (deliveryType !== 'premium') {
            alertMsg =
              '✅ *Alert Created!*\n' +
              'Your alert is now *active*.\n' +
              '\n' +
              'You will receive a Telegram notification when your target is reached.\n' +
              '\n' +
              'Please make sure your Telegram notification settings allow alerts from this bot.';
          }
          await sendTelegramMessage({
            chat_id: telegramId,
            text: alertMsg,
            parse_mode: 'Markdown',
            reply_markup: mainMenuKeyboard,
          });
        } else {
          await sendTelegramMessage({
            chat_id: telegramId,
            text: 'Failed to create alert. Please try again later or contact support if the issue persists.',
            reply_markup: mainMenuKeyboard,
          });
        }
        setAlertStates.delete(String(telegramId));
        await FlowManager.endFlow(telegramId);
        return;
      } else {
        setAlertStates.delete(String(telegramId));
        await FlowManager.endFlow(telegramId);
      }
    }
  },
  async end(telegramId: number | string) {
    setAlertStates.delete(String(telegramId));
  },
};