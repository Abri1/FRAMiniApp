"use strict";
// src/integrations/supabase.ts
// Supabase integration for Forex Ring Alerts
// Modular, type-safe, testable, robust error handling
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
exports.supabase = void 0;
exports.getUserByTelegramId = getUserByTelegramId;
exports.createAlert = createAlert;
exports.getAlertsByUserId = getAlertsByUserId;
exports.getAlertById = getAlertById;
exports.deleteAlert = deleteAlert;
exports.updateAlert = updateAlert;
exports.createUser = createUser;
exports.updateUserCredits = updateUserCredits;
exports.updateUserPhoneNumber = updateUserPhoneNumber;
exports.setUserOnboarded = setUserOnboarded;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../logger"));
const config = (0, config_1.loadConfig)();
// Ensure that sensitive data like Supabase URL and key are loaded from environment variables
exports.supabase = (0, supabase_js_1.createClient)(config.supabaseUrl || process.env.SUPABASE_URL || '', config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
/**
 * Fetch user by Telegram ID
 * @param telegramId The Telegram user ID
 * @returns The user record or null if not found
 */
function getUserByTelegramId(telegramId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield exports.supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                logger_1.default.info('No user found for Telegram ID %s (PGRST116): onboarding required.', telegramId);
            }
            else {
                logger_1.default.error('Supabase getUserByTelegramId error: %o', error);
            }
            return null;
        }
        return data;
    });
}
/**
 * Create a new alert for a user
 * @param alertData The alert data to create
 * @returns The created alert with its ID or null if error
 */
function createAlert(alertData) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield exports.supabase
            .from('alerts')
            .insert([alertData])
            .select('id')
            .single();
        if (error) {
            logger_1.default.error('Supabase createAlert error: %o', error);
            return null;
        }
        return data.id;
    });
}
/**
 * Get all alerts for a specific user
 * @param userId The user ID
 * @param activeOnly Whether to return only active alerts (default: true)
 * @returns Array of alerts or empty array if none/error
 */
function getAlertsByUserId(userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, activeOnly = true) {
        let query = exports.supabase
            .from('alerts')
            .select('*')
            .eq('user_id', userId);
        if (activeOnly) {
            query = query.eq('active', true);
        }
        const { data, error } = yield query.order('created_at', { ascending: false });
        if (error) {
            logger_1.default.error('Supabase getAlertsByUserId error: %o', error);
            return [];
        }
        return data;
    });
}
/**
 * Get a specific alert by ID
 * @param alertId The alert ID
 * @returns The alert or null if not found/error
 */
function getAlertById(alertId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield exports.supabase
            .from('alerts')
            .select('*')
            .eq('id', alertId)
            .single();
        if (error) {
            logger_1.default.error('Supabase getAlertById error: %o', error);
            return null;
        }
        return data;
    });
}
/**
 * Delete an alert by ID
 * @param alertId The alert ID to delete
 * @returns True if successful, false otherwise
 */
function deleteAlert(alertId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = yield exports.supabase
            .from('alerts')
            .delete()
            .eq('id', alertId);
        if (error) {
            logger_1.default.error('Supabase deleteAlert error: %o', error);
            return false;
        }
        return true;
    });
}
/**
 * Update an alert's status
 * @param alertId The alert ID to update
 * @param updates The properties to update
 * @returns True if successful, false otherwise
 */
function updateAlert(alertId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = yield exports.supabase
            .from('alerts')
            .update(updates)
            .eq('id', alertId);
        if (error) {
            logger_1.default.error('Supabase updateAlert error: %o', error);
            return false;
        }
        return true;
    });
}
/**
 * Create a new user
 * @param userData The user data to create
 * @returns The created user ID or null if error
 */
function createUser(userData) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield exports.supabase
            .from('users')
            .insert([userData])
            .select('id')
            .single();
        if (error) {
            logger_1.default.error('Supabase createUser error: %o', error);
            return null;
        }
        return data.id;
    });
}
/**
 * Update user credits
 * @param userId The user ID
 * @param newCredits The new credit balance
 * @returns True if successful, false otherwise
 */
function updateUserCredits(userId, newCredits) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = yield exports.supabase
            .from('users')
            .update({ credits: newCredits })
            .eq('id', userId);
        if (error) {
            logger_1.default.error('Supabase updateUserCredits error: %o', error);
            return false;
        }
        return true;
    });
}
/**
 * Update user's phone number
 * @param telegramId The Telegram user ID
 * @param phoneNumber The new phone number (E.164 format)
 * @returns True if successful, false otherwise
 */
function updateUserPhoneNumber(telegramId, phoneNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = yield exports.supabase
            .from('users')
            .update({ phone_number: phoneNumber })
            .eq('telegram_id', telegramId);
        if (error) {
            logger_1.default.error('Supabase updateUserPhoneNumber error: %o', error);
            return false;
        }
        return true;
    });
}
/**
 * Set user's onboarded status
 * @param telegramId The Telegram user ID
 * @param onboarded Boolean indicating if the user is onboarded
 * @returns True if successful, false otherwise
 */
function setUserOnboarded(telegramId, onboarded) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = yield exports.supabase
            .from('users')
            .update({ onboarded })
            .eq('telegram_id', telegramId);
        if (error) {
            logger_1.default.error('Supabase setUserOnboarded error: %o', error);
            return false;
        }
        return true;
    });
}
