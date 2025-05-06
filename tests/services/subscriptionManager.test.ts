import { jest } from '@jest/globals';
import { subscriptionManager } from '../../src/services/subscriptionManager';
import * as forexIntegration from '../../src/integrations/forex';
import { ForexPriceCallback, ForexPrice } from '../../src/integrations/forex';

// Use simple jest.Mock for the callback type to avoid generic argument issues
type MockForexPriceCallback = jest.Mock; 

// Mock the forex integration
jest.mock('../../src/integrations/forex', () => ({
  subscribeToForexPrice: jest.fn().mockImplementation((pair: string, callback: ForexPriceCallback) => jest.fn() as jest.Mock), // Return a basic mock function
  unsubscribeFromForexPrice: jest.fn(),
  __resetForexSingletonsForTest: jest.fn()
}));

describe('SubscriptionManager', () => {
  // Cast the imported mocks to basic jest.Mock for simplicity in tests
  const typedSubscribeMock = forexIntegration.subscribeToForexPrice as jest.Mock;
  const typedUnsubscribeMock = forexIntegration.unsubscribeFromForexPrice as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementation, returning a new basic mock function each time
    typedSubscribeMock.mockClear().mockImplementation((pair: string, callback: ForexPriceCallback) => jest.fn() as jest.Mock);
    typedUnsubscribeMock.mockClear();

    // Reset the subscription manager's internal state
    // @ts-ignore 
    subscriptionManager.pairCounts = new Map();
    // @ts-ignore 
    subscriptionManager.alertUnsubscribers = new Map();
    // @ts-ignore 
    subscriptionManager.alertCallbacks = new Map();
  });

  it('should add alert for pair with proper callback', () => {
    const mockCallback = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const alertId = 'alert-123';
    const pair = 'EURUSD';

    subscriptionManager.addAlertForPair(pair, mockCallback as any, alertId); // Cast callback to any

    expect(typedSubscribeMock).toHaveBeenCalledWith(pair, mockCallback as any);
    expect(subscriptionManager.getAlertCount(pair)).toBe(1);
  });

  it('should not re-register existing alert ID', () => {
    const mockCallback = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const alertId = 'alert-123';
    const pair = 'EURUSD';

    subscriptionManager.addAlertForPair(pair, mockCallback as any, alertId);
    subscriptionManager.addAlertForPair(pair, mockCallback as any, alertId);

    expect(typedSubscribeMock).toHaveBeenCalledTimes(1);
    expect(subscriptionManager.getAlertCount(pair)).toBe(1);
  });

  it('should increment count when adding multiple alerts for same pair', () => {
    const pair = 'EURUSD';
    const mockCallback1 = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockCallback2 = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockCallback3 = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    
    subscriptionManager.addAlertForPair(pair, mockCallback1 as any, 'alert-1');
    subscriptionManager.addAlertForPair(pair, mockCallback2 as any, 'alert-2');
    subscriptionManager.addAlertForPair(pair, mockCallback3 as any, 'alert-3');

    expect(subscriptionManager.getAlertCount(pair)).toBe(3);
    expect(typedSubscribeMock).toHaveBeenCalledTimes(3);
  });

  it('should remove alert and call the specific unsubscribe function', () => {
    const mockCallback = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const alertId = 'alert-123';
    const pair = 'EURUSD';
    const mockUnsubscribeSpecific = jest.fn(); // Basic mock function
    
    typedSubscribeMock.mockReturnValueOnce(mockUnsubscribeSpecific);

    subscriptionManager.addAlertForPair(pair, mockCallback as any, alertId);
    expect(subscriptionManager.getAlertCount(pair)).toBe(1);
    expect(typedSubscribeMock).toHaveBeenCalledTimes(1);

    subscriptionManager.removeAlertForPair(pair, alertId);
    
    expect(mockUnsubscribeSpecific).toHaveBeenCalledTimes(1);
    expect(subscriptionManager.getAlertCount(pair)).toBe(0);
    expect(typedUnsubscribeMock).not.toHaveBeenCalled();
  });

  it('should handle removing non-existent alert ID gracefully', () => {
    const pair = 'EURUSD';
    const alertId = 'non-existent';

    subscriptionManager.removeAlertForPair(pair, alertId);
    
    expect(subscriptionManager.getAlertCount(pair)).toBe(0);
    expect(typedSubscribeMock).not.toHaveBeenCalled();
    expect(typedUnsubscribeMock).not.toHaveBeenCalled();
  });

  it('should decrement count when removing one of multiple alerts', () => {
    const pair = 'EURUSD';
    const mockCallback1 = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockCallback2 = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockCallback3 = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();
    const mockUnsubscribe3 = jest.fn();

    typedSubscribeMock
      .mockReturnValueOnce(mockUnsubscribe1)
      .mockReturnValueOnce(mockUnsubscribe2)
      .mockReturnValueOnce(mockUnsubscribe3);
    
    subscriptionManager.addAlertForPair(pair, mockCallback1 as any, 'alert-1');
    subscriptionManager.addAlertForPair(pair, mockCallback2 as any, 'alert-2');
    subscriptionManager.addAlertForPair(pair, mockCallback3 as any, 'alert-3');
    
    expect(subscriptionManager.getAlertCount(pair)).toBe(3);
    expect(typedSubscribeMock).toHaveBeenCalledTimes(3);

    subscriptionManager.removeAlertForPair(pair, 'alert-2');
    
    expect(subscriptionManager.getAlertCount(pair)).toBe(2);
    expect(mockUnsubscribe1).not.toHaveBeenCalled();
    expect(mockUnsubscribe2).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe3).not.toHaveBeenCalled();
  });

  it('should handle adding alerts for different pairs', () => {
    const mockCallbackEURUSD = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockCallbackGBPUSD = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockCallbackUSDJPY = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    
    subscriptionManager.addAlertForPair('EURUSD', mockCallbackEURUSD as any, 'eurusd-1');
    subscriptionManager.addAlertForPair('GBPUSD', mockCallbackGBPUSD as any, 'gbpusd-1');
    subscriptionManager.addAlertForPair('USDJPY', mockCallbackUSDJPY as any, 'usdjpy-1');
    
    expect(subscriptionManager.getAlertCount('EURUSD')).toBe(1);
    expect(subscriptionManager.getAlertCount('GBPUSD')).toBe(1);
    expect(subscriptionManager.getAlertCount('USDJPY')).toBe(1);

    expect(typedSubscribeMock).toHaveBeenCalledTimes(3);
    expect(typedSubscribeMock).toHaveBeenCalledWith('EURUSD', expect.any(Function));
    expect(typedSubscribeMock).toHaveBeenCalledWith('GBPUSD', expect.any(Function));
    expect(typedSubscribeMock).toHaveBeenCalledWith('USDJPY', expect.any(Function));
  });

  it('should handle removing all alerts for a pair', () => {
    const pair = 'EURUSD';
    const mockCallback1 = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockCallback2 = jest.fn((price: ForexPrice) => false) as MockForexPriceCallback;
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();
    
    typedSubscribeMock
      .mockReturnValueOnce(mockUnsubscribe1)
      .mockReturnValueOnce(mockUnsubscribe2);

    subscriptionManager.addAlertForPair(pair, mockCallback1 as any, 'alert-1');
    subscriptionManager.addAlertForPair(pair, mockCallback2 as any, 'alert-2');
    
    subscriptionManager.removeAlertForPair(pair, 'alert-1');
    subscriptionManager.removeAlertForPair(pair, 'alert-2');
    
    expect(subscriptionManager.getAlertCount(pair)).toBe(0);
    expect(mockUnsubscribe1).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe2).toHaveBeenCalledTimes(1);
  });
}); 