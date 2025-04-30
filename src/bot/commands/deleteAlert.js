"use strict";
// src/bot/commands/deleteAlert.ts
// Handler for /deletealert command - removes a user's alert
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
exports.handleDeleteAlertCommand = handleDeleteAlertCommand;
const telegram_1 = require("../../integrations/telegram");
const logger_1 = __importDefault(require("../../logger"));
// This import will need to be updated once Supabase integration is fully implemented
const supabase_1 = require("../../integrations/supabase");
/**
 * Handle the /deletealert command
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param args Alert ID to delete
 */
function handleDeleteAlertCommand(chat, user, args) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Handling /deletealert command for user %d with args: %s', user.id, args);
        // Parse the arguments (expecting an alert ID)
        const alertId = args.trim();
        if (!alertId) {
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: '⚠️ Please provide an alert ID to delete.\n\n' +
                    'Example: `/deletealert ABC123`\n\n' +
                    'You can get your alert IDs by using the /listalerts command.',
                parse_mode: 'Markdown'
            });
            return;
        }
        try {
            // First check if the alert exists and belongs to this user
            const alert = yield (0, supabase_1.getAlertById)(alertId);
            if (!alert) {
                yield (0, telegram_1.sendTelegramMessage)({
                    chat_id: chat.id,
                    text: `⚠️ Alert with ID \`${alertId}\` not found.`,
                    parse_mode: 'Markdown'
                });
                return;
            }
            // Verify that the alert belongs to this user
            if (alert.user_id !== String(user.id)) {
                logger_1.default.warn('User %d attempted to delete alert %s belonging to another user', user.id, alertId);
                yield (0, telegram_1.sendTelegramMessage)({
                    chat_id: chat.id,
                    text: `⚠️ Alert with ID \`${alertId}\` not found.`,
                    parse_mode: 'Markdown'
                });
                return;
            }
            // Delete the alert
            yield (0, supabase_1.deleteAlert)(alertId);
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: `✅ Alert for ${alert.pair} ${alert.direction} ${alert.target_price} has been deleted.`,
                parse_mode: 'Markdown'
            });
            logger_1.default.info('Deleted alert %s for user %d', alertId, user.id);
        }
        catch (error) {
            logger_1.default.error('Failed to delete alert: %o', error);
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: chat.id,
                text: '⚠️ Sorry, there was an error deleting your alert. Please try again later.',
                parse_mode: 'Markdown'
            });
        }
    });
}
