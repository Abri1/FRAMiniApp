// src/priceMonitor.ts
// Periodically fetches forex prices, checks alerts, and triggers notifications
// Modular, type-safe, robust error handling, testable, follows global rules

import { getLatestForexPrice, ForexPrice } from './integrations/forex';
import { getUserByTelegramId, Alert, User, supabase } from './integrations/supabase';
import { processAlert } from './alertProcessor';
import logger from './logger';

/**
 * Fetch all active alerts from Supabase
 */
export async function fetchActiveAlerts(): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('active', true);
  if (error) {
    logger.error('Error fetching active alerts: %o', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch user by user_id
 */
export async function fetchUser(user_id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user_id)
    .single();
  if (error) {
    logger.error('Error fetching user %s: %o', user_id, error);
    return null;
  }
  return data as User;
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
export async function monitorPrices(deps?: {
  fetchActiveAlerts?: () => Promise<Alert[]>;
  fetchUser?: (user_id: string) => Promise<User | null>;
  getLatestForexPrice?: (from: string, to: string) => Promise<ForexPrice | null>;
  processAlert?: (alert: Alert, user: User) => Promise<boolean>;
}) {
  const {
    fetchActiveAlerts: fetchAlertsImpl = fetchActiveAlerts,
    fetchUser: fetchUserImpl = fetchUser,
    getLatestForexPrice: getLatestForexPriceImpl = getLatestForexPrice,
    processAlert: processAlertImpl = processAlert,
  } = deps || {};

  const MAX_RETRIES = 3;

  logger.info('Starting price monitoring loop...');
  const alerts = await fetchAlertsImpl();
  for (const alert of alerts) {
    // Fetch latest price for alert.pair
    const from = alert.pair.slice(0, 3);
    const to = alert.pair.slice(3, 6);
    const priceData: ForexPrice | null = await getLatestForexPriceImpl(from, to);
    if (!priceData) continue;
    // Check trigger condition
    const triggered =
      (alert.direction === 'above' && priceData.price > alert.target_price) ||
      (alert.direction === 'below' && priceData.price < alert.target_price);
    if (triggered) {
      logger.info('Alert triggered: %o', alert);
      const user = await fetchUserImpl(alert.user_id);
      if (!user) {
        logger.error('User not found for alert %s', alert.id);
        continue;
      }
      let notified = false;
      let lastError: string | null = null;
      let retryCount = typeof alert.retry_count === 'number' ? alert.retry_count : 0;
      for (; retryCount < MAX_RETRIES && !notified; retryCount++) {
        try {
          notified = await processAlertImpl(alert, user);
          if (!notified) {
            lastError = 'Notification attempt failed (see logs for details)';
            logger.warn('Notification attempt %d failed for alert %s', retryCount + 1, alert.id);
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          logger.error('Notification error for alert %s (attempt %d): %o', alert.id, retryCount + 1, err);
        }
      }
      // Prepare update object
      const updateObj: any = { retry_count: retryCount };
      if (notified) {
        updateObj.active = false;
        updateObj.last_failure_reason = null;
      } else if (retryCount >= MAX_RETRIES) {
        updateObj.active = false;
        updateObj.last_failure_reason = lastError || 'Max retries exhausted';
        logger.error('Alert %s failed after %d attempts. Marked as inactive.', alert.id, MAX_RETRIES);
      }
      try {
        await supabase.from('alerts').update(updateObj).eq('id', alert.id);
        if (notified) {
          logger.info('Alert %s marked as inactive after notification.', alert.id);
        }
      } catch (err) {
        logger.error('Failed to update alert %s after notification attempts: %o', alert.id, err);
      }
    }
  }
  logger.info('Price monitoring loop complete.');
}

// Example: run every 60 seconds (for demo/testing)
if (require.main === module) {
  setInterval(() => monitorPrices(), 60000);
}
