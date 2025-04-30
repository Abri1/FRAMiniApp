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
const menu_1 = require("../menu");
/**
 * Handle the /help command
 * @param chat The chat object where the command was issued
 * @param user The Telegram user object
 * @param args Any arguments after the command
 * @returns Promise<void>
 */
function handleHelpCommand(chat, user, args) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Handling /help command for user %d', user.id);
        const helpMessage = `*Forex Ring Alerts Help*

` +
            `Use the following commands:
` +
            `/start - Start the bot or re-register
` +
            `/createalert - Create a new price alert
` +
            `/listalerts - List your active alerts
` +
            `/deletealert - Delete an alert
` +
            `/help - Show this help message

` +
            `All commands must be sent as plain text. If you have any issues, contact support.`;
        yield (0, telegram_1.sendTelegramMessage)({
            chat_id: chat.id,
            text: helpMessage,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: menu_1.mainMenuKeyboard,
        });
    });
}
