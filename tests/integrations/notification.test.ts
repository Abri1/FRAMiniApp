import { jest } from '@jest/globals';
import { sendNotification, sendVoiceCall, VoiceNotificationPayload, NotificationChannel, VoiceCallResult } from '../../src/integrations/notification';
import { Twilio } from 'twilio';
import { sendTelegramMessage } from '../../src/integrations/telegram';

// Using `any` for complex mock types to bypass strict checks
type MockTwilioCallCreate = jest.MockedFunction<any>; 
type MockSendTelegram = jest.MockedFunction<any>;

// Mock Twilio
jest.mock('twilio', () => {
  const mockCreate = jest.fn().mockResolvedValue({ sid: 'mock-call-sid' } as any); // Use as any for resolved value
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      calls: {
        create: mockCreate as MockTwilioCallCreate
      }
    }))
  };
});

// Mock config
jest.mock('../../src/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    twilioAccountSid: 'mock-sid',
    twilioAuthToken: 'mock-token',
    twilioPhoneNumber: '+1234567890'
  })
}));

// Mock logger
jest.mock('../../src/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

// Mock telegram integration
const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined as any); // Use as any for resolved value
jest.mock('../../src/integrations/telegram', () => ({
  sendTelegramMessage: mockSendTelegramMessage as MockSendTelegram
}));

describe('Notification Service', () => {
  const twilioMock = require('twilio');
  const telegramMock = require('../../src/integrations/telegram');
  // Cast to the simplified 'any' mock type
  const typedCreateMock = twilioMock.Twilio().calls.create as MockTwilioCallCreate;
  const typedTelegramMock = telegramMock.sendTelegramMessage as MockSendTelegram;

  beforeEach(() => {
    jest.clearAllMocks();
    typedCreateMock.mockClear().mockResolvedValue({ sid: 'mock-call-sid' } as any);
    typedTelegramMock.mockClear().mockResolvedValue(undefined as any);
  });

  describe('sendVoiceCall', () => {
    it('should successfully place a voice call', async () => {
      const result = await sendVoiceCall('+1234567890', 'Test message');
      expect(result.success).toBe(true);
      expect(typedCreateMock).toHaveBeenCalled();
    });

    it('should format alert TwiML correctly when alert details provided', async () => {
      await sendVoiceCall('+1234567890', 'Test message', 'EURUSD', 'above', 1.2345);
      
      expect(typedCreateMock).toHaveBeenCalledTimes(1);
      
      // Accessing mock calls might require `any` if types are complex
      const twimlParam = (typedCreateMock.mock.calls[0] as any)[0].twiml;
      expect(twimlParam).toContain('<Say voice="Google.en-US-Neural2-F"');
      expect(twimlParam).toContain('Euro US Dollar has gone above 1.2345');
    });

    it('should handle Twilio errors gracefully', async () => {
      const mockError: any = new Error('Twilio error');
      mockError.code = 123;
      
      typedCreateMock.mockRejectedValueOnce(mockError);
      
      const result = await sendVoiceCall('+1234567890', 'Test message');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Twilio error code 123');
      }
    });

    it('should handle missing Twilio config', async () => {
      const config = require('../../src/config');
      config.loadConfig.mockReturnValueOnce({});
      
      const result = await sendVoiceCall('+1234567890', 'Test message');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Twilio config missing');
      }
      expect(typedCreateMock).not.toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    it('should successfully send a voice notification', async () => {
      const payload: VoiceNotificationPayload & { pair?: string; direction?: string; price?: number } = {
        to: '+1234567890',
        message: 'Test notification',
        channel: 'voice',
        pair: 'EURUSD',
        direction: 'above',
        price: 1.2345
      };
      
      const result = await sendNotification(payload);
      expect(result).toBe(true);
      expect(typedCreateMock).toHaveBeenCalled();
    });

    it('should fall back to Telegram when voice call fails', async () => {
      typedCreateMock.mockRejectedValueOnce(new Error('Call failed'));
      
      const payload: VoiceNotificationPayload & { pair?: string; direction?: string; price?: number } = {
        to: '+1234567890',
        message: 'Test notification',
        channel: 'voice',
        telegramFallbackChatId: '12345'
      };
      
      const result = await sendNotification(payload);
      expect(result).not.toBe(true); 
      
      expect(typedTelegramMock).toHaveBeenCalledWith({
        chat_id: '12345',
        text: 'Test notification'
      });
    });

    it('should handle direct telegram notification', async () => {
      type CustomPayload = {
        to: string;
        message: string;
        channel: 'telegram';
      };
      
      const payload = {
        to: '12345',
        message: 'Test notification',
        channel: 'telegram' 
      } as CustomPayload;
      
      const result = await sendNotification(payload as any);
      expect(result).toBe(true);
      
      expect(typedTelegramMock).toHaveBeenCalledWith({
        chat_id: '12345',
        text: 'Test notification'
      });
    });

    it('should handle telegram sending errors', async () => {
      typedTelegramMock.mockRejectedValueOnce(new Error('Telegram error'));
      
      type CustomPayload = {
        to: string;
        message: string;
        channel: 'telegram';
      };
      
      const payload = {
        to: '12345',
        message: 'Test notification',
        channel: 'telegram'
      } as CustomPayload;
      
      const result = await sendNotification(payload as any);
      expect(result).toBe('Failed to send Telegram message');
    });

    it('should handle unknown notification channel', async () => {
      const payload = {
        to: '12345',
        message: 'Test notification',
        channel: 'unknown'
      };
      
      const result = await sendNotification(payload as any);
      expect(result).toBe('Unknown notification channel');
      expect(typedCreateMock).not.toHaveBeenCalled();
      expect(typedTelegramMock).not.toHaveBeenCalled();
    });
  });
}); 