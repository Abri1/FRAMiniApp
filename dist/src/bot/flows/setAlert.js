"use strict";
// src/bot/flows/setAlert.ts
// Set Alert flow for Telegram bot
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAlertStates = void 0;
exports.startSetAlertFlow = startSetAlertFlow;
exports.handleSetAlertStep = handleSetAlertStep;
const telegram_1 = require("../../integrations/telegram");
const supabase_1 = require("../../integrations/supabase");
const menu_1 = require("../menu");
exports.setAlertStates = new Map();
/**
 * Start the Set Alert flow for a user
 */
function startSetAlertFlow(telegramId) {
    return __awaiter(this, void 0, void 0, function* () {
        exports.setAlertStates.set(String(telegramId), { step: 'pair' });
        yield (0, telegram_1.sendTelegramMessage)({
            chat_id: telegramId,
            text: "Let's set up a new alert!\n\nPlease enter the forex pair (e.g., EURUSD):",
        });
    });
}
/**
 * Handle the next step in the Set Alert flow
 */
function handleSetAlertStep(telegramId, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const state = exports.setAlertStates.get(String(telegramId));
        if (!state) {
            yield startSetAlertFlow(telegramId);
            return;
        }
        if (state.step === 'pair') {
            state.pair = message.trim().toUpperCase();
            state.step = 'price';
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: `Great! Now enter the target price for ${state.pair}:`,
            });
            return;
        }
        if (state.step === 'price') {
            const price = parseFloat(message);
            if (isNaN(price) || price <= 0) {
                yield (0, telegram_1.sendTelegramMessage)({
                    chat_id: telegramId,
                    text: '❌ Invalid price. Please enter a valid number:',
                });
                return;
            }
            state.price = price;
            state.step = 'direction';
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: 'Should the alert trigger when the price goes above or below this value? (Reply with "above" or "below")',
            });
            return;
        }
        if (state.step === 'direction') {
            const dir = message.trim().toLowerCase();
            if (dir !== 'above' && dir !== 'below') {
                yield (0, telegram_1.sendTelegramMessage)({
                    chat_id: telegramId,
                    text: '❌ Please reply with "above" or "below":',
                });
                return;
            }
            state.direction = dir;
            state.step = 'confirm';
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: `Please confirm your alert:\nPair: ${state.pair}\nPrice: ${state.price}\nDirection: ${state.direction}\n\nReply "yes" to confirm or "no" to cancel.`,
            });
            return;
        }
        if (state.step === 'confirm') {
            if (message.trim().toLowerCase() === 'yes') {
                const user = yield (0, supabase_1.getUserByTelegramId)(String(telegramId));
                if (!user) {
                    yield (0, telegram_1.sendTelegramMessage)({
                        chat_id: telegramId,
                        text: '❌ Could not find your user record. Please try /start again.',
                    });
                    exports.setAlertStates.delete(String(telegramId));
                    return;
                }
                const alertId = yield (0, supabase_1.createAlert)({
                    user_id: user.id,
                    pair: state.pair,
                    target_price: state.price,
                    direction: state.direction,
                    active: true,
                    notification_sent: false,
                    retry_count: 0,
                    last_failure_reason: null
                });
                if (alertId) {
                    yield (0, telegram_1.sendTelegramMessage)({
                        chat_id: telegramId,
                        text: '✅ Your alert has been created!',
                    });
                }
                else {
                    yield (0, telegram_1.sendTelegramMessage)({
                        chat_id: telegramId,
                        text: '❌ Failed to create alert. Please try again later.',
                    });
                }
                exports.setAlertStates.delete(String(telegramId));
                yield (0, menu_1.showMainMenu)(telegramId);
                return;
            }
            else {
                yield (0, telegram_1.sendTelegramMessage)({
                    chat_id: telegramId,
                    text: 'Alert creation cancelled.',
                });
                exports.setAlertStates.delete(String(telegramId));
                yield (0, menu_1.showMainMenu)(telegramId);
                return;
            }
        }
    });
}
