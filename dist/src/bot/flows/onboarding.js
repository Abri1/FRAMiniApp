"use strict";
// src/bot/flows/onboarding.ts
// Onboarding flow for new users
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
exports.handlePhoneNumberSubmission = handlePhoneNumberSubmission;
const telegram_1 = require("../../integrations/telegram");
const supabase_1 = require("../../integrations/supabase");
const info_1 = require("../commands/info");
const logger_1 = __importDefault(require("../../logger"));
/**
 * Handle phone number submission during onboarding.
 * @param telegramId Telegram user ID
 * @param phoneNumber Phone number string (from contact or text)
 */
function handlePhoneNumberSubmission(telegramId, phoneNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('handlePhoneNumberSubmission called for %s with %s', telegramId, phoneNumber);
        // 2. Validate phone number (E.164/international format)
        if (!validatePhoneNumber(phoneNumber)) {
            logger_1.default.warn('Invalid phone number for %s: %s', telegramId, phoneNumber);
            yield (0, telegram_1.sendTelegramMessage)({
                chat_id: telegramId,
                text: '❌ Invalid phone number format. Please send your number in international format (e.g., +1234567890).',
            });
            return;
        }
        logger_1.default.info('Phone validated for %s', telegramId);
        // 3. Ensure user exists and onboard them
        let user = yield (0, supabase_1.getUserByTelegramId)(String(telegramId));
        if (!user) {
            const userId = yield (0, supabase_1.createUser)({
                telegram_id: String(telegramId),
                credits: 0,
                phone_number: phoneNumber,
                onboarded: true,
            });
            if (!userId) {
                logger_1.default.error('Failed to create user for Telegram ID %s during onboarding', telegramId);
                yield (0, telegram_1.sendTelegramMessage)({
                    chat_id: telegramId,
                    text: '❌ Failed to create your user record. Please try again or contact support.',
                });
                return;
            }
            logger_1.default.info('User created for %s', telegramId);
        }
        else {
            yield (0, supabase_1.updateUserPhoneNumber)(String(telegramId), phoneNumber);
            yield (0, supabase_1.setUserOnboarded)(String(telegramId), true);
            logger_1.default.info('User updated for %s', telegramId);
        }
        // 4. Show info page (user guide)
        logger_1.default.info('Calling showInfo for %s', telegramId);
        yield (0, info_1.showInfo)(telegramId);
        logger_1.default.info('Onboarding complete for %s', telegramId);
    });
}
/**
 * Validate phone number (E.164/international format)
 */
function validatePhoneNumber(phone) {
    // Simple E.164 regex: starts with +, then 10-15 digits
    return /^\+[1-9]\d{9,14}$/.test(phone);
}
