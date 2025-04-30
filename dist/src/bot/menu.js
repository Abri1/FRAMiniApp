"use strict";
// src/bot/menu.ts
// Persistent main menu for Telegram bot
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
exports.mainMenuKeyboard = exports.MENU_BUTTONS = void 0;
exports.buildMainMenuKeyboard = buildMainMenuKeyboard;
exports.showMainMenu = showMainMenu;
const telegram_1 = require("../integrations/telegram");
exports.MENU_BUTTONS = [
    ['Set Alert', 'View Alerts'],
    ['Credits', 'Info'],
];
function buildMainMenuKeyboard() {
    return {
        keyboard: exports.MENU_BUTTONS.map(row => row.map(text => ({ text }))),
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: false,
    };
}
// Constant keyboard object for easy reuse
exports.mainMenuKeyboard = buildMainMenuKeyboard();
/**
 * Show the persistent main menu to the user with no prompt (just the keyboard).
 * @param telegramId Telegram user ID
 */
function showMainMenu(telegramId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, telegram_1.sendTelegramMessage)({
            chat_id: telegramId,
            text: '', // No prompt, just the keyboard
            reply_markup: exports.mainMenuKeyboard,
        });
    });
}
