"use strict";
// src/integrations/forex.ts
// Polygon.io integration for Forex Ring Alerts
// Modular, type-safe, robust error handling, testable
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
exports.getLatestForexPrice = getLatestForexPrice;
exports.subscribeToForexPrice = subscribeToForexPrice;
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_1 = __importDefault(require("../logger"));
const config_1 = require("../config");
const config = (0, config_1.loadConfig)();
const POLYGON_API_URL = config.forexApiUrl || 'https://api.polygon.io/v1';
/**
 * Fetch the latest forex price for a currency pair (e.g., EURUSD) from Polygon.io
 * @param from - base currency (e.g., 'EUR')
 * @param to - quote currency (e.g., 'USD')
 */
function getLatestForexPrice(from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        const symbol = `${from}${to}`.toUpperCase();
        const apiKey = config.forexApiKey || process.env.POLYGON_API_KEY;
        if (!apiKey)
            throw new Error('POLYGON_API_KEY not configured');
        const url = `${POLYGON_API_URL}/last/forex/${symbol}?apiKey=${apiKey}`;
        try {
            const res = yield (0, node_fetch_1.default)(url);
            if (!res.ok) {
                logger_1.default.error('Polygon.io API error: %s', res.statusText);
                return null;
            }
            const data = yield res.json();
            if (!data || !data.last || typeof data.last.ask !== 'number') {
                logger_1.default.error('Unexpected Polygon.io response: %o', data);
                return null;
            }
            const price = {
                pair: symbol,
                price: data.last.ask,
                timestamp: data.last.timestamp,
            };
            logger_1.default.info('Fetched Polygon.io price: %o', price);
            return price;
        }
        catch (err) {
            logger_1.default.error('Failed to fetch Polygon.io price: %o', err);
            return null;
        }
    });
}
/**
 * Subscribe to real-time forex price updates via Polygon.io WebSocket.
 * @param pair - Currency pair, e.g. 'EUR/USD'
 * @param onPrice - Callback for price updates
 * @returns unsubscribe function
 */
function subscribeToForexPrice(pair, onPrice, WebSocketCtor) {
    const apiKey = config.forexApiKey || process.env.POLYGON_API_KEY;
    if (!apiKey) {
        throw new Error('POLYGON_API_KEY not set in environment/config');
    }
    const WS = WebSocketCtor || WebSocket;
    const ws = new WS(config.forexApiUrl || 'wss://socket.polygon.io/forex');
    let isSubscribed = false;
    let reconnectTimeout = null;
    const channel = `C.${pair.replace('/', '')}`;
    function cleanup() {
        if (ws && ws.readyState === WebSocket.OPEN)
            ws.close();
        if (reconnectTimeout)
            clearTimeout(reconnectTimeout);
    }
    ws.onopen = () => {
        logger_1.default.info(`[Polygon] WebSocket opened for ${pair}`);
        ws.send(JSON.stringify({ action: 'auth', params: apiKey }));
    };
    ws.onmessage = (event) => {
        try {
            const messages = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
            for (const msg of messages) {
                if (msg.ev === 'status' && msg.status === 'auth_success') {
                    ws.send(JSON.stringify({ action: 'subscribe', params: channel }));
                    isSubscribed = true;
                    logger_1.default.info(`[Polygon] Subscribed to ${channel}`);
                }
                else if (msg.ev === 'C') {
                    const price = {
                        pair,
                        price: msg.p,
                        timestamp: String(msg.t),
                    };
                    onPrice(price);
                }
                else if (msg.ev === 'status' && msg.status === 'auth_failed') {
                    logger_1.default.error('[Polygon] Auth failed');
                    cleanup();
                }
            }
        }
        catch (err) {
            logger_1.default.error('[Polygon] Message parse error: %o', err);
        }
    };
    ws.onclose = (_event) => {
        logger_1.default.warn(`[Polygon] WebSocket closed for ${pair}`);
        if (isSubscribed) {
            reconnectTimeout = setTimeout(() => {
                logger_1.default.info(`[Polygon] Reconnecting to ${pair}`);
                subscribeToForexPrice(pair, onPrice);
            }, 3000);
        }
    };
    ws.onerror = (err) => {
        logger_1.default.error('[Polygon] WebSocket error: %o', err);
        cleanup();
    };
    return cleanup;
}
