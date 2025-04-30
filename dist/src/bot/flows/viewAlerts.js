"use strict";
// src/bot/flows/viewAlerts.ts
// View Alerts flow for Telegram bot
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
exports.viewAlerts = viewAlerts;
const telegram_1 = require("../../integrations/telegram");
const supabase_1 = require("../../integrations/supabase");
const menu_1 = require("../menu");
/**
 * Show all alerts for the user as individual cards/messages
 */
function viewAlerts(telegramId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield (0, supabase_1.getUserByTelegramId)(String(telegramId));
        if (!user) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '❌ Could not find your user record. Please try /start again.',
            });
            yield (0, menu_1.showMainMenu)(telegramId);
            return;
        }
        const alerts = yield (0, supabase_1.getAlertsByUserId)(user.id, false); // show all alerts
        if (!alerts.length) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: 'You have no alerts set up yet. Use "Set Alert" to create one!',
            });
            yield (0, menu_1.showMainMenu)(telegramId);
            return;
        }
        for (const alert of alerts) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: `🔔 Alert\nPair: ${alert.pair}\nPrice: ${alert.target_price}\nDirection: ${alert.direction}\nStatus: ${alert.active ? 'Active' : 'Inactive'}`,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Edit', callback_data: `edit_alert:${alert.id}` },
                            { text: 'Delete', callback_data: `delete_alert:${alert.id}` },
                        ],
                    ],
                },
            });
        }
        // showMainMenu removed; the persistent keyboard remains visible
    });
}
