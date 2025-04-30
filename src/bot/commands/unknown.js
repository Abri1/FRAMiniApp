"use strict";
// src/bot/commands/unknown.ts
// Handler for unknown commands - shows error message and help
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
exports.handleUnknownCommand = handleUnknownCommand;
const telegram_1 = require("../../integrations/telegram");
const logger_1 = __importDefault(require("../../logger"));
const help_1 = require("./help");
/**
 * Handle unknown commands
 * @param chat The chat where the command was sent
 * @param user The user who sent the command
 * @param command The unknown command that was entered
 */
function handleUnknownCommand(chat, user, command) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Handling unknown command "%s" for user %d', command, user.id);
        // Send error message
        yield (0, telegram_1.sendTelegramMessage)({
            chat_id: chat.id,
            text: `⚠️ Sorry, I don't understand the command "/${command}".`,
            parse_mode: 'Markdown'
        });
        // Show help message
        yield (0, help_1.handleHelpCommand)(chat, user, '');
    });
}
