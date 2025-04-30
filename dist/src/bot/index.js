"use strict";
// src/bot/index.ts
// Telegram bot command routing and message handling
// Main entry point for Telegram bot functionality
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
exports.processMessage = processMessage;
exports.processCallbackQuery = processCallbackQuery;
exports.handleUpdate = handleUpdate;
const logger_1 = __importDefault(require("../logger"));
const telegram_1 = require("../integrations/telegram");
const start_1 = require("./commands/start");
const help_1 = require("./commands/help");
const createAlert_1 = require("./commands/createAlert");
const listAlerts_1 = require("./commands/listAlerts");
const deleteAlert_1 = require("./commands/deleteAlert");
const unknown_1 = require("./commands/unknown");
const setAlert_1 = require("./flows/setAlert");
const viewAlerts_1 = require("./flows/viewAlerts");
const credits_1 = require("./commands/credits");
const info_1 = require("./commands/info");
const menu_1 = require("./menu");
const deleteAlert_2 = require("./flows/deleteAlert");
const editAlert_1 = require("./flows/editAlert");
const onboarding_1 = require("./flows/onboarding");
const supabase_1 = require("../integrations/supabase");
// In-memory map to track which user is editing which alert
const editAlertStates = new Map(); // telegramId -> alertId
// Command prefix
const COMMAND_PREFIX = '/';
// Map of command handlers
const commandHandlers = {
    'start': start_1.handleStartCommand,
    'help': help_1.handleHelpCommand,
    'createalert': createAlert_1.handleCreateAlertCommand,
    'listalerts': listAlerts_1.handleListAlertsCommand,
    'deletealert': deleteAlert_1.handleDeleteAlertCommand,
};
/**
 * Process a text message from Telegram
 * @param chat The chat object
 * @param user The user who sent the message
 * @param text The message text
 */
function processMessage(chat, user, text) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.default.info('Processing message from user %d: %s', user.id, text);
            // Check if this is a slash command
            if (text.startsWith(COMMAND_PREFIX)) {
                const fullCommand = text.substring(COMMAND_PREFIX.length);
                const [command, ...argArray] = fullCommand.split(' ');
                const commandName = command.toLowerCase().replace('@forexringalertsbot', '');
                const args = argArray.join(' ');
                // Execute command handler or fallback
                const handler = commandHandlers[commandName];
                if (handler) {
                    yield handler(chat, user, args);
                }
                else {
                    yield (0, unknown_1.handleUnknownCommand)(chat, user, commandName);
                }
                return;
            }
            else {
                const trimmed = text.trim();
                const trimmedLower = trimmed.toLowerCase();
                // Handle menu button presses
                if (trimmedLower === 'set alert') {
                    yield (0, setAlert_1.startSetAlertFlow)(chat.id);
                    return;
                }
                if (trimmedLower === 'view alerts') {
                    yield (0, viewAlerts_1.viewAlerts)(chat.id);
                    return;
                }
                if (trimmedLower === 'credits') {
                    yield (0, credits_1.showCredits)(chat.id);
                    return;
                }
                if (trimmedLower === 'info') {
                    yield (0, info_1.showInfo)(chat.id); // info handler now includes keyboard
                    return;
                }
                // Continue with onboarding or main menu logic
                // 1. If this looks like a phone number, treat as onboarding submission
                if (/^\+[1-9]\d{9,14}$/.test(trimmed)) {
                    yield (0, onboarding_1.handlePhoneNumberSubmission)(user.id, trimmed);
                    return;
                }
                // 2. Otherwise, fetch the user once to decide next step
                const dbUser = yield (0, supabase_1.getUserByTelegramId)(String(user.id));
                if (!dbUser || !dbUser.onboarded) {
                    // Re-prompt onboarding instructions
                    yield (0, start_1.handleStartCommand)(chat, user, '');
                    return;
                }
                // 3. User fully onboarded: show main menu
                yield (0, menu_1.showMainMenu)(user.id);
                return;
            }
        }
        catch (err) {
            logger_1.default.error('Error processing message: %o', err);
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: '⚠️ Sorry, an error occurred while processing your message. Please try again later.'
            });
        }
    });
}
/**
 * Process a callback query (inline button click)
 * @param queryId The callback query ID
 * @param user The user who clicked the button
 * @param data The callback data
 * @param chat Optional chat object
 */
function processCallbackQuery(queryId, user, data, chat) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.default.info('Processing callback query from user %d: %s', user.id, data);
            const [action, ...params] = data.split(':');
            switch (action) {
                case 'delete_alert':
                    if (chat && params[0]) {
                        yield (0, deleteAlert_2.deleteAlertById)(chat.id, params[0]);
                    }
                    break;
                case 'edit_alert':
                    if (chat && params[0]) {
                        editAlertStates.set(String(chat.id), params[0]);
                        yield (0, editAlert_1.editAlertById)(chat.id, params[0]);
                    }
                    break;
                default:
                    logger_1.default.warn('Unknown callback action: %s', action);
            }
        }
        catch (err) {
            logger_1.default.error('Error processing callback query: %o', err);
            if (chat) {
                yield (0, telegram_1.sendTelegramMessage)({
                    chat_id: chat.id,
                    text: '⚠️ Sorry, an error occurred while processing your request. Please try again later.'
                });
            }
        }
    });
}
/**
 * Main entry point for processing Telegram updates
 * @param update The Telegram update object
 */
function handleUpdate(update) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        logger_1.default.info('handleUpdate raw update: %o', update);
        const message = (_b = (_a = update.message) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.trim();
        const chatObj = (_c = update.message) === null || _c === void 0 ? void 0 : _c.chat;
        const userObj = (_d = update.message) === null || _d === void 0 ? void 0 : _d.from;
        // Route all text messages through processMessage for unified handling
        if (message && chatObj && userObj) {
            yield processMessage(chatObj, userObj, message);
            return;
        }
        // Process callback queries (inline button clicks)
        if (((_e = update.callback_query) === null || _e === void 0 ? void 0 : _e.data) && update.callback_query.from) {
            const chat = (_f = update.callback_query.message) === null || _f === void 0 ? void 0 : _f.chat;
            const { id: queryId, data } = update.callback_query;
            yield processCallbackQuery(queryId, update.callback_query.from, data, chat);
        }
    });
}
