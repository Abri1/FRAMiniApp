"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const forex_1 = require("../src/integrations/forex");
const ws_1 = __importDefault(require("ws"));
jest.mock('ws');
describe('Polygon.io Forex Integration', () => {
    let wsInstances;
    function createMockWsInstance() {
        const handlers = {};
        return {
            send: jest.fn(),
            close: jest.fn(),
            readyState: ws_1.default.OPEN,
            set onopen(fn) { handlers.onopen = fn; },
            get onopen() { return handlers.onopen; },
            set onmessage(fn) { handlers.onmessage = fn; },
            get onmessage() { return handlers.onmessage; },
            set onclose(fn) { handlers.onclose = fn; },
            get onclose() { return handlers.onclose; },
            set onerror(fn) { handlers.onerror = fn; },
            get onerror() { return handlers.onerror; },
            _handlers: handlers,
        };
    }
    beforeEach(() => {
        wsInstances = [];
        ws_1.default.mockClear();
        ws_1.default.mockImplementation(() => {
            const inst = createMockWsInstance();
            wsInstances.push(inst);
            return inst;
        });
    });
    it('should connect, authenticate, subscribe, and receive price updates', () => {
        process.env.POLYGON_API_KEY = 'testkey';
        const cb = jest.fn();
        const MockWebSocket = jest.fn((url) => {
            const inst = createMockWsInstance();
            wsInstances.push(inst);
            return inst;
        });
        // Attach static properties for type compatibility
        Object.defineProperty(MockWebSocket, 'OPEN', { value: 1 });
        Object.defineProperty(MockWebSocket, 'CONNECTING', { value: 0 });
        Object.defineProperty(MockWebSocket, 'CLOSING', { value: 2 });
        Object.defineProperty(MockWebSocket, 'CLOSED', { value: 3 });
        MockWebSocket.prototype = {};
        const unsubscribe = (0, forex_1.subscribeToForexPrice)('EUR/USD', cb, MockWebSocket);
        // 1. Connects
        expect(MockWebSocket).toHaveBeenCalledWith('wss://socket.polygon.io/forex');
        expect(wsInstances.length).toBe(1);
        const ws = wsInstances[0];
        expect(typeof ws.onopen).toBe('function');
        // 2. Authenticates
        ws.onopen();
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ action: 'auth', params: 'testkey' }));
        // 3. Subscribes after auth success
        const authSuccessMsg = JSON.stringify([{ ev: 'status', status: 'auth_success' }]);
        ws.onmessage({ data: authSuccessMsg });
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ action: 'subscribe', params: 'C.EURUSD' }));
        // 4. Receives price update
        const msg = JSON.stringify([
            { ev: 'C', p: 1.2345, c: 'C.EURUSD', t: 1714450000000 },
        ]);
        ws.onmessage({ data: msg });
        expect(cb).toHaveBeenCalledWith({ pair: 'EUR/USD', price: 1.2345, timestamp: '1714450000000' });
        unsubscribe();
        expect(ws.close).toHaveBeenCalled();
    });
    it('should handle price update messages and call callback', () => {
        process.env.POLYGON_API_KEY = 'testkey';
        const cb = jest.fn();
        const unsubscribe = (0, forex_1.subscribeToForexPrice)('EUR/USD', cb, ws_1.default);
        expect(wsInstances.length).toBe(1);
        const ws = wsInstances[0];
        // Simulate open
        ws.onopen();
        // Simulate auth_success
        ws.onmessage({ data: JSON.stringify([{ ev: 'status', status: 'auth_success' }]) });
        // Simulate price message
        const msg = JSON.stringify([
            { ev: 'C', p: 1.2345, c: 'C.EURUSD', t: 1714450000000 },
        ]);
        ws.onmessage({ data: msg });
        expect(cb).toHaveBeenCalledWith({ pair: 'EUR/USD', price: 1.2345, timestamp: '1714450000000' });
        unsubscribe();
        expect(ws.close).toHaveBeenCalled();
    });
    it('should throw if POLYGON_API_KEY is not set', () => {
        delete process.env.POLYGON_API_KEY;
        expect(() => (0, forex_1.subscribeToForexPrice)('EUR/USD', jest.fn())).toThrow(/POLYGON_API_KEY/);
    });
});
