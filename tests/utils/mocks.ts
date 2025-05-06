/**
 * Mocking utilities for tests
 */

import { EventEmitter } from 'events';

// WebSocket Mock
export class MockWebSocket extends EventEmitter {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = 0; // CONNECTING
  
  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.emit('open');
    }, 0);
  }
  
  send(data: string): void {
    // Mock implementation
  }
  
  close(): void {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }
  
  // Helper to simulate receiving a message
  simulateMessage(data: any): void {
    this.emit('message', { data: JSON.stringify(data) });
  }
  
  // Helper to simulate errors
  simulateError(error: Error): void {
    this.emit('error', error);
  }
  
  // Reset all instances (for test cleanup)
  static resetInstances(): void {
    MockWebSocket.instances = [];
  }
}

// Supabase Mock
export const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  match: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  data: null,
  error: null,
  
  // Helper to set response for next call
  mockResponse: function(data: any, error: any = null) {
    this.data = data;
    this.error = error;
    return { data, error };
  }
};

// Telegram API Mock
export const mockTelegramAPI = {
  sendMessage: jest.fn().mockResolvedValue({ ok: true }),
  getUpdates: jest.fn().mockResolvedValue({ ok: true, result: [] }),
  sendPhoto: jest.fn().mockResolvedValue({ ok: true }),
  
  // Helper to simulate error
  mockError: function(method: 'sendMessage' | 'getUpdates' | 'sendPhoto', error: any) {
    this[method].mockRejectedValueOnce(error);
  }
};

// Twilio Mock
export const mockTwilioClient = {
  calls: {
    create: jest.fn().mockResolvedValue({ sid: 'mock-call-sid' })
  },
  
  // Helper to simulate error
  mockCallError: function(error: any) {
    this.calls.create.mockRejectedValueOnce(error);
  }
};

// Mock Forex Data
export const mockForexData = {
  pairs: {
    'EURUSD': { mid: 1.1850, bid: 1.1845, ask: 1.1855 },
    'GBPUSD': { mid: 1.3820, bid: 1.3815, ask: 1.3825 },
    'USDJPY': { mid: 109.75, bid: 109.70, ask: 109.80 }
  } as Record<string, { mid: number, bid: number, ask: number }>,
  
  // Helper to update a pair's price
  updatePrice: function(pair: string, mid: number, bid?: number, ask?: number) {
    if (!bid) bid = mid - 0.0005;
    if (!ask) ask = mid + 0.0005;
    this.pairs[pair] = { mid, bid, ask };
  }
};

// Helper to reset all mocks
export function resetAllMocks() {
  jest.clearAllMocks();
  MockWebSocket.resetInstances();
}

// Test data generator
export function generateTestUser(overrides: any = {}) {
  return {
    id: 'user-1',
    telegram_id: '123456',
    credits: 10,
    phone_number: '+1234567890',
    created_at: new Date().toISOString(),
    onboarded: true,
    ...overrides
  };
}

export function generateTestAlert(overrides: any = {}) {
  return {
    id: 'alert-1',
    user_id: 'user-1',
    pair: 'EURUSD',
    target_price: 1.1,
    direction: 'above',
    active: true,
    created_at: new Date().toISOString(),
    notification_sent: false,
    retry_count: 0,
    last_failure_reason: null,
    ...overrides
  };
} 