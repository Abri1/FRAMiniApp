"use strict";
// src/bot/commands/start.ts
// Handler for the /start command
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
exports.handleStartCommand = handleStartCommand;
const telegram_1 = require("../../integrations/telegram");
const supabase_1 = require("../../integrations/supabase");
const menu_1 = require("../menu");
/**
 * Handle the /start command
 * @param chat The chat object where the command was issued
 * @param user The Telegram user object
 * @param args Any arguments after the command
 * @returns Promise<void>
 */
function handleStartCommand(chat, user, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const telegramId = user.id;
        const username = user.username || user.first_name || 'there';
        if (!telegramId)
            return;
        const dbUser = yield (0, supabase_1.getUserByTelegramId)(String(telegramId));
        if (!dbUser) {
            // New user: greet and start onboarding (NO menu keyboard)
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: `👋 *Welcome, ${username}!*\n\n` +
                    `This bot delivers *instant forex price alerts* via voice call and Telegram.\n\n` +
                    `*To get started:*\n\n` +
                    `1. Please type your phone number in *international format* (e.g. +1234567890).\n` +
                    `*We will never share your phone number.*\n\n` +
                    `Once your number is received, you'll be able to set alerts and access all features.\n\n` +
                    `_Thank you for joining Forex Ring Alerts!_`,
                parse_mode: 'Markdown',
            });
            return;
        }
        // Existing user: check onboarded status
        if (dbUser.onboarded) {
            // Onboarded: show menu
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: `👋 Welcome back, ${username}!\n\n` +
                    `You have *${dbUser.credits} credits* available.\n\n` +
                    `Use the menu below to set or manage your alerts.`,
                parse_mode: 'Markdown',
                reply_markup: menu_1.mainMenuKeyboard,
            });
            return;
        }
        else {
            // Not onboarded yet, prompt for phone number again (NO menu keyboard)
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: `👋 *Welcome, ${username}!*\n\n` +
                    `This bot delivers *instant forex price alerts* via voice call and Telegram.\n\n` +
                    `*To get started:*\n\n` +
                    `1. Please type your phone number in *international format* (e.g. +1234567890).\n` +
                    `*We will never share your phone number.*\n\n` +
                    `Once your number is received, you'll be able to set alerts and access all features.\n\n` +
                    `_Thank you for joining Forex Ring Alerts!_`,
                parse_mode: 'Markdown',
            });
            return;
        }
    });
}
