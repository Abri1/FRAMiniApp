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
            // Check if this is a command
            if (text.startsWith(COMMAND_PREFIX)) {
                const fullCommand = text.substring(COMMAND_PREFIX.length);
                const [command, ...argArray] = fullCommand.split(' ');
                const commandName = command.toLowerCase().replace('@forexringalertsbot', '');
                const args = argArray.join(' ');
                // Look up command handler
                const handler = commandHandlers[commandName];
                if (handler) {
                    yield handler(chat, user, args);
                }
                else {
                    yield (0, unknown_1.handleUnknownCommand)(chat, user, commandName);
                }
            }
            else {
                // This is not a command, could be part of a command flow or just chat
                // For now, just respond with help message
                yield (0, help_1.handleHelpCommand)(chat, user, '');
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
 * @param messageId Optional message ID if available
 */
function processCallbackQuery(queryId, user, data, chat) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.default.info('Processing callback query from user %d: %s', user.id, data);
            // Format: action:param1:param2
            const [action, ...params] = data.split(':');
            // Handle different callback actions
            switch (action) {
                case 'delete_alert':
                    if (chat && params[0]) {
                        yield (0, deleteAlert_1.handleDeleteAlertCommand)(chat, user, params[0]);
                    }
                    break;
                // Add other callback actions as needed
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
        var _a, _b, _c;
        try {
            // Handle text messages and commands
            if (((_a = update.message) === null || _a === void 0 ? void 0 : _a.text) && update.message.chat && update.message.from) {
                yield processMessage(update.message.chat, update.message.from, update.message.text);
            }
            // Handle callback queries (button clicks)
            if (((_b = update.callback_query) === null || _b === void 0 ? void 0 : _b.data) && update.callback_query.from) {
                const chat = (_c = update.callback_query.message) === null || _c === void 0 ? void 0 : _c.chat;
                yield processCallbackQuery(update.callback_query.id, update.callback_query.from, update.callback_query.data, chat);
            }
        }
        catch (err) {
            logger_1.default.error('Error handling Telegram update: %o', err);
        }
    });
}
