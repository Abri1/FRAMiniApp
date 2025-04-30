"use strict";
// src/priceMonitor.ts
// Periodically fetches forex prices, checks alerts, and triggers notifications
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
exports.fetchActiveAlerts = fetchActiveAlerts;
exports.fetchUser = fetchUser;
exports.monitorPrices = monitorPrices;
const forex_1 = require("./integrations/forex");
const supabase_1 = require("./integrations/supabase");
const alertProcessor_1 = require("./alertProcessor");
const logger_1 = __importDefault(require("./logger"));
/**
 * Fetch all active alerts from Supabase
 */
function fetchActiveAlerts() {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield supabase_1.supabase
            .from('alerts')
            .select('*')
            .eq('active', true);
        if (error) {
            logger_1.default.error('Error fetching active alerts: %o', error);
            return [];
        }
        return data || [];
    });
}
/**
 * Fetch user by user_id
 */
function fetchUser(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield supabase_1.supabase
            .from('users')
            .select('*')
            .eq('id', user_id)
            .single();
        if (error) {
            logger_1.default.error('Error fetching user %s: %o', user_id, error);
            return null;
        }
        return data;
    });
}
/**
 * Main price monitoring loop
 * @param deps - Dependency injection for testability (optional)
 *   fetchActiveAlerts: () => Promise<Alert[]>
 *   fetchUser: (user_id: string) => Promise<User | null>
 *   getLatestForexPrice: (from: string, to: string) => Promise<ForexPrice | null>
 *   processAlert: (alert: Alert, user: User) => Promise<boolean>
 */
/**
 * Main price monitoring loop with notification retry logic.
 * @param deps - Dependency injection for testability (optional)
 *   fetchActiveAlerts: () => Promise<Alert[]>
 *   fetchUser: (user_id: string) => Promise<User | null>
 *   getLatestForexPrice: (from: string, to: string) => Promise<ForexPrice | null>
 *   processAlert: (alert: Alert, user: User) => Promise<boolean>
 */
function monitorPrices(deps) {
    return __awaiter(this, void 0, void 0, function* () {
        const { fetchActiveAlerts: fetchAlertsImpl = fetchActiveAlerts, fetchUser: fetchUserImpl = fetchUser, getLatestForexPrice: getLatestForexPriceImpl = forex_1.getLatestForexPrice, processAlert: processAlertImpl = alertProcessor_1.processAlert, } = deps || {};
        const MAX_RETRIES = 3;
        logger_1.default.info('Starting price monitoring loop...');
        const alerts = yield fetchAlertsImpl();
        for (const alert of alerts) {
            // Fetch latest price for alert.pair
            const from = alert.pair.slice(0, 3);
            const to = alert.pair.slice(3, 6);
            const priceData = yield getLatestForexPriceImpl(from, to);
            if (!priceData)
                continue;
            // Check trigger condition
            const triggered = (alert.direction === 'above' && priceData.price > alert.target_price) ||
                (alert.direction === 'below' && priceData.price < alert.target_price);
            if (triggered) {
                logger_1.default.info('Alert triggered: %o', alert);
                const user = yield fetchUserImpl(alert.user_id);
                if (!user) {
                    logger_1.default.error('User not found for alert %s', alert.id);
                    continue;
                }
                let notified = false;
                let lastError = null;
                let retryCount = typeof alert.retry_count === 'number' ? alert.retry_count : 0;
                for (; retryCount < MAX_RETRIES && !notified; retryCount++) {
                    try {
                        notified = yield processAlertImpl(alert, user);
                        if (!notified) {
                            lastError = 'Notification attempt failed (see logs for details)';
                            logger_1.default.warn('Notification attempt %d failed for alert %s', retryCount + 1, alert.id);
                        }
                    }
                    catch (err) {
                        lastError = (err === null || err === void 0 ? void 0 : err.message) || String(err);
                        logger_1.default.error('Notification error for alert %s (attempt %d): %o', alert.id, retryCount + 1, err);
                    }
                }
                // Prepare update object
                const updateObj = { retry_count: retryCount };
                if (notified) {
                    updateObj.active = false;
                    updateObj.last_failure_reason = null;
                }
                else if (retryCount >= MAX_RETRIES) {
                    updateObj.active = false;
                    updateObj.last_failure_reason = lastError || 'Max retries exhausted';
                    logger_1.default.error('Alert %s failed after %d attempts. Marked as inactive.', alert.id, MAX_RETRIES);
                }
                try {
                    yield supabase_1.supabase.from('alerts').update(updateObj).eq('id', alert.id);
                    if (notified) {
                        logger_1.default.info('Alert %s marked as inactive after notification.', alert.id);
                    }
                }
                catch (err) {
                    logger_1.default.error('Failed to update alert %s after notification attempts: %o', alert.id, err);
                }
            }
        }
        logger_1.default.info('Price monitoring loop complete.');
    });
}
// Example: run every 60 seconds (for demo/testing)
if (require.main === module) {
    setInterval(() => monitorPrices(), 60000);
}
