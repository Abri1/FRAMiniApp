"use strict";
// src/bot/commands/info.ts
// Info flow for Telegram bot
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
exports.showInfo = showInfo;
const telegram_1 = require("../../integrations/telegram");
const logger_1 = __importDefault(require("../../logger"));
const menu_1 = require("../menu");
const supabase_1 = require("../../integrations/supabase");
/**
 * Show a detailed guide on how the bot works and how to use it
 */
function showInfo(telegramId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.default.info('showInfo called for %s', telegramId);
            const user = yield (0, supabase_1.getUserByTelegramId)(String(telegramId));
            yield (0, telegram_1.sendTelegramMessage)(Object.assign({ chat_id: telegramId, text: `ℹ️ *Forex Ring Alerts – User Guide*\n\nWelcome! Tap the buttons below to interact with the bot:\n\n🔲 *Menu Options*\n• Set Alert – Create a new forex price alert\n• View Alerts – List or manage your alerts\n• Credits – View your available credits\n• Info – Display this guide\n\n *How It Works*\n1️⃣ You choose a currency pair, target price, and direction\n2️⃣ The bot tracks live forex prices for you\n3️⃣ When your target is reached, you receive a voice call and Telegram alert\n4️⃣ Each alert uses 1 credit upon triggering\n\n💡 *Tip*\n• Use the menu buttons—no slash commands needed\n• Contact @abribooysen for support\n\nHappy trading! 🚀`, parse_mode: 'Markdown' }, (user && user.onboarded ? { reply_markup: menu_1.mainMenuKeyboard } : {})));
        }
        catch (err) {
            logger_1.default.error('showInfo error for %s: %o', telegramId, err);
        }
    });
}
