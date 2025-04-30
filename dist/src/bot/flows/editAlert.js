"use strict";
// src/bot/flows/editAlert.ts
// Edit Alert flow for Telegram bot
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
exports.editAlertById = editAlertById;
exports.handleEditAlertStep = handleEditAlertStep;
const telegram_1 = require("../../integrations/telegram");
const supabase_1 = require("../../integrations/supabase");
const menu_1 = require("../menu");
/**
 * Edit an alert by ID (prompt for new price, update, and notify user)
 */
function editAlertById(telegramId, alertId) {
    return __awaiter(this, void 0, void 0, function* () {
        const alert = yield (0, supabase_1.getAlertById)(alertId);
        if (!alert) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '❌ Could not find the alert to edit.',
            });
            yield (0, menu_1.showMainMenu)(telegramId);
            return;
        }
        // For simplicity, prompt for new price only (extend to direction, pair, etc. as needed)
        yield (0, telegram_1.sendTelegramMessage)({
            chat_id: telegramId,
            text: `Editing alert for ${alert.pair} (${alert.direction} ${alert.target_price}).\n\nPlease enter the new target price:`,
        });
    });
}
/**
 * Handle the next step in the Edit Alert flow (user submits new price)
 */
function handleEditAlertStep(telegramId, alertId, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const price = parseFloat(message);
        if (isNaN(price) || price <= 0) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '❌ Invalid price. Please enter a valid number:',
            });
            return;
        }
        const success = yield (0, supabase_1.updateAlert)(alertId, { target_price: price });
        if (success) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '✅ Alert updated successfully.',
            });
        }
        else {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '❌ Failed to update alert. Please try again later.',
            });
        }
        yield (0, menu_1.showMainMenu)(telegramId);
    });
}
