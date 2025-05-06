import { ForexPrice } from '../src/integrations/forex';
import WebSocket from 'ws';

// Mock constants for WebSocket
const WS_CONSTANTS = {
  OPEN: 1,
  CONNECTING: 0,
  CLOSING: 2,
  CLOSED: 3
};

// Create a mock function that will use these later in beforeEach
const MockWebSocketFn = jest.fn();

// Create a proper mock for the WebSocket module
jest.mock('ws', () => {
  return {
    __esModule: true,
    default: MockWebSocketFn,
    // Add needed WebSocket constants
    OPEN: WS_CONSTANTS.OPEN,
    CONNECTING: WS_CONSTANTS.CONNECTING,
    CLOSING: WS_CONSTANTS.CLOSING,
    CLOSED: WS_CONSTANTS.CLOSED
  };
});

describe('Polygon.io Forex Integration', () => {
  let wsInstances: any[];
  let __resetForexSingletonsForTest: any;

  function createMockWsInstance() {
    const handlers: Record<string, Function> = {};
    return {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WS_CONSTANTS.OPEN,
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
    jest.resetModules();
    wsInstances = [];
    
    // Clear the mock implementation and call counts
    MockWebSocketFn.mockReset();
    
    // Set up the implementation
    MockWebSocketFn.mockImplementation(() => {
      const inst = createMockWsInstance();
      wsInstances.push(inst);
      return inst;
    });
    
    // @ts-ignore: test hack to ensure the implementation uses the mocked WebSocket
    global.WebSocket = MockWebSocketFn;
  });

  afterEach(() => {
    if (__resetForexSingletonsForTest) __resetForexSingletonsForTest();
  });

  it('should connect, authenticate, subscribe, and receive price updates', () => {
    process.env.POLYGON_API_KEY = 'testkey';
    const { subscribeToForexPrice, __resetForexSingletonsForTest: reset } = require('../src/integrations/forex');
    __resetForexSingletonsForTest = reset;
    const cb = jest.fn();
    const unsubscribe = subscribeToForexPrice('EURUSD', cb, MockWebSocketFn);

    // 1. Connects
    expect(MockWebSocketFn.mock.calls[0][0]).toBe('wss://socket.polygon.io/forex');
    expect(wsInstances.length).toBe(1);
    const ws = wsInstances[0];
    expect(typeof ws.onopen).toBe('function');

    // 2. Authenticates
    ws.onopen();
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('auth'));
    expect(JSON.parse(ws.send.mock.calls[0][0])).toEqual(expect.objectContaining({ action: 'auth', params: expect.any(String) }));

    // 3. Subscribes after auth success
    const authSuccessMsg = JSON.stringify([{ ev: 'status', status: 'auth_success' }]);
    ws.onmessage({ data: authSuccessMsg });
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('subscribe'));

    // 4. Receives price update
    const msg = JSON.stringify([
      { ev: 'C', p: 'EURUSD', b: 1.2340, a: 1.2350, t: 1714450000000 },
    ]);
    ws.onmessage({ data: msg });
    const callArg = cb.mock.calls[0][0];
    expect(callArg.pair).toBe('EURUSD');
    expect(callArg.bid).toBe(1.2340);
    expect(callArg.ask).toBe(1.2350);
    expect(callArg.timestamp).toBe('1714450000000');
    expect(callArg.mid).toBeCloseTo(1.2345, 5);

    unsubscribe();
    expect(ws.close).toHaveBeenCalled();
  });

  it('should handle price update messages and call callback', () => {
    process.env.POLYGON_API_KEY = 'testkey';
    const { subscribeToForexPrice, __resetForexSingletonsForTest: reset } = require('../src/integrations/forex');
    __resetForexSingletonsForTest = reset;
    const cb = jest.fn();
    const unsubscribe = subscribeToForexPrice('EURUSD', cb, MockWebSocketFn);
    expect(wsInstances.length).toBe(1);
    const ws = wsInstances[0];
    // Simulate open
    ws.onopen();
    // Simulate auth_success
    ws.onmessage({ data: JSON.stringify([{ ev: 'status', status: 'auth_success' }]) });
    // Simulate price message
    const msg = JSON.stringify([
      { ev: 'C', p: 'EURUSD', b: 1.2340, a: 1.2350, t: 1714450000000 },
    ]);
    ws.onmessage({ data: msg });
    const callArg = cb.mock.calls[0][0];
    expect(callArg.pair).toBe('EURUSD');
    expect(callArg.bid).toBe(1.2340);
    expect(callArg.ask).toBe(1.2350);
    expect(callArg.timestamp).toBe('1714450000000');
    expect(callArg.mid).toBeCloseTo(1.2345, 5);
    unsubscribe();
    expect(ws.close).toHaveBeenCalled();
  });

  it('should throw if POLYGON_API_KEY is not set', () => {
    // Save and clear env
    const oldKey = process.env.POLYGON_API_KEY;
    delete process.env.POLYGON_API_KEY;
    jest.resetModules();
    jest.doMock('../src/config', () => ({ loadConfig: () => ({}) }));
    const { subscribeToForexPrice, __resetForexSingletonsForTest: reset } = require('../src/integrations/forex');
    __resetForexSingletonsForTest = reset;
    expect(() => subscribeToForexPrice('EURUSD', jest.fn(), MockWebSocketFn)).toThrow(/POLYGON_API_KEY/);
    // Restore env and unmock
    if (oldKey) process.env.POLYGON_API_KEY = oldKey;
    jest.dontMock('../src/config');
  });
});
