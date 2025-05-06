// tests/priceMonitor.test.ts
// Integration tests for priceMonitor.ts and alerting pipeline

// Set required env vars for Supabase client initialization before imports
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test_anon_key';

// Mock logger to silence output during test
jest.mock('../src/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// Helper to set up Supabase mock for each test
function setupSupabaseMock(updateMock: any) {
  jest.doMock('../src/integrations/supabase', () => ({
    __esModule: true,
    supabase: { from: jest.fn().mockReturnValue({ update: updateMock }) },
  }));
}

describe('monitorPrices', () => {
  const mockAlert: import('../src/integrations/supabase').Alert = {
    id: 'alert-1',
    user_id: 'user-1',
    pair: 'EURUSD',
    target_price: 1.1,
    direction: 'above', // ensure trigger logic
    active: true,
    created_at: new Date().toISOString(),
  };
  const mockUser = {
    id: 'user-1',
    telegram_id: '123456',
    credits: 10,
    phone_number: '+1234567890',
    created_at: new Date().toISOString(),
  };
  const mockPrice = {
    pair: 'EURUSD',
    mid: 1.2, // ensure price > target_price for trigger
    timestamp: new Date().toISOString(),
  };

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should process triggered alerts and notify user', async () => {
    console.log('Running: should process triggered alerts and notify user');
    jest.resetModules();
    const fetchActiveAlerts = jest.fn().mockResolvedValue([mockAlert]);
    const fetchUser = jest.fn().mockImplementation((id) => { console.log('fetchUser called with', id); return Promise.resolve(mockUser); });
    const getLatestForexPrice = jest.fn().mockImplementation((from, to) => { console.log('getLatestForexPrice called with', from, to); return Promise.resolve(mockPrice); });
    const processAlert = jest.fn().mockImplementation((alert, user) => { console.log('processAlert called with', alert, user); return Promise.resolve(true); });
    // Mock supabase.from().update().eq() chain
    const eqMock = jest.fn().mockResolvedValue({});
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    setupSupabaseMock(updateMock);
    const { monitorPrices } = require('../src/priceMonitor');
    await monitorPrices({
      fetchActiveAlerts,
      fetchUser,
      getLatestForexPrice,
      processAlert,
    });
    expect(fetchActiveAlerts).toHaveBeenCalled();
    expect(fetchUser).toHaveBeenCalledWith('user-1');
    expect(getLatestForexPrice).toHaveBeenCalledWith('EUR', 'USD');
    expect(processAlert).toHaveBeenCalledWith(mockAlert, mockUser);
    expect(updateMock).toHaveBeenCalledWith({ active: false, retry_count: 1, last_failure_reason: null });
    expect(eqMock).toHaveBeenCalledWith('id', mockAlert.id);
  });

  it('should retry notification up to 3 times and succeed on last try', async () => {
    console.log('Running: should retry notification up to 3 times and succeed on last try');
    jest.resetModules();
    const fetchActiveAlerts = jest.fn().mockResolvedValue([mockAlert]);
    const fetchUser = jest.fn().mockImplementation((id) => { console.log('fetchUser called with', id); return Promise.resolve(mockUser); });
    const getLatestForexPrice = jest.fn().mockImplementation((from, to) => { console.log('getLatestForexPrice called with', from, to); return Promise.resolve(mockPrice); });
    // Fail first 2 attempts (string error), succeed on 3rd
    const processAlert = jest.fn()
      .mockImplementationOnce((alert, user) => { console.log('processAlert called (1)', alert, user); return Promise.resolve('Simulated failure 1'); })
      .mockImplementationOnce((alert, user) => { console.log('processAlert called (2)', alert, user); return Promise.resolve('Simulated failure 2'); })
      .mockImplementationOnce((alert, user) => { console.log('processAlert called (3)', alert, user); return Promise.resolve(true); });
    const eqMock = jest.fn().mockResolvedValue({});
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    setupSupabaseMock(updateMock);
    const { monitorPrices } = require('../src/priceMonitor');
    await monitorPrices({ fetchActiveAlerts, fetchUser, getLatestForexPrice, processAlert });
    expect(processAlert).toHaveBeenCalledTimes(3);
    expect(updateMock).toHaveBeenCalledWith({ retry_count: 3, active: false, last_failure_reason: null });
    expect(eqMock).toHaveBeenCalledWith('id', mockAlert.id);
  });

  it('should mark alert inactive and set last_failure_reason if all retries fail', async () => {
    console.log('Running: should mark alert inactive and set last_failure_reason if all retries fail');
    jest.resetModules();
    const fetchActiveAlerts = jest.fn().mockResolvedValue([mockAlert]);
    const fetchUser = jest.fn().mockImplementation((id) => { console.log('fetchUser called with', id); return Promise.resolve(mockUser); });
    const getLatestForexPrice = jest.fn().mockImplementation((from, to) => { console.log('getLatestForexPrice called with', from, to); return Promise.resolve(mockPrice); });
    // All attempts fail (string error)
    const processAlert = jest.fn().mockImplementation((alert, user) => { console.log('processAlert called (fail)', alert, user); return Promise.resolve('Simulated failure'); });
    const eqMock = jest.fn().mockResolvedValue({});
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    setupSupabaseMock(updateMock);
    const { monitorPrices } = require('../src/priceMonitor');
    await monitorPrices({ fetchActiveAlerts, fetchUser, getLatestForexPrice, processAlert });
    expect(processAlert).toHaveBeenCalledTimes(3);
    expect(updateMock).toHaveBeenCalledWith({ retry_count: 3, active: false, last_failure_reason: expect.any(String) });
    expect(eqMock).toHaveBeenCalledWith('id', mockAlert.id);
  });

  it('should set direction on first price update if direction is null and not trigger', async () => {
    jest.resetModules();
    const mockAlertNullDir = { ...mockAlert, direction: null, target_price: 1.1 };
    const fetchActiveAlerts = jest.fn().mockResolvedValue([mockAlertNullDir]);
    const fetchUser = jest.fn();
    const getLatestForexPrice = jest.fn().mockResolvedValue({ pair: 'EURUSD', mid: 1.2, timestamp: new Date().toISOString() });
    const processAlert = jest.fn();
    const eqMock = jest.fn().mockResolvedValue({});
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    setupSupabaseMock(updateMock);
    const { monitorPrices } = require('../src/priceMonitor');
    await monitorPrices({ fetchActiveAlerts, fetchUser, getLatestForexPrice, processAlert });
    // Should persist direction as 'below' (since price > target)
    expect(updateMock).toHaveBeenCalledWith({ direction: 'below' });
    expect(eqMock).toHaveBeenCalledWith('id', mockAlertNullDir.id);
    expect(processAlert).not.toHaveBeenCalled();
  });

  it('should trigger only on new cross after direction is set', async () => {
    jest.resetModules();
    // First, direction is null, price below target
    let alert: import('../src/integrations/supabase').Alert = { ...mockAlert, direction: null, target_price: 1.2 };
    let fetchActiveAlerts = jest.fn().mockResolvedValue([alert]);
    let fetchUser = jest.fn();
    let getLatestForexPrice = jest.fn().mockResolvedValue({ pair: 'EURUSD', mid: 1.1, timestamp: new Date().toISOString() });
    let processAlert = jest.fn();
    let eqMock = jest.fn().mockResolvedValue({});
    let updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    setupSupabaseMock(updateMock);
    let { monitorPrices } = require('../src/priceMonitor');
    await monitorPrices({ fetchActiveAlerts, fetchUser, getLatestForexPrice, processAlert });
    expect(updateMock).toHaveBeenCalledWith({ direction: 'above' });
    expect(eqMock).toHaveBeenCalledWith('id', alert.id);
    expect(processAlert).not.toHaveBeenCalled();
    // Now, simulate alert with direction set, price crosses above
    alert = { ...mockAlert, direction: 'above', target_price: 1.2 };
    fetchActiveAlerts = jest.fn().mockResolvedValue([alert]);
    fetchUser = jest.fn().mockResolvedValue(mockUser);
    getLatestForexPrice = jest.fn().mockResolvedValue({ pair: 'EURUSD', mid: 1.25, timestamp: new Date().toISOString() });
    processAlert = jest.fn().mockResolvedValue(true);
    eqMock = jest.fn().mockResolvedValue({});
    updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    setupSupabaseMock(updateMock);
    ({ monitorPrices } = require('../src/priceMonitor'));
    await monitorPrices({ fetchActiveAlerts, fetchUser, getLatestForexPrice, processAlert });
    expect(processAlert).toHaveBeenCalledWith(alert, mockUser);
    expect(updateMock).toHaveBeenCalledWith({ active: false, retry_count: 1, last_failure_reason: null });
    expect(eqMock).toHaveBeenCalledWith('id', alert.id);
  });
});
