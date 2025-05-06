// src/priceMonitor.ts
// Periodically fetches forex prices, checks alerts, and triggers notifications
// Modular, type-safe, robust error handling, testable, follows global rules

import { getLatestForexPrice, ForexPrice } from './integrations/forex';
import { getUserByTelegramId, Alert, User, supabase } from './integrations/supabase';
import { processAlert } from './alertProcessor';
import logger from './logger';
import { subscriptionManager } from './services/subscriptionManager';

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
    // Check trigger condition (using mid price)
    let triggered = false;
    let directionToSet: 'above' | 'below' | null = null;
    if (alert.direction === null) {
      // Set direction based on latest price, do not trigger on this update
      directionToSet = priceData.mid < alert.target_price ? 'above' : 'below';
      await supabase.from('alerts').update({ direction: directionToSet }).eq('id', alert.id);
      logger.info(`[DirectionInit] Set direction for alert ${alert.id} to ${directionToSet} (price: ${priceData.mid}, target: ${alert.target_price})`);
      // Do not trigger on this update
      continue;
    } else {
      triggered =
        (alert.direction === 'above' && priceData.mid > alert.target_price) ||
        (alert.direction === 'below' && priceData.mid < alert.target_price);
    }
    if (triggered) {
      logger.info('Alert triggered: %o', alert);
      const user = await fetchUserImpl(alert.user_id);
      if (!user) {
        logger.error('User not found for alert %s', alert.id);
        continue;
      }
      // Use in-memory alert object for notification (no re-fetch)
      let notified = false;
      let lastError: string | null = null;
      let retryCount = typeof alert.retry_count === 'number' ? alert.retry_count : 0;
      for (; retryCount < MAX_RETRIES && !notified; retryCount++) {
        try {
          const result = await processAlertImpl(alert, user);
          if (result === true) {
            notified = true;
          } else if (typeof result === 'string') {
            lastError = result;
            logger.warn('Notification attempt %d failed for alert %s: %s', retryCount + 1, alert.id, result);
          } else {
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
        updateObj.notification_sent = true;
        // Remove subscription for this pair if needed
        try {
          subscriptionManager.removeAlertForPair(alert.pair, alert.id.toString());
        } catch (err) {
          logger.error(`[PriceMonitor] Failed to unsubscribe from ${alert.pair}: %o`, err);
        }
        const formattedPair = `${alert.pair.slice(0,3)}/${alert.pair.slice(3,6)}`;
        logger.info(`Alert closed: ${formattedPair} ${alert.direction} ${alert.target_price} for user ${alert.user_id}`);
      } else if (retryCount >= MAX_RETRIES) {
        updateObj.active = false;
        updateObj.last_failure_reason = lastError || 'Max retries exhausted';
        updateObj.notification_sent = false;
        logger.error('Alert %s failed after %d attempts. Marked as inactive.', alert.id, MAX_RETRIES);
        // Remove subscription for this pair if needed
        try {
          subscriptionManager.removeAlertForPair(alert.pair, alert.id.toString());
        } catch (err) {
          logger.error(`[PriceMonitor] Failed to unsubscribe from ${alert.pair}: %o`, err);
        }
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

// In-memory set to track recently triggered alerts and prevent duplicate triggers
const recentlyTriggeredAlerts = new Set<string>();

// Track which alerts are pending direction initialization (first fresh price after connection)
const pendingDirection: Map<string, boolean> = new Map();

export function createAlertCallback(
  alert: Alert,
  fetchUser: (user_id: string) => Promise<User | null>,
  processAlert: (alert: Alert, user: User) => Promise<boolean | string>
): (price: ForexPrice) => Promise<boolean> {
  // Mark alert as pending direction if direction is null
  if (alert.direction === null) {
    pendingDirection.set(alert.id.toString(), true);
  }
  return async (price: ForexPrice) => {
    // Short-circuit if this alert was just triggered (in-memory guard)
    if (recentlyTriggeredAlerts.has(alert.id.toString())) {
      return false;
    }
    // Fetch latest alert state to prevent duplicate triggers
    const { data: latestAlert, error } = await supabase
      .from('alerts')
      .select('active, direction')
      .eq('id', alert.id)
      .single();
    // Handle deleted/inactive alerts gracefully: do not log errors for expected not found
    if (error) {
      if (error.details && error.details.includes('0 rows')) {
        return false;
      }
      logger.error(`[AlertDebug] Unexpected error fetching alert state for ${alert.id}: %o`, error);
      return false;
    }
    if (!latestAlert || latestAlert.active === false) {
      return false;
    }
    // Only set direction on the first fresh price update after connection
    if (latestAlert.direction === null && pendingDirection.get(alert.id.toString())) {
      const directionToSet = price.mid < alert.target_price ? 'above' : 'below';
      await supabase.from('alerts').update({ direction: directionToSet }).eq('id', alert.id);
      pendingDirection.delete(alert.id.toString());
      logger.info(`[DirectionInit] Set direction for alert ${alert.id} to ${directionToSet} (price: ${price.mid}, target: ${alert.target_price})`);
      return false;
    }
    const triggered =
      (latestAlert.direction === 'above' && price.mid > alert.target_price) ||
      (latestAlert.direction === 'below' && price.mid < alert.target_price);
    if (triggered) {
      // Atomically mark alert as inactive in the DB before sending notifications
      const { data: updateResult, error: updateError } = await supabase
        .from('alerts')
        .update({ active: false })
        .eq('id', alert.id)
        .eq('active', true)
        .select('id');
      if (updateError) {
        logger.error(`[AlertTrigger] Failed to atomically deactivate alert ${alert.id}: %o`, updateError);
        return false;
      }
      if (!updateResult || updateResult.length === 0) {
        // Alert was already inactive, another process beat us to it
        return false;
      }
      recentlyTriggeredAlerts.add(alert.id.toString());
      try {
        subscriptionManager.removeAlertForPair(alert.pair, alert.id.toString());
      } catch (err) {
        logger.error(`[PriceMonitor] Failed to unsubscribe from ${alert.pair}: %o`, err);
      }
      const formattedPair = `${alert.pair.slice(0,3)}/${alert.pair.slice(3,6)}`;
      try {
        const user = await fetchUser(alert.user_id);
        if (!user) {
          logger.error('User not found for alert %s', alert.id);
          return false;
        }
        let notified = false;
        let lastError: string | null = null;
        let retryCount = typeof alert.retry_count === 'number' ? alert.retry_count : 0;
        for (; retryCount < 3 && !notified; retryCount++) {
          try {
            const result = await processAlert(alert, user);
            if (result === true) {
              notified = true;
            } else if (typeof result === 'string') {
              lastError = result;
              logger.warn('Notification attempt %d failed for alert %s: %s', retryCount + 1, alert.id, result);
            } else {
              lastError = 'Notification attempt failed (see logs for details)';
              logger.warn('Notification attempt %d failed for alert %s', retryCount + 1, alert.id);
            }
          } catch (err: any) {
            lastError = err?.message || String(err);
            logger.error('Notification error for alert %s (attempt %d): %o', alert.id, retryCount + 1, err);
          }
        }
        // Mark alert inactive and update DB (already done above)
        if (notified) {
          logger.info(`Alert closed: ${formattedPair} ${latestAlert.direction} ${alert.target_price} for user ${alert.user_id}`);
        }
      } catch (err) {
        logger.error('Error processing alert for %s: %o', alert.id, err);
        return false;
      }
      return true;
    }
    return false;
  };
}

/**
 * On startup, ensure all active pairs are subscribed and route price updates to alert logic.
 */
export async function initializeSubscriptions() {
  try {
    // Clear all in-memory subscriptions before re-adding
    subscriptionManager.clearAll();
    const alerts = await fetchActiveAlerts();
    // Group alerts by pair
    const pairToAlerts: Map<string, Alert[]> = new Map();
    for (const alert of alerts) {
      if (!pairToAlerts.has(alert.pair)) pairToAlerts.set(alert.pair, []);
      pairToAlerts.get(alert.pair)!.push(alert);
    }
    // Subscribe to each unique pair, with a handler that processes all alerts for that pair
    for (const [pair, alertsForPair] of pairToAlerts.entries()) {
      for (const alert of alertsForPair) {
        if (!alert.active) continue;
        subscriptionManager.addAlertForPair(pair, createAlertCallback(alert, fetchUser, processAlert), alert.id.toString());
      }
    }
    logger.info(`Initialized subscriptions for ${pairToAlerts.size} pairs.`);
  } catch (err) {
    logger.error('[SubscriptionManager] Failed to initialize subscriptions: %o', err);
  }
}

// ALERT PROCESSING PATHS: Only enable ONE of the following in production:
// 1. WebSocket-based real-time alerting (recommended, enabled by default)
// 2. Polling loop (monitorPrices) for fallback/testing only
//
// The polling loop is DISABLED by default to prevent duplicate alert processing and logs.
// To enable polling, uncomment the following lines (for testing/fallback only):
//
// if (require.main === module) {
//   setInterval(() => monitorPrices(), 60000);
// }

