// src/integrations/forex.ts
// Polygon.io integration for Forex Ring Alerts
// Modular, type-safe, robust error handling, testable

import fetch from 'node-fetch';
import logger from '../logger';
import { loadConfig } from '../config';

const config = loadConfig();
const POLYGON_API_URL = config.forexApiUrl || 'https://api.polygon.io/v1';

export interface ForexPrice {
  pair: string;
  price: number;
  timestamp: string;
}

export type ForexPriceCallback = (price: ForexPrice) => void;

interface PolygonForexMessage {
  ev: string;
  p: number;
  c: string;
  t: number;
}

/**
 * Fetch the latest forex price for a currency pair (e.g., EURUSD) from Polygon.io
 * @param from - base currency (e.g., 'EUR')
 * @param to - quote currency (e.g., 'USD')
 */
export async function getLatestForexPrice(from: string, to: string): Promise<ForexPrice | null> {
  const symbol = `${from}${to}`.toUpperCase();
  const apiKey = config.forexApiKey || process.env.POLYGON_API_KEY;
  if (!apiKey) throw new Error('POLYGON_API_KEY not configured');
  const url = `${POLYGON_API_URL}/last/forex/${symbol}?apiKey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.error('Polygon.io API error: %s', res.statusText);
      return null;
    }
    const data = await res.json();
    if (!data || !data.last || typeof data.last.ask !== 'number') {
      logger.error('Unexpected Polygon.io response: %o', data);
      return null;
    }
    const price: ForexPrice = {
      pair: symbol,
      price: data.last.ask,
      timestamp: data.last.timestamp,
    };
    logger.info('Fetched Polygon.io price: %o', price);
    return price;
  } catch (err) {
    logger.error('Failed to fetch Polygon.io price: %o', err);
    return null;
  }
}

/**
 * Subscribe to real-time forex price updates via Polygon.io WebSocket.
 * @param pair - Currency pair, e.g. 'EUR/USD'
 * @param onPrice - Callback for price updates
 * @returns unsubscribe function
 */
export function subscribeToForexPrice(
  pair: string,
  onPrice: ForexPriceCallback,
  WebSocketCtor?: typeof WebSocket
): () => void {
  const apiKey = config.forexApiKey || process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not set in environment/config');
  }
  const WS = WebSocketCtor || WebSocket;
  const ws = new WS(config.forexApiUrl || 'wss://socket.polygon.io/forex');
  let isSubscribed = false;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  const channel = `C.${pair.replace('/', '')}`;

  function cleanup() {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
  }

  ws.onopen = () => {
    logger.info(`[Polygon] WebSocket opened for ${pair}`);
    ws.send(JSON.stringify({ action: 'auth', params: apiKey }));
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const messages = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
      for (const msg of messages) {
        if (msg.ev === 'status' && msg.status === 'auth_success') {
          ws.send(JSON.stringify({ action: 'subscribe', params: channel }));
          isSubscribed = true;
          logger.info(`[Polygon] Subscribed to ${channel}`);
        } else if (msg.ev === 'C') {
          const price: ForexPrice = {
            pair,
            price: msg.p,
            timestamp: String(msg.t),
          };
          onPrice(price);
        } else if (msg.ev === 'status' && msg.status === 'auth_failed') {
          logger.error('[Polygon] Auth failed');
          cleanup();
        }
      }
    } catch (err: unknown) {
      logger.error('[Polygon] Message parse error: %o', err);
    }
  };

  ws.onclose = (_event: CloseEvent) => {
    logger.warn(`[Polygon] WebSocket closed for ${pair}`);
    if (isSubscribed) {
      reconnectTimeout = setTimeout(() => {
        logger.info(`[Polygon] Reconnecting to ${pair}`);
        subscribeToForexPrice(pair, onPrice);
      }, 3000);
    }
  };

  ws.onerror = (err: Event) => {
    logger.error('[Polygon] WebSocket error: %o', err);
    cleanup();
  };

  return cleanup;
}
