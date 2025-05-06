// tests/alertProcessor.test.ts
// Unit tests for alertProcessor.ts

import { processAlert } from '../src/alertProcessor';
import { generateTestAlert, generateTestUser, mockSupabaseClient, mockTwilioClient, mockTelegramAPI } from './utils/mocks';
import * as notification from '../src/integrations/notification';
import * as telegram from '../src/integrations/telegram';
import * as supabase from '../src/integrations/supabase';

// Mock dependencies
jest.mock('../src/integrations/notification');
jest.mock('../src/integrations/telegram');
jest.mock('../src/integrations/supabase', () => ({
  ...jest.requireActual('../src/integrations/supabase'),
  updateUserCredits: jest.fn().mockResolvedValue({ success: true })
}));

describe('Alert Processor', () => {
  const mockSendNotification = jest.spyOn(notification, 'sendNotification');
  const mockSendTelegramMessage = jest.spyOn(telegram, 'sendTelegramMessage');
  const mockUpdateUserCredits = jest.spyOn(supabase, 'updateUserCredits');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('processAlert', () => {
    it('should successfully process alert and send notification', async () => {
      // Arrange
      const alert = generateTestAlert();
      const user = generateTestUser();
      mockSendNotification.mockResolvedValueOnce(true);
      
      // Act
      const result = await processAlert(alert, user);
      
      // Assert
      expect(result).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledWith({
        to: user.phone_number,
        message: `Forex Alert: ${alert.pair} is now ${alert.direction} ${alert.target_price}.`,
        channel: 'voice',
        telegramFallbackChatId: user.telegram_id,
        pair: alert.pair,
        direction: alert.direction,
        price: alert.target_price,
      });
    });
    
    it('should return false when user is invalid', async () => {
      // Test cases for invalid users
      const testCases = [
        { description: 'null user', user: null },
        { description: 'missing id', user: generateTestUser({ id: null }) },
        { description: 'missing telegram_id', user: generateTestUser({ telegram_id: null }) }
      ];
      
      for (const tc of testCases) {
        // Act
        const result = await processAlert(generateTestAlert(), tc.user as any);
        
        // Assert
        expect(result).toBe(false);
        expect(mockSendNotification).not.toHaveBeenCalled();
      }
    });
    
    it('should return false when user has no phone number', async () => {
      // Arrange
      const alert = generateTestAlert();
      const user = generateTestUser({ phone_number: null });
      
      // Act
      const result = await processAlert(alert, user);
      
      // Assert
      expect(result).toBe(false);
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
    
    it('should return error message when notification fails', async () => {
      // Arrange
      const alert = generateTestAlert();
      const user = generateTestUser();
      const errorMessage = 'Failed to send notification';
      mockSendNotification.mockResolvedValueOnce(errorMessage);
      
      // Act
      const result = await processAlert(alert, user);
      
      // Assert
      expect(result).toBe(errorMessage);
      expect(mockSendNotification).toHaveBeenCalled();
    });
    
    it('should handle exceptions during notification', async () => {
      // Arrange
      const alert = generateTestAlert();
      const user = generateTestUser();
      const error = new Error('Unexpected error');
      mockSendNotification.mockRejectedValueOnce(error);
      
      // Act
      const result = await processAlert(alert, user);
      
      // Assert
      expect(result).toBe(error.toString());
      expect(mockSendNotification).toHaveBeenCalled();
    });
  });
});
