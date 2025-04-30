"use strict";
// src/bot/commands/credits.ts
// Credits flow for Telegram bot
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
exports.showCredits = showCredits;
const telegram_1 = require("../../integrations/telegram");
const supabase_1 = require("../../integrations/supabase");
const menu_1 = require("../menu");
/**
 * Show the user's current credit balance and purchase instructions
 */
function showCredits(telegramId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield (0, supabase_1.getUserByTelegramId)(String(telegramId));
        if (!user) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '❌ Could not find your user record. Please try /start again.',
            });
            return;
        }
        yield (0, telegram_1.sendTelegramMessage)(Object.assign({ chat_id: telegramId, text: `💳 You currently have ${user.credits} credits available.\n\nTo purchase more credits, please contact @abribooysen` }, (user.onboarded ? { reply_markup: menu_1.mainMenuKeyboard } : {})));
    });
}
