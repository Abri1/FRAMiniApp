"use strict";
// src/bot/commands/listAlerts.ts
// Handler for /listalerts command - displays user's active alerts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleListAlertsCommand = handleListAlertsCommand;
const telegram_1 = require("../../integrations/telegram");
const logger_1 = __importDefault(require("../../logger"));
const supabase_1 = require("../../integrations/supabase");
const menu_1 = require("../menu");
/**
 * Handle the /listalerts command
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param args Any arguments after the command (not used for this command)
 */
function handleListAlertsCommand(chat, user, args) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Handling /listalerts command for user %d', user.id);
        try {
            // Get all active alerts for this user from the database
            const alerts = yield (0, supabase_1.getAlertsByUserId)(String(user.id));
            const dbUser = yield (0, supabase_1.getUserByTelegramId)(String(user.id));
            if (!alerts || alerts.length === 0) {
                yield (0, telegram_1.sendTelegramMessage)(Object.assign({ chat_id: chat.id, text: '📝 You don\'t have any active alerts.\n\nCreate one with the /createalert command!', parse_mode: 'Markdown' }, (dbUser && dbUser.onboarded ? { reply_markup: menu_1.mainMenuKeyboard } : {})));
                return;
            }
            // Construct the message with all alerts
            let message = '*Your Active Alerts:*\n\n';
            alerts.forEach((alert, index) => {
                message += `*${index + 1}. ${alert.pair}*\n`;
                message += `   Direction: ${alert.direction}\n`;
                message += `   Target Price: ${alert.target_price}\n`;
                message += `   Alert ID: \`${alert.id}\`\n\n`;
            });
            message += 'To delete an alert, use `/deletealert ALERT_ID`';
            yield (0, telegram_1.sendTelegramMessage)(Object.assign({ chat_id: chat.id, text: message, parse_mode: 'Markdown' }, (dbUser && dbUser.onboarded ? { reply_markup: menu_1.mainMenuKeyboard } : {})));
        }
        catch (error) {
            logger_1.default.error('Failed to fetch alerts: %o', error);
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: '⚠️ Sorry, there was an error fetching your alerts. Please try again later.',
                parse_mode: 'Markdown'
            });
        }
    });
}
