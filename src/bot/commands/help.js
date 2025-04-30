"use strict";
// src/bot/commands/help.ts
// Handler for /help command - shows available commands and usage
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
exports.handleHelpCommand = handleHelpCommand;
const telegram_1 = require("../../integrations/telegram");
const logger_1 = __importDefault(require("../../logger"));
/**
 * Handle the /help command
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param args Any arguments after the command
 */
function handleHelpCommand(chat, user, args) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Handling /help command for user %d', user.id);
        const helpMessage = `
*Forex Ring Alerts - Help*

*Available Commands:*

📈 */createalert* - Create a new price alert
Format: \`/createalert CURRENCY_PAIR DIRECTION PRICE\`
Example: \`/createalert EURUSD above 1.2500\`
Supported directions: above, below

📋 */listalerts* - View your active alerts
Shows all your currently active price alerts

❌ */deletealert* - Remove an alert
Format: \`/deletealert ALERT_ID\`
You can get the ALERT_ID from /listalerts

ℹ️ */help* - Show this help message

*Subscription Info:*
Free users receive alerts via Telegram
Premium subscribers receive voice call alerts for immediate notification

Need assistance? Contact support at support@forexringalerts.com
  `;
        yield (0, telegram_1.sendTelegramMessage)({
            chat_id: chat.id,
            text: helpMessage,
            parse_mode: 'Markdown'
        });
    });
}
