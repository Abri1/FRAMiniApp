"use strict";
// src/alertProcessor.ts
// Processes triggered alerts and notifies users via voice call (Twilio) with Telegram fallback
// Modular, type-safe, robust error handling, testable, follows global rules
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
exports.processAlert = processAlert;
const notification_1 = require("./integrations/notification");
const logger_1 = __importDefault(require("./logger"));
/**
 * Process a triggered alert for a user: place a voice call, fallback to Telegram if needed
 * @param alert - The triggered alert object
 * @param user - The user to notify (must have phone and Telegram ID)
 * @returns true if notification sent successfully, false otherwise
 */
function processAlert(alert, user) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!user || !user.id || !user.telegram_id) {
            logger_1.default.error('Invalid user for alert processing: %o', user);
            return false;
        }
        if (!user.phone_number) {
            logger_1.default.error('User %s has no phone number for voice call', user.id);
            return false;
        }
        const message = `Forex Alert: ${alert.pair} is now ${alert.direction} ${alert.target_price}.`;
        try {
            const sent = yield (0, notification_1.sendNotification)({
                to: user.phone_number,
                message,
                channel: 'voice',
                telegramFallbackChatId: user.telegram_id,
            });
            if (sent) {
                logger_1.default.info('Alert notification sent for alert %s to user %s', alert.id, user.id);
            }
            else {
                logger_1.default.error('Failed to notify user %s for alert %s', user.id, alert.id);
            }
            return sent;
        }
        catch (err) {
            logger_1.default.error('processAlert error: %o', err);
            return false;
        }
    });
}
