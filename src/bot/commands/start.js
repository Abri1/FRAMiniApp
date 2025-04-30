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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStartCommand = handleStartCommand;
const telegram_1 = require("../../integrations/telegram");
const supabase_1 = require("../../integrations/supabase");
const logger_1 = __importDefault(require("../../logger"));
/**
 * Handle the /start command
 * @param chat The chat object where the command was issued
 * @param user The Telegram user object
 * @param args Any arguments after the command
 * @returns Promise<void>
 */
function handleStartCommand(chat, user, args) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Handling /start command for user %d in chat %d', user.id, chat.id);
        try {
            // Check if user exists in the database
            let dbUser = yield (0, supabase_1.getUserByTelegramId)(user.id.toString());
            if (!dbUser) {
                // User not found, create a new user record
                logger_1.default.info('User %d not found in database, creating new user', user.id);
                const userData = {
                    telegram_id: user.id.toString(),
                    credits: 0,
                    phone_number: '' // Placeholder, to be updated by user if needed
                };
                const newUserId = yield (0, supabase_1.createUser)(userData);
                if (newUserId) {
                    logger_1.default.info('New user created with ID %s for Telegram ID %d', newUserId, user.id);
                    dbUser = Object.assign(Object.assign({}, userData), { id: newUserId, created_at: new Date().toISOString() });
                }
                else {
                    logger_1.default.error('Failed to create new user for Telegram ID %d', user.id);
                }
            }
            // Send welcome message
            const welcomeMessage = dbUser && dbUser.id
                ? `Welcome back! You have ${dbUser.credits} credits remaining. Use /help to see available commands.`
                : 'Welcome to Forex Ring Alerts! Use /help to see available commands.';
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: welcomeMessage
            });
        }
        catch (error) {
            logger_1.default.error('Error handling /start command for user %d: %o', user.id, error);
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: 'Sorry, an error occurred. Please try again later.'
            });
        }
    });
}
