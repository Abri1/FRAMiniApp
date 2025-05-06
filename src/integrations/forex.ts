// src/integrations/forex.ts
// Polygon.io integration for Forex Ring Alerts
// Modular, type-safe, robust error handling, testable

import fetch from 'node-fetch';
import logger from '../logger';
import { loadConfig } from '../config';
import fs from 'fs/promises';
import path from 'path';
import { format, toZonedTime } from 'date-fns-tz';
import WebSocket, { MessageEvent, CloseEvent, ErrorEvent } from 'ws';

const FOREX_PAIRS_CACHE_PATH = path.join(__dirname, '../cache/forex_pairs_cache.json');

export interface ForexPrice {
  pair: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: string;
}

type MaybePromise<T> = T | Promise<T>;
export type ForexPriceCallback = (price: ForexPrice) => MaybePromise<boolean>;

interface PolygonForexMessage {
  ev: string;
  p: number;
  c: string;
  t: number;
}

// --- Singleton WebSocket for all forex subscriptions ---

// Map: pair (e.g. 'EURUSD') -> Set of callbacks
const pairListeners: Map<string, Set<ForexPriceCallback>> = new Map();
let ws: WebSocket | null = null;
let isAuth = false;
let isConnecting = false;
let reconnectTimeout: NodeJS.Timeout | null = null;

// --- Consolidated price logging ---
// Map: pair (e.g. 'EURUSD') -> latest mid price
const latestPrices: Map<string, number> = new Map();

function calculateMid(bid: number, ask: number): number {
  return (bid + ask) / 2;
}

function getPairDecimals(pair: string): number {
  // JPY quote pairs: 3 decimals, all others: 5 decimals
  const quote = pair.slice(3, 6).toUpperCase();
  return quote === 'JPY' ? 3 : 5;
}

// Start a single interval for consolidated logging
setInterval(() => {
  if (latestPrices.size === 0) return;
  let log = 'Price Update:';
  for (const [pair, price] of latestPrices.entries()) {
    const formatted = `${pair.slice(0,3)}/${pair.slice(3,6)}`;
    const decimals = getPairDecimals(pair);
    log += `\n${formatted}: ${price.toFixed(decimals)}`;
  }
  logger.info(log);
}, 5000);

// Returns both quote and aggregate channels for a pair
function getChannels(pair: string): string[] {
  const formatted = `${pair.slice(0,3)}/${pair.slice(3,6)}`;
  return [`C.${formatted}`, `CA.${formatted}`];
}

function getConfig() {
  // Always get fresh config and env
  const config = loadConfig();
  return {
    POLYGON_API_URL: config.forexApiUrl || 'https://api.polygon.io', // No trailing /v1
    WS_URL: config.forexApiUrl || 'wss://socket.polygon.io/forex',
    apiKey: config.forexApiKey || process.env.POLYGON_API_KEY,
  };
}

function ensureWebSocket(WebSocketCtor: typeof WebSocket = WebSocket) {
  const { WS_URL, apiKey } = getConfig();
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  if (isConnecting) return;
  isConnecting = true;
  ws = new WebSocketCtor(WS_URL);
  ws.onopen = () => {
    logger.info('WebSocket opened');
    ws!.send(JSON.stringify({ action: 'auth', params: apiKey }));
  };
  ws.onmessage = (event: MessageEvent) => {
    try {
      const messages = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
      for (const msg of messages) {
        if (msg.ev === 'status' && msg.status === 'auth_success') {
          isAuth = true;
          logger.info('WebSocket authenticated');
          // Re-subscribe to all active pairs (both channels)
          for (const pair of pairListeners.keys()) {
            const channels = getChannels(pair);
            ws!.send(JSON.stringify({ action: 'subscribe', params: channels.join(',') }));
            logger.info(`Re-subscribed to ${channels.join(',')}`);
          }
        } else if (msg.ev === 'C') {
          // Price update
          const pair = msg.p ? msg.p : undefined; // use msg.p for 'EUR/USD'
          const bid = typeof msg.b === 'number' ? msg.b : NaN;
          const ask = typeof msg.a === 'number' ? msg.a : NaN;
          const mid = calculateMid(bid, ask);
          const price: ForexPrice = {
            pair: pair ? pair.replace('/', '') : '',
            bid,
            ask,
            mid,
            timestamp: String(msg.t),
          };
          // --- Update latest price for consolidated logging ---
          if (pair && !isNaN(mid)) {
            latestPrices.set(price.pair, mid);
          }
          // --- END consolidated logging update ---
          // Route to all listeners for this pair, but only remove callback if alert is triggered
          const listeners = pairListeners.get(price.pair);
          if (listeners) {
            // Create a new set to avoid mutation during iteration
            const listenersCopy = new Set(listeners);
            for (const cb of listenersCopy) {
              try {
                const result = cb(price);
                const isPromise = result && typeof (result as any).then === 'function';
                if (isPromise) {
                  (result as Promise<boolean>).then((triggered: boolean) => {
                    if (triggered === true) listeners.delete(cb);
                  }).catch((err: any) => logger.error('[Polygon] Listener error: %o', err));
                } else {
                  if (result === true) listeners.delete(cb);
                }
              } catch (err) {
                logger.error('[Polygon] Listener error: %o', err);
              }
            }
            // If no listeners remain, clean up
            if (listeners.size === 0) {
              pairListeners.delete(price.pair);
              latestPrices.delete(price.pair); // Ensure price logs stop for this asset
              if (isAuth && ws && ws.readyState === WebSocket.OPEN) {
                const channels = getChannels(price.pair);
                ws.send(JSON.stringify({ action: 'unsubscribe', params: channels.join(',') }));
                logger.info(`Unsubscribed: ${price.pair}`);
              }
            }
          }
        } else if (msg.ev === 'status' && msg.status === 'auth_failed') {
          logger.error('Auth failed');
          ws!.close();
        }
      }
    } catch (err) {
      logger.error('Message parse error: %o', err);
    }
  };
  ws.onclose = (_event: CloseEvent) => {
    logger.warn('WebSocket closed');
    isAuth = false;
    isConnecting = false;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
    if (pairListeners.size > 0) {
      reconnectTimeout = setTimeout(() => {
        logger.info('Reconnecting WebSocket');
        ensureWebSocket();
      }, 3000);
    } else {
      // No pairs left: clear all latest prices to prevent stale logs
      latestPrices.clear();
    }
  };
  ws.onerror = (err: ErrorEvent) => {
    logger.error('WebSocket error: %o', err);
    ws?.close();
  };
}

/**
 * Subscribe to real-time forex price updates for a pair (singleton connection).
 * @param pair - e.g. 'EURUSD'
 * @param onPrice - callback
 */
export function subscribeToForexPrice(pair: string, onPrice: ForexPriceCallback, WebSocketCtor?: typeof WebSocket) {
  const upperPair = pair.toUpperCase();
  let listeners = pairListeners.get(upperPair);
  if (!listeners) {
    listeners = new Set();
    pairListeners.set(upperPair, listeners);
  }
  listeners.add(onPrice);
  ensureWebSocket(WebSocketCtor);
  const { apiKey } = getConfig();
  if (!apiKey) throw new Error('POLYGON_API_KEY not configured');
  if (isAuth && ws && ws.readyState === WebSocket.OPEN) {
    const channels = getChannels(upperPair);
    ws.send(JSON.stringify({ action: 'subscribe', params: channels.join(',') }));
    logger.info(`Subscribed to ${channels.join(',')} (singleton)`);
  }
  // Return unsubscribe function
  return () => unsubscribeFromForexPrice(upperPair, onPrice);
}

/**
 * Unsubscribe a callback from a pair. If no listeners remain, unsubscribe from Polygon.
 */
export function unsubscribeFromForexPrice(pair: string, onPrice: ForexPriceCallback) {
  const upperPair = pair.toUpperCase();
  const listeners = pairListeners.get(upperPair);
  if (listeners) {
    const hadCallback = listeners.has(onPrice);
    listeners.delete(onPrice);
    if (listeners.size === 0) {
      pairListeners.delete(upperPair);
      latestPrices.delete(upperPair); // Ensure price logs stop for this asset
      if (isAuth && ws && ws.readyState === WebSocket.OPEN) {
        const channels = getChannels(upperPair);
        ws.send(JSON.stringify({ action: 'unsubscribe', params: channels.join(',') }));
        logger.info(`Unsubscribed: ${upperPair}`);
      }
    }
  }
  // If no pairs left, close the WebSocket
  if (pairListeners.size === 0 && ws) {
    ws.close();
    ws = null;
    isAuth = false;
    isConnecting = false;
    logger.info('Closed WebSocket (no pairs left)');
  }
}

/**
 * Fetch the latest forex price for a currency pair (e.g., EURUSD) from Polygon.io
 * @param from - base currency (e.g., 'EUR')
 * @param to - quote currency (e.g., 'USD')
 */
export async function getLatestForexPrice(from: string, to: string): Promise<ForexPrice | null> {
  const { POLYGON_API_URL, apiKey } = getConfig();
  if (!apiKey) throw new Error('POLYGON_API_KEY not configured');
  // Use the correct endpoint per Polygon.io docs
  const url = `${POLYGON_API_URL}/v1/last_quote/currencies/${from}/${to}?apiKey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      logger.error('Polygon.io API error: %s', res.statusText);
      return null;
    }
    if (!data || !data.last || typeof data.last.ask !== 'number' || typeof data.last.bid !== 'number') {
      logger.error('Unexpected Polygon.io response: %o', data);
      return null;
    }
    const bid = data.last.bid;
    const ask = data.last.ask;
    const mid = calculateMid(bid, ask);
    const price: ForexPrice = {
      pair: `${from}${to}`.toUpperCase(),
      bid,
      ask,
      mid,
      timestamp: String(data.last.timestamp),
    };
    return price;
  } catch (err) {
    logger.error('Failed to fetch Polygon.io price: %o', err);
    return null;
  }
}

/**
 * Fetch all available forex pairs from Polygon.io and cache them to disk.
 * Called on startup and (TODO) every hour by a scheduled job.
 */
export async function fetchAndCacheForexPairs(): Promise<string[]> {
  const { apiKey } = getConfig();
  if (!apiKey) throw new Error('POLYGON_API_KEY not configured');
  // Use the correct endpoint for all forex tickers
  const url = `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers?apiKey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.error('Polygon.io snapshot API error: %s', res.statusText);
      throw new Error('Failed to fetch forex pairs');
    }
    const data = await res.json();
    if (!data || !Array.isArray(data.tickers)) {
      logger.error('Unexpected Polygon.io snapshot response: %o', data);
      throw new Error('Malformed snapshot response');
    }
    // Extract and normalize pairs from ticker field (e.g., C:EURUSD -> EURUSD)
    const pairs: string[] = data.tickers
      .map((t: any) => typeof t.ticker === 'string' && t.ticker.startsWith('C:') ? t.ticker.slice(2) : null)
      .filter((p: string | null) => !!p);
    // Format timestamp in South African time (Africa/Johannesburg)
    const now = new Date();
    const zone = 'Africa/Johannesburg';
    const zoned = toZonedTime(now, zone);
    const formatted = format(zoned, 'yyyy-MM-dd HH:mm:ss (zzz)', { timeZone: zone });
    const cacheObj = {
      last_updated: formatted,
      pairs,
    };
    await fs.mkdir(path.dirname(FOREX_PAIRS_CACHE_PATH), { recursive: true });
    await fs.writeFile(FOREX_PAIRS_CACHE_PATH, JSON.stringify(cacheObj, null, 2), 'utf-8');
    return pairs;
  } catch (err) {
    logger.error('Failed to fetch/cache forex pairs: %o', err);
    throw err;
  }
}

/**
 * Read the cached forex pairs from disk. If not found, returns [].
 */
export async function readCachedForexPairs(): Promise<string[]> {
  try {
    const data = await fs.readFile(FOREX_PAIRS_CACHE_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed; // backward compatibility
    if (parsed && Array.isArray(parsed.pairs)) return parsed.pairs;
    return [];
  } catch (err) {
    logger.warn('Could not read forex pairs cache: %o', err);
    return [];
  }
}

/**
 * Validate a forex pair against the cached list. Returns true if valid.
 */
export async function isPairValid(pair: string): Promise<boolean> {
  const pairs = await readCachedForexPairs();
  return pairs.includes(pair.toUpperCase());
}

/**
 * For test isolation: reset all singleton state (ws, listeners, etc.)
 */
export function __resetForexSingletonsForTest() {
  if (ws) {
    try { ws.close(); } catch {}
  }
  ws = null;
  isAuth = false;
  isConnecting = false;
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = null;
  pairListeners.clear();
  latestPrices.clear();
}

/**
 * Get the latest price for a pair from the in-memory cache (live WebSocket stream).
 * Returns undefined if no price is available.
 */
export function getLatestPriceFromCache(pair: string): number | undefined {
  return latestPrices.get(pair.toUpperCase());
}

// TODO: Schedule fetchAndCacheForexPairs() to run every hour on a background job.
// TODO: Integrate isPairValid() into alert creation and validation flows.
// TODO: On startup, call fetchAndCacheForexPairs() before accepting user input.
