"use strict";
// src/bot/commands/createAlert.ts
// Handler for /createalert command - creates a new price alert
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
exports.handleCreateAlertCommand = handleCreateAlertCommand;
const telegram_1 = require("../../integrations/telegram");
const logger_1 = __importDefault(require("../../logger"));
// This import will need to be updated once Supabase integration is fully implemented
const supabase_1 = require("../../integrations/supabase");
// Supported currency pairs
const SUPPORTED_PAIRS = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
    'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
    'EURJPY', 'GBPJPY'
];
// Supported alert directions
const SUPPORTED_DIRECTIONS = ['above', 'below'];
// Regex to validate a proper price format (allows for up to 5 decimal places)
const PRICE_REGEX = /^\d+(\.\d{1,5})?$/;
/**
 * Handle the /createalert command
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param args Arguments after the command (should be: CURRENCY_PAIR DIRECTION PRICE)
 */
function handleCreateAlertCommand(chat, user, args) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Handling /createalert command for user %d with args: %s', user.id, args);
        // Parse the arguments
        const argsParts = args.trim().split(/\s+/);
        // Check if we have the correct number of arguments
        if (argsParts.length < 3) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: '⚠️ Please provide all required information in the format:\n' +
                    '`/createalert CURRENCY_PAIR DIRECTION PRICE`\n\n' +
                    'Example: `/createalert EURUSD above 1.2500`',
                parse_mode: 'Markdown'
            });
            return;
        }
        // Extract and validate the currency pair
        const pair = argsParts[0].toUpperCase();
        if (!SUPPORTED_PAIRS.includes(pair)) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: `⚠️ Sorry, "${pair}" is not a supported currency pair.\n\n` +
                    `Supported pairs: ${SUPPORTED_PAIRS.join(', ')}`,
                parse_mode: 'Markdown'
            });
            return;
        }
        // Extract and validate the direction
        const directionInput = argsParts[1].toLowerCase();
        if (!SUPPORTED_DIRECTIONS.includes(directionInput)) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: `⚠️ Sorry, "${directionInput}" is not a valid direction.\n\n` +
                    `Supported directions: ${SUPPORTED_DIRECTIONS.join(', ')}`,
                parse_mode: 'Markdown'
            });
            return;
        }
        const direction = directionInput;
        // Extract and validate the price
        const priceStr = argsParts[2];
        if (!PRICE_REGEX.test(priceStr)) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: `⚠️ Sorry, "${priceStr}" is not a valid price format.\n\n` +
                    'Please use a valid number with up to 5 decimal places.',
                parse_mode: 'Markdown'
            });
            return;
        }
        const price = parseFloat(priceStr);
        try {
            // Create the alert in the database
            const alertData = {
                user_id: String(user.id),
                pair,
                target_price: price,
                direction,
                active: true,
                notification_sent: false,
                retry_count: 0
            };
            const alertId = yield (0, supabase_1.createAlert)(alertData);
            if (!alertId) {
                throw new Error('Failed to create alert');
            }
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: `✅ Alert created successfully!\n\n` +
                    `*Alert Details:*\n` +
                    `Currency Pair: ${pair}\n` +
                    `Direction: ${direction}\n` +
                    `Target Price: ${price}\n` +
                    `Alert ID: ${alertId}\n\n` +
                    `You'll be notified when ${pair} goes ${direction} ${price}.`,
                parse_mode: 'Markdown'
            });
            logger_1.default.info('Created alert for user %d: %s %s %s', user.id, pair, direction, price);
        }
        catch (error) {
            logger_1.default.error('Failed to create alert: %o', error);
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: '⚠️ Sorry, there was an error creating your alert. Please try again later.',
                parse_mode: 'Markdown'
            });
        }
    });
}
