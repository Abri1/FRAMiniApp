/**
 * Global test setup and teardown
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test-supabase-url.com';
process.env.SUPABASE_KEY = 'test-supabase-key';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
process.env.POLYGON_API_KEY = 'test-polygon-key';
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
process.env.TWILIO_PHONE_NUMBER = '+15551234567';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Mock out external modules
jest.mock('ws', () => {
  const { MockWebSocket } = require('./utils/mocks');
  return MockWebSocket;
});

// Configure jest timeouts
jest.setTimeout(30000); // 30 seconds

// Global setup
beforeAll(() => {
  // Add any global setup here
});

// Global teardown
afterAll(() => {
  // Add any global teardown here
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Fix for "jest has detected the following 1 open handle"
afterEach(() => {
  jest.useRealTimers();
}); 