import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { subscribeToForexPrice, unsubscribeFromForexPrice, __resetForexSingletonsForTest, ForexPrice, ForexPriceCallback } from '../../src/integrations/forex';
import WebSocket from 'ws';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  // Type the readyState with any to avoid TypeScript errors with WebSocket constants
  readyState: any = 0; // WebSocket.CONNECTING
  url: string; // Store URL for debugging/identification if needed

  constructor(url: string) {
    super();
    this.url = url;
    // Simulate connection opening asynchronously
    process.nextTick(() => {
      this.readyState = 1; // WebSocket.OPEN
      this.emit('open');
    });
  }

  send(data: string) {
    // Simulate sending data - can add mock logic here if needed
    // console.log(`MockWebSocket sending: ${data}`); // Optional logging
    return;
  }

  close() {
    if (this.readyState !== 3) { // Prevent multiple close events
      this.readyState = 3; // WebSocket.CLOSED
      // Simulate closing asynchronously
      process.nextTick(() => {
        this.emit('close');
      });
    }
  }

  // Helper to simulate receiving a message
  simulateMessage(data: any) {
    process.nextTick(() => {
      this.emit('message', JSON.stringify(data));
    });
  }

  // Helper to simulate an error
  simulateError(error: Error) {
    process.nextTick(() => {
      this.emit('error', error);
      this.close(); // Typically, an error leads to a close
    });
  }
}

// Mock config
jest.mock('../../src/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    forexApiUrl: 'wss://mock.example.com/forex', // Use a distinct mock URL
    forexApiKey: 'mock-api-key',
  }),
}));

// Mock logger
jest.mock('../../src/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// Increase default timeout for this test suite
jest.setTimeout(60000); // 60 seconds timeout for all tests in this file

describe('Forex Integration', () => {
  let mockWsInstance: MockWebSocket | null = null;

  // Capture the WebSocket instance when it's created
  const mockWebSocketConstructor = jest.fn((url: string) => {
    mockWsInstance = new MockWebSocket(url);
    // Spy on methods of the specific instance
    jest.spyOn(mockWsInstance, 'send');
    jest.spyOn(mockWsInstance, 'close');
    return mockWsInstance;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __resetForexSingletonsForTest();
    mockWsInstance = null; // Reset instance capture
    // Reset the mock constructor implementation for each test
    mockWebSocketConstructor.mockClear().mockImplementation((url: string) => {
       mockWsInstance = new MockWebSocket(url);
       jest.spyOn(mockWsInstance, 'send');
       jest.spyOn(mockWsInstance, 'close');
       return mockWsInstance;
    });
  });

  afterEach(async () => {
     // Ensure any pending timeouts or intervals are cleared
     // This helps prevent tests leaking into each other or causing open handles
     await new Promise(resolve => setImmediate(resolve));
  });


  describe('subscribeToForexPrice', () => {
    // Use a longer timeout for this specific test if needed, otherwise file-level timeout applies
    it('should create WebSocket connection, authenticate, and subscribe', (done) => {
      const callback = jest.fn((price: ForexPrice) => false) as unknown as ForexPriceCallback;
      subscribeToForexPrice('EURUSD', callback, mockWebSocketConstructor as any);

      // Wait for WebSocket to be constructed and open event to fire
      setImmediate(() => {
        expect(mockWebSocketConstructor).toHaveBeenCalledWith('wss://mock.example.com/forex');
        expect(mockWsInstance).not.toBeNull();
        if (!mockWsInstance) return done.fail('Mock WS not created');

        expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('"action":"auth"'));
        expect(mockWsInstance.send).toHaveBeenCalledWith(expect.stringContaining('"key":"mock-api-key"'));

        // Simulate successful authentication
        mockWsInstance.simulateMessage([{ ev: 'status', status: 'auth_success', message: 'Authenticated Successfully' }]);

        // Wait for the auth message processing and subscribe action
        setImmediate(() => {
            expect(mockWsInstance?.send).toHaveBeenCalledWith(expect.stringContaining('"action":"subscribe"'));
            expect(mockWsInstance?.send).toHaveBeenCalledWith(expect.stringContaining('"params":"C.EUR/USD"'));
            done(); // Test completes successfully if subscription is sent
        });
      });
    });

    it('should call the callback with price updates', (done) => {
       const callback = jest.fn((price: ForexPrice) => false) as unknown as ForexPriceCallback;
       subscribeToForexPrice('EURUSD', callback, mockWebSocketConstructor as any);

       setImmediate(() => {
         if (!mockWsInstance) return done.fail('Mock WS not created');
         // Simulate auth success first
         mockWsInstance.simulateMessage([{ ev: 'status', status: 'auth_success' }]);

         setImmediate(() => {
            // Simulate price update after subscription is expected
            const priceData = { ev: 'C', p: 'EUR/USD', b: 1.1234, a: 1.1236, t: 1625097600000 };
            mockWsInstance?.simulateMessage([priceData]);

            // Wait for message processing
            setImmediate(() => {
               expect(callback).toHaveBeenCalledTimes(1);
               expect(callback).toHaveBeenCalledWith({
                 pair: 'EURUSD',
                 bid: 1.1234,
                 ask: 1.1236,
                 mid: (1.1234 + 1.1236) / 2,
                 timestamp: '1625097600000' // Ensure timestamp is passed as string
               });
               done();
            });
         });
       });
     });


    it('should handle multiple subscriptions for the same pair (only one WS subscribe)', (done) => {
      const callback1 = jest.fn((price: ForexPrice) => false) as unknown as ForexPriceCallback;
      const callback2 = jest.fn((price: ForexPrice) => false) as unknown as ForexPriceCallback;

      subscribeToForexPrice('EURUSD', callback1, mockWebSocketConstructor as any);
      subscribeToForexPrice('EURUSD', callback2, mockWebSocketConstructor as any); // Second subscription

      setImmediate(() => {
        if (!mockWsInstance) return done.fail('Mock WS not created');
        mockWsInstance.simulateMessage([{ ev: 'status', status: 'auth_success' }]); // Authenticate

        setImmediate(() => {
          // Check that 'subscribe' was called only once for EUR/USD
          const subscribeCalls = (mockWsInstance?.send as jest.Mock).mock.calls.filter(
            (call: any[]) => call[0] && typeof call[0] === 'string' && call[0].includes('"action":"subscribe"') && call[0].includes('"params":"C.EUR/USD"')
          );
          expect(subscribeCalls).toHaveLength(1);

          // Simulate price update
          const priceData = { ev: 'C', p: 'EUR/USD', b: 1.1234, a: 1.1236, t: 1625097600000 };
          mockWsInstance?.simulateMessage([priceData]);

          // Wait for processing
          setImmediate(() => {
             expect(callback1).toHaveBeenCalledTimes(1);
             expect(callback2).toHaveBeenCalledTimes(1);
             done();
          });
        });
      });
    });

    it('should unsubscribe from WebSocket when last subscriber is removed', (done) => {
      const callback1 = jest.fn((price: ForexPrice) => false) as unknown as ForexPriceCallback;
      const callback2 = jest.fn((price: ForexPrice) => false) as unknown as ForexPriceCallback;

      const unsubscribe1 = subscribeToForexPrice('EURUSD', callback1, mockWebSocketConstructor as any);
      const unsubscribe2 = subscribeToForexPrice('EURUSD', callback2, mockWebSocketConstructor as any);

      setImmediate(() => {
        if (!mockWsInstance) return done.fail('Mock WS not created');
        mockWsInstance.simulateMessage([{ ev: 'status', status: 'auth_success' }]); // Authenticate

        setImmediate(() => {
            // Unsubscribe the first callback
            unsubscribe1();
            expect(mockWsInstance?.send).not.toHaveBeenCalledWith(expect.stringContaining('"action":"unsubscribe"'));

            // Unsubscribe the second (last) callback
            unsubscribe2();
            expect(mockWsInstance?.send).toHaveBeenCalledWith(expect.stringContaining('"action":"unsubscribe"'));
            expect(mockWsInstance?.send).toHaveBeenCalledWith(expect.stringContaining('"params":"C.EUR/USD"'));

            // Optionally check if close is called after unsubscribe (depends on implementation)
            // expect(mockWsInstance?.close).toHaveBeenCalled();
            done();
        });
      });
    });


    it('should handle WebSocket errors and attempt reconnect', (done) => {
       const callback = jest.fn((price: ForexPrice) => false) as unknown as ForexPriceCallback;
       subscribeToForexPrice('EURUSD', callback, mockWebSocketConstructor as any);
       let initialWsInstance: MockWebSocket | null = null;

       setImmediate(() => {
         initialWsInstance = mockWsInstance; // Store the first instance
         expect(initialWsInstance).not.toBeNull();
         if (!initialWsInstance) return done.fail("Initial WS instance not created");

         // Simulate an error on the first connection
         initialWsInstance.simulateError(new Error('WebSocket connection failed'));

         // Wait briefly for error handling and reconnect attempt
         setTimeout(() => {
           // Expect the logger to have been called for the error
           const loggerMock = require('../../src/logger');
           expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('WebSocket error for wss://mock.example.com/forex'), expect.any(Error));

           // Expect close to have been called on the old instance
           expect(initialWsInstance?.close).toHaveBeenCalled();

           // Expect a new WebSocket connection attempt (constructor called again)
           // Note: mockWebSocketConstructor keeps track of all calls
           expect(mockWebSocketConstructor).toHaveBeenCalledTimes(2);

           // The new instance should be stored in mockWsInstance now
           expect(mockWsInstance).not.toBeNull();
           expect(mockWsInstance).not.toBe(initialWsInstance); // Ensure it's a new instance

           // Check if the new connection attempts to authenticate
            expect(mockWsInstance?.send).toHaveBeenCalledWith(expect.stringContaining('"action":"auth"'));

           done();
         }, 100); // Small delay for reconnect logic to trigger
       });
     });


    it('should stop calling callback after it returns true (alert triggered)', (done) => {
       // Callback returns true on the first call
       const callback = jest.fn((price: ForexPrice) => {
          return price.bid === 1.1234; // Trigger condition
       }) as unknown as ForexPriceCallback;

       subscribeToForexPrice('EURUSD', callback, mockWebSocketConstructor as any);

       setImmediate(() => {
         if (!mockWsInstance) return done.fail('Mock WS not created');
         mockWsInstance.simulateMessage([{ ev: 'status', status: 'auth_success' }]); // Authenticate

         setImmediate(() => {
           // First price update (triggers callback)
           const priceData1 = { ev: 'C', p: 'EUR/USD', b: 1.1234, a: 1.1236, t: 1625097600000 };
           mockWsInstance?.simulateMessage([priceData1]);

           setImmediate(() => {
             expect(callback).toHaveBeenCalledTimes(1); // Called once

             // Second price update (should NOT trigger callback again)
             const priceData2 = { ev: 'C', p: 'EUR/USD', b: 1.1235, a: 1.1237, t: 1625097601000 };
             mockWsInstance?.simulateMessage([priceData2]);

             setImmediate(() => {
               expect(callback).toHaveBeenCalledTimes(1); // Still only called once
               done();
             });
           });
         });
       });
     });
  });

  describe('unsubscribeFromForexPrice', () => {
    it('should use direct unsubscribe function correctly', (done) => {
      const callback = jest.fn((price: ForexPrice) => false) as unknown as ForexPriceCallback;
      subscribeToForexPrice('EURUSD', callback, mockWebSocketConstructor as any);

      setImmediate(() => {
        if (!mockWsInstance) return done.fail('Mock WS not created');
        mockWsInstance.simulateMessage([{ ev: 'status', status: 'auth_success' }]); // Authenticate

        setImmediate(() => {
          // Direct unsubscribe call
          unsubscribeFromForexPrice('EURUSD', callback);

          expect(mockWsInstance?.send).toHaveBeenCalledWith(expect.stringContaining('"action":"unsubscribe"'));
          expect(mockWsInstance?.send).toHaveBeenCalledWith(expect.stringContaining('"params":"C.EUR/USD"'));
           // Check if WebSocket is closed after last subscriber is removed
           expect(mockWsInstance?.close).toHaveBeenCalled();
          done();
        });
      });
    });
  });
}); 