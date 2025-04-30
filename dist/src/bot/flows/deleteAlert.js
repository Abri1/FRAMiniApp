"use strict";
// src/bot/flows/deleteAlert.ts
// Delete Alert flow for Telegram bot
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
exports.deleteAlertById = deleteAlertById;
const telegram_1 = require("../../integrations/telegram");
const supabase_1 = require("../../integrations/supabase");
const menu_1 = require("../menu");
/**
 * Delete an alert by ID and notify the user
 */
function deleteAlertById(telegramId, alertId) {
    return __awaiter(this, void 0, void 0, function* () {
        const alert = yield (0, supabase_1.getAlertById)(alertId);
        if (!alert) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '❌ Could not find the alert to delete.',
                reply_markup: menu_1.mainMenuKeyboard,
            });
            return;
        }
        const success = yield (0, supabase_1.deleteAlert)(alertId);
        if (success) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '✅ Alert deleted successfully.',
                reply_markup: menu_1.mainMenuKeyboard,
            });
        }
        else {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '❌ Failed to delete alert. Please try again later.',
                reply_markup: menu_1.mainMenuKeyboard,
            });
        }
    });
}
