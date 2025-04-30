"use strict";
// src/integrations/telegram.ts
// Telegram Bot API integration for Forex Ring Alerts
// Follows global rules: modular, testable, robust error handling
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
exports.sendTelegramMessage = sendTelegramMessage;
exports.setTelegramWebhook = setTelegramWebhook;
exports.getWebhookInfo = getWebhookInfo;
exports.getBotInfo = getBotInfo;
exports.deleteWebhook = deleteWebhook;
exports.processUpdate = processUpdate;
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_1 = __importDefault(require("../logger"));
const config_1 = require("../config");
const config = (0, config_1.loadConfig)();
const TELEGRAM_API_URL = `https://api.telegram.org/bot${config.telegramBotToken}`;
/**
 * Send a message via Telegram Bot API
 * @param options Message options including chat_id and text
 * @returns Promise resolving to success status
 */
function sendTelegramMessage(options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield (0, node_fetch_1.default)(`${TELEGRAM_API_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options),
            });
            const data = yield res.json();
            if (!data.ok) {
                logger_1.default.error('Telegram API error: %s', data.description);
                return false;
            }
            logger_1.default.info('Sent Telegram message to chat_id=%s', options.chat_id);
            return true;
        }
        catch (err) {
            logger_1.default.error('Failed to send Telegram message: %o', err);
            return false;
        }
    });
}
/**
 * Set up a webhook for receiving Telegram updates
 * @param options Webhook configuration options
 * @returns Promise resolving to success status
 */
function setTelegramWebhook(options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield (0, node_fetch_1.default)(`${TELEGRAM_API_URL}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options),
            });
            const data = yield res.json();
            if (!data.ok) {
                logger_1.default.error('Failed to set Telegram webhook: %s', data.description);
                return false;
            }
            logger_1.default.info('Successfully set Telegram webhook to: %s', options.url);
            return true;
        }
        catch (err) {
            logger_1.default.error('Error setting Telegram webhook: %o', err);
            return false;
        }
    });
}
/**
 * Get current webhook status
 * @returns Promise resolving to webhook info
 */
function getWebhookInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield (0, node_fetch_1.default)(`${TELEGRAM_API_URL}/getWebhookInfo`);
            const data = yield res.json();
            if (!data.ok) {
                logger_1.default.error('Failed to get webhook info: %s', data.description);
                return null;
            }
            return data.result;
        }
        catch (err) {
            logger_1.default.error('Error getting webhook info: %o', err);
            return null;
        }
    });
}
/**
 * Get current bot information
 * @returns Promise resolving to bot info
 */
function getBotInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield (0, node_fetch_1.default)(`${TELEGRAM_API_URL}/getMe`);
            const data = yield res.json();
            if (!data.ok) {
                logger_1.default.error('Failed to get bot info: %s', data.description);
                return null;
            }
            return data.result;
        }
        catch (err) {
            logger_1.default.error('Error getting bot info: %o', err);
            return null;
        }
    });
}
/**
 * Delete the current webhook
 * @param dropPendingUpdates Whether to drop all pending updates
 * @returns Promise resolving to success status
 */
function deleteWebhook() {
    return __awaiter(this, arguments, void 0, function* (dropPendingUpdates = false) {
        try {
            const res = yield (0, node_fetch_1.default)(`${TELEGRAM_API_URL}/deleteWebhook?drop_pending_updates=${dropPendingUpdates}`);
            const data = yield res.json();
            if (!data.ok) {
                logger_1.default.error('Failed to delete webhook: %s', data.description);
                return false;
            }
            logger_1.default.info('Successfully deleted Telegram webhook');
            return true;
        }
        catch (err) {
            logger_1.default.error('Error deleting webhook: %o', err);
            return false;
        }
    });
}
/**
 * Process a Telegram update object
 * This is a bridge function to be called by the webhook handler
 * @param update The update object from Telegram
 * @returns Promise resolving after update is processed
 */
function processUpdate(update) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.default.info('Processing Telegram update: %o', { update_id: update.update_id });
            // Lazy-load the bot handler to avoid circular dependencies
            const { handleUpdate } = yield Promise.resolve().then(() => __importStar(require('../bot')));
            yield handleUpdate(update);
        }
        catch (err) {
            logger_1.default.error('Error processing Telegram update: %o', err);
        }
    });
}
// TODO: Add webhook registration and handler utilities as needed
