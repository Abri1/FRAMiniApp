import { subscribeToForexPrice, unsubscribeFromForexPrice, ForexPriceCallback } from '../integrations/forex';
import logger from '../logger';

// Tracks active alert counts and manages Polygon.io subscriptions
class SubscriptionManager {
  private pairCounts: Map<string, number> = new Map();
  private alertUnsubscribers: Map<string, () => void> = new Map(); // alertId -> unsubscribe fn
  private alertCallbacks: Map<string, ForexPriceCallback> = new Map(); // alertId -> callback

  /**
   * Add an alert for a pair. Subscribes if this is the first alert for the pair.
   * @param pair - e.g. 'EURUSD'
   * @param onPrice - callback for price updates
   * @param alertId - unique id for the alert
   */
  addAlertForPair(pair: string, onPrice: ForexPriceCallback, alertId: string) {
    const count = this.pairCounts.get(pair) || 0;
    this.pairCounts.set(pair, count + 1);
    if (this.alertUnsubscribers.has(alertId)) {
      // logger.warn(`[SubscriptionManager] Skipping duplicate subscription for alertId=${alertId}, pair=${pair}`);
      return;
    }
    // logger.info(`[SubscriptionManager] Adding subscription for alertId=${alertId}, pair=${pair}`);
    // Register callback for this alert
    const unsubscribe = subscribeToForexPrice(pair, onPrice);
    this.alertUnsubscribers.set(alertId, unsubscribe);
    this.alertCallbacks.set(alertId, onPrice);
  }

  /**
   * Remove an alert for a pair. Unsubscribes if this was the last alert for the pair.
   * @param pair - e.g. 'EURUSD'
   * @param alertId - unique id for the alert
   */
  removeAlertForPair(pair: string, alertId: string) {
    const count = this.pairCounts.get(pair) || 0;
    if (count <= 1) {
      this.pairCounts.delete(pair);
    } else {
      this.pairCounts.set(pair, count - 1);
    }
    // Remove callback for this alert
    const unsubscribe = this.alertUnsubscribers.get(alertId);
    if (unsubscribe) {
      unsubscribe();
      this.alertUnsubscribers.delete(alertId);
      this.alertCallbacks.delete(alertId);
    }
  }

  /**
   * For diagnostics/testing: get current count for a pair
   */
  getAlertCount(pair: string): number {
    return this.pairCounts.get(pair) || 0;
  }

  /**
   * Clear all in-memory subscriptions and callbacks (for startup/reload safety)
   */
  clearAll() {
    this.pairCounts.clear();
    this.alertUnsubscribers.forEach(unsub => unsub());
    this.alertUnsubscribers.clear();
    this.alertCallbacks.clear();
  }
}

// Export a singleton instance
export const subscriptionManager = new SubscriptionManager();

// TODO: Integrate addAlertForPair/removeAlertForPair into alert creation/deletion flows.
// TODO: On app startup, scan all active alerts and ensure subscriptions are in sync.
// TODO: Integrate with priceMonitor to route price updates to the correct alert logic. 