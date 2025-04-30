"use strict";
// src/api/webhook.ts
// Telegram webhook handler to receive updates from Telegram API
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
exports.handleTelegramWebhook = handleTelegramWebhook;
const telegram_1 = require("../integrations/telegram");
const logger_1 = __importDefault(require("../logger"));
const config_1 = require("../config");
const config = (0, config_1.loadConfig)();
/**
 * Process Telegram webhook request
 * This function would be called by your HTTP server framework (Express, Fastify, etc.)
 * @param body The request body containing the Telegram update
 * @returns Promise resolving after update is processed
 */
function handleTelegramWebhook(body) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validate the webhook request
            if (!body || typeof body !== 'object') {
                logger_1.default.warn('Invalid webhook request body: %o', body);
                return;
            }
            // Type assert and process the update
            const update = body;
            if (!update.update_id) {
                logger_1.default.warn('Missing update_id in webhook data: %o', update);
                return;
            }
            // Process the update
            yield (0, telegram_1.processUpdate)(update);
            logger_1.default.info('Successfully processed webhook update %d', update.update_id);
        }
        catch (err) {
            logger_1.default.error('Error handling webhook request: %o', err);
        }
    });
}
/**
 * Example Express.js route handler implementation
 * This is for documentation - implement as needed for your HTTP framework
 *
 * app.post('/telegram/webhook', (req, res) => {
 *   // Process the webhook asynchronously
 *   handleTelegramWebhook(req.body)
 *     .catch(err => logger.error('Unhandled webhook error: %o', err));
 *
 *   // Always respond with 200 OK to Telegram quickly
 *   res.status(200).send('OK');
 * });
 */ 
