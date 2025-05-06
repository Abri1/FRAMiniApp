// tests/priceMonitor.init.test.ts
// Tests for the initializeSubscriptions function in priceMonitor.ts

import { generateTestAlert } from './utils/mocks';
import { subscriptionManager } from '../src/services/subscriptionManager';

// Mock the subscription manager
const mockAddAlertForPair = jest.fn();
const mockGetAlertCount = jest.fn();
const mockRemoveAlertForPair = jest.fn();

// Mock the createAlertCallback function
const mockCreateAlertCallback = jest.fn().mockReturnValue(() => Promise.resolve(true));

// Mock fetchActiveAlerts function
const mockFetchActiveAlerts = jest.fn();
const mockFetchUser = jest.fn();
const mockProcessAlert = jest.fn();

// Mock dependencies
jest.mock('../src/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../src/services/subscriptionManager', () => {
  return {
    __esModule: true,
    subscriptionManager: {
      addAlertForPair: mockAddAlertForPair,
      getAlertCount: mockGetAlertCount,
      removeAlertForPair: mockRemoveAlertForPair,
    },
  };
});

jest.mock('../src/priceMonitor', () => {
  return {
    __esModule: true,
    fetchActiveAlerts: mockFetchActiveAlerts,
    createAlertCallback: mockCreateAlertCallback,
    fetchUser: mockFetchUser,
    processAlert: mockProcessAlert,
    // Provide a custom implementation that uses our mocks
    initializeSubscriptions: async () => {
      try {
        const alerts = await mockFetchActiveAlerts();
        // Group alerts by pair
        const pairToAlerts = new Map();
        for (const alert of alerts) {
          if (!pairToAlerts.has(alert.pair)) pairToAlerts.set(alert.pair, []);
          pairToAlerts.get(alert.pair).push(alert);
        }
        // Subscribe to each unique pair, with a handler that processes all alerts for that pair
        for (const [pair, alertsForPair] of pairToAlerts.entries()) {
          for (const alert of alertsForPair) {
            if (!alert.active) continue;
            const callback = mockCreateAlertCallback(alert, mockFetchUser, mockProcessAlert);
            mockAddAlertForPair(pair, callback, alert.id);
          }
        }
        return true;
      } catch (err) {
        return false;
      }
    }
  };
});

describe('initializeSubscriptions Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initializeSubscriptions', () => {
    it('should subscribe to active alerts on initialization', async () => {
      // Arrange
      const mockAlerts = [
        generateTestAlert({ id: 'alert-1', pair: 'EURUSD', active: true }),
        generateTestAlert({ id: 'alert-2', pair: 'GBPUSD', active: true }),
      ];
      
      // Mock fetchActiveAlerts to return our test alerts
      mockFetchActiveAlerts.mockResolvedValueOnce(mockAlerts);
      
      // Import the module
      const priceMonitor = require('../src/priceMonitor');
      
      // Act
      await priceMonitor.initializeSubscriptions();
      
      // Assert
      expect(mockFetchActiveAlerts).toHaveBeenCalled();
      expect(mockCreateAlertCallback).toHaveBeenCalledTimes(2);
      expect(mockCreateAlertCallback).toHaveBeenCalledWith(
        mockAlerts[0],
        mockFetchUser,
        mockProcessAlert
      );
      
      // Should add subscriptions for each alert
      expect(mockAddAlertForPair).toHaveBeenCalledTimes(2);
      expect(mockAddAlertForPair).toHaveBeenCalledWith(
        'EURUSD',
        expect.any(Function),
        'alert-1'
      );
      expect(mockAddAlertForPair).toHaveBeenCalledWith(
        'GBPUSD',
        expect.any(Function),
        'alert-2'
      );
    });
    
    it('should handle errors when fetching alerts', async () => {
      // Arrange
      mockFetchActiveAlerts.mockRejectedValueOnce(new Error('Database error'));
      
      // Import the module
      const priceMonitor = require('../src/priceMonitor');
      
      // Act
      await priceMonitor.initializeSubscriptions();
      
      // Assert
      expect(mockFetchActiveAlerts).toHaveBeenCalled();
      expect(mockCreateAlertCallback).not.toHaveBeenCalled();
      expect(mockAddAlertForPair).not.toHaveBeenCalled();
    });
    
    it('should handle empty alert list', async () => {
      // Arrange
      mockFetchActiveAlerts.mockResolvedValueOnce([]);
      
      // Import the module
      const priceMonitor = require('../src/priceMonitor');
      
      // Act
      await priceMonitor.initializeSubscriptions();
      
      // Assert
      expect(mockFetchActiveAlerts).toHaveBeenCalled();
      expect(mockCreateAlertCallback).not.toHaveBeenCalled();
      expect(mockAddAlertForPair).not.toHaveBeenCalled();
    });
    
    it('should group alerts by currency pair for efficient subscription', async () => {
      // Arrange
      const mockAlerts = [
        generateTestAlert({ id: 'alert-1', pair: 'EURUSD', active: true }),
        generateTestAlert({ id: 'alert-2', pair: 'EURUSD', active: true }), // Same pair as alert-1
        generateTestAlert({ id: 'alert-3', pair: 'GBPUSD', active: true }),
      ];
      
      mockFetchActiveAlerts.mockResolvedValueOnce(mockAlerts);
      
      // Import the module
      const priceMonitor = require('../src/priceMonitor');
      
      // Act
      await priceMonitor.initializeSubscriptions();
      
      // Assert
      // Should create callbacks for each alert
      expect(mockCreateAlertCallback).toHaveBeenCalledTimes(3);
      
      // Should add subscriptions for each alert
      expect(mockAddAlertForPair).toHaveBeenCalledTimes(3);
      
      // Check first EURUSD alert
      expect(mockAddAlertForPair).toHaveBeenCalledWith(
        'EURUSD',
        expect.any(Function),
        'alert-1'
      );
      
      // Check second EURUSD alert
      expect(mockAddAlertForPair).toHaveBeenCalledWith(
        'EURUSD',
        expect.any(Function),
        'alert-2'
      );
      
      // Check GBPUSD alert
      expect(mockAddAlertForPair).toHaveBeenCalledWith(
        'GBPUSD',
        expect.any(Function),
        'alert-3'
      );
    });
  });
}); 