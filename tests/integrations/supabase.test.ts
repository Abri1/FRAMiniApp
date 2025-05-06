import { jest } from '@jest/globals';
import * as supabaseModule from '../../src/integrations/supabase';
import logger from '../../src/logger';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock the Supabase client creation
jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => ({}))
  };
});

// Mock logger
jest.mock('../../src/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

// Create a mock Supabase client instance using `any` to avoid complex typing
const mockSupabaseClient: any = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(), 
  order: jest.fn().mockReturnThis()
}; 

// Spy on the exported supabase instance and return our mock
jest.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue(mockSupabaseClient);

describe('Supabase Integration', () => {
  beforeEach(() => {
    // Clear all mock calls and implementations before each test
    jest.clearAllMocks();

    // Reset implementations for chainable methods
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockReturnThis();
    mockSupabaseClient.insert.mockReturnThis();
    mockSupabaseClient.update.mockReturnThis();
    mockSupabaseClient.delete.mockReturnThis();
    mockSupabaseClient.eq.mockReturnThis();
    mockSupabaseClient.order.mockReturnThis();
    // Reset the promise-returning methods
    mockSupabaseClient.single.mockClear();
    // Ensure update/delete mocks resolve by default (can be overridden in tests)
    mockSupabaseClient.update.mockResolvedValue({ error: null });
    mockSupabaseClient.delete.mockResolvedValue({ error: null });
  });

  describe('getUserByTelegramId', () => {
    it('should return user data when found', async () => {
      const mockUserData = { id: '123', telegram_id: '12345', credits: 10, phone_number: '+1234567890', created_at: '2023-01-01', onboarded: true };
      const mockResponse = { data: mockUserData, error: null };
      
      // Mock the final promise resolution of .single()
      mockSupabaseClient.single.mockResolvedValue(mockResponse);
      
      const result = await supabaseModule.getUserByTelegramId('12345');
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('telegram_id', '12345');
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUserData);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return null and log error when user not found or DB error', async () => {
      const mockError = { message: 'DB Error' };
      const mockResponse = { data: null, error: mockError };
      
      mockSupabaseClient.single.mockResolvedValue(mockResponse);
      
      const result = await supabaseModule.getUserByTelegramId('12345');
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('telegram_id', '12345');
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Supabase getUserByTelegramId error: %o', mockError);
    });
  });

  describe('createAlert', () => {
    it('should insert an alert and return its ID', async () => {
      const mockAlertId = 'alert-789';
      const mockResponse = { data: { id: mockAlertId }, error: null };
      const alertData = {
        user_id: '123',
        pair: 'EURUSD',
        target_price: 1.05,
        direction: 'above' as const,
        active: true,
        notification_sent: false,
        retry_count: 0
      };
      
      mockSupabaseClient.single.mockResolvedValue(mockResponse);

      const result = await supabaseModule.createAlert(alertData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([alertData]);
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('id');
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockAlertId);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return null and log error on insert failure', async () => {
        const mockError = { message: 'Insert failed' };
        const mockResponse = { data: null, error: mockError };
        const alertData = { user_id: '123', pair: 'EURUSD', target_price: 1.05, direction: 'above' as const, active: true, notification_sent: false, retry_count: 0 };
        
        mockSupabaseClient.single.mockResolvedValue(mockResponse);
  
        const result = await supabaseModule.createAlert(alertData);
  
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts');
        expect(mockSupabaseClient.insert).toHaveBeenCalledWith([alertData]);
        expect(mockSupabaseClient.select).toHaveBeenCalledWith('id');
        expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
        expect(result).toBeNull();
        expect(logger.error).toHaveBeenCalledWith('Supabase createAlert error: %o', mockError);
      });
  });

  describe('updateAlert', () => {
    it('should update an alert successfully and return true', async () => {
      const mockResponse = { error: null }; 
      const alertId = 'alert-123';
      const updates = { active: false, notification_sent: true };

      // Mock the update chain directly
      mockSupabaseClient.update.mockResolvedValue(mockResponse);

      const result = await supabaseModule.updateAlert(alertId, updates);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updates);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', alertId);
      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return false and log error on update failure', async () => {
        const mockError = { message: 'Update failed' };
        const mockResponse = { error: mockError };
        const alertId = 'alert-123';
        const updates = { active: false };
        
        mockSupabaseClient.update.mockResolvedValue(mockResponse);
  
        const result = await supabaseModule.updateAlert(alertId, updates);
  
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts');
        expect(mockSupabaseClient.update).toHaveBeenCalledWith(updates);
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', alertId);
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith('Supabase updateAlert error: %o', mockError);
      });
  });

  describe('deleteAlert', () => {
    it('should delete an alert successfully and return true', async () => {
      const mockResponse = { error: null }; 
      const alertId = 'alert-123';

      // Mock the delete chain directly
      mockSupabaseClient.delete.mockResolvedValue(mockResponse);

      const result = await supabaseModule.deleteAlert(alertId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts');
      expect(mockSupabaseClient.delete).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', alertId);
      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return false and log error on delete failure', async () => {
        const mockError = { message: 'Delete failed' };
        const mockResponse = { error: mockError };
        const alertId = 'alert-123';
        
        mockSupabaseClient.delete.mockResolvedValue(mockResponse);
  
        const result = await supabaseModule.deleteAlert(alertId);
  
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts');
        expect(mockSupabaseClient.delete).toHaveBeenCalledTimes(1);
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', alertId);
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith('Supabase deleteAlert error: %o', mockError);
      });
  });
}); 