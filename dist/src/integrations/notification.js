"use strict";
// src/integrations/notification.ts
// Notification integration for Forex Ring Alerts
// Modular, type-safe, robust error handling, testable, follows global rules
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.sendVoiceCall = sendVoiceCall;
exports.sendNotification = sendNotification;
// src/integrations/notification.ts
// Voice call notification integration for Forex Ring Alerts
// Modular, type-safe, robust error handling, testable, follows global rules
const twilio_1 = require("twilio");
const logger_1 = __importDefault(require("../logger"));
const config_1 = require("../config");
const config = (0, config_1.loadConfig)();
/**
 * Place a voice call via Twilio Programmable Voice
 * @param to - E.164 formatted phone number
 * @param message - Message to be spoken (will be converted to TwiML <Say>)
 * @returns true if call initiated, false otherwise
 */
function sendVoiceCall(to, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
            logger_1.default.error('Twilio config missing. Cannot place voice call.');
            return false;
        }
        try {
            const client = new twilio_1.Twilio(config.twilioAccountSid, config.twilioAuthToken);
            const twiml = `<Response><Say>${message}</Say></Response>`;
            const call = yield client.calls.create({
                twiml,
                to,
                from: config.twilioPhoneNumber,
            });
            logger_1.default.info('Placed voice call to %s (sid=%s)', to, call.sid);
            return true;
        }
        catch (err) {
            logger_1.default.error('Failed to place voice call via Twilio: %o', err);
            return false;
        }
    });
}
/**
 * Generic notification sender for voice (with Telegram fallback)
 * @param payload - VoiceNotificationPayload
 * @returns true if sent successfully, false otherwise
 */
function sendNotification(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (payload.channel === 'voice') {
            const called = yield sendVoiceCall(payload.to, payload.message);
            if (!called && payload.telegramFallbackChatId) {
                logger_1.default.warn('Voice call failed, falling back to Telegram for chat_id=%s', payload.telegramFallbackChatId);
                try {
                    // Dynamically import to avoid circular dep
                    const { sendTelegramMessage } = yield Promise.resolve().then(() => __importStar(require('./telegram')));
                    return yield sendTelegramMessage({
                        chat_id: payload.telegramFallbackChatId,
                        text: payload.message,
                    });
                }
                catch (err) {
                    logger_1.default.error('Telegram fallback failed: %o', err);
                    return false;
                }
            }
            return called;
        }
        else if (payload.channel === 'telegram') {
            try {
                const { sendTelegramMessage } = yield Promise.resolve().then(() => __importStar(require('./telegram')));
                return yield sendTelegramMessage({
                    chat_id: payload.to,
                    text: payload.message,
                });
            }
            catch (err) {
                logger_1.default.error('Failed to send Telegram message: %o', err);
                return false;
            }
        }
        else {
            logger_1.default.error('Unknown notification channel: %s', payload.channel);
            return false;
        }
    });
}
