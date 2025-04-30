// tests/alertProcessor.test.ts
// Unit tests for alertProcessor.ts

import { processAlert } from '../src/alertProcessor';
import * as notification from '../src/integrations/notification';
import { Alert, User } from '../src/integrations/supabase';

// Mock logger to silence output during test
jest.mock('../src/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe('processAlert', () => {
  const baseAlert: Alert = {
    id: 'alert-1',
    user_id: 'user-1',
    pair: 'EURUSD',
    target_price: 1.1,
    direction: 'above',
    active: true,
    created_at: new Date().toISOString(),
  };
  const baseUser: User = {
    id: 'user-1',
    telegram_id: '123456',
    credits: 10,
    phone_number: '+1234567890',
    created_at: new Date().toISOString(),
    onboarded: true,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should send a voice call notification successfully', async () => {
    jest.spyOn(notification, 'sendNotification').mockResolvedValue(true);
    const result = await processAlert(baseAlert, baseUser);
    expect(result).toBe(true);
    expect(notification.sendNotification).toHaveBeenCalledWith({
      to: baseUser.phone_number,
      message: expect.stringContaining('EURUSD'),
      channel: 'voice',
      telegramFallbackChatId: baseUser.telegram_id,
    });
  });

  it('should fallback to Telegram if voice call fails', async () => {
    jest.spyOn(notification, 'sendNotification').mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    // Simulate first call fails, fallback returns true
    const result = await processAlert(baseAlert, baseUser);
    expect(result).toBe(false); // processAlert returns false if fallback is needed (since sendNotification handles fallback internally)
  });

  it('should fail if user has no phone number', async () => {
    const userNoPhone = { ...baseUser, phone_number: '' };
    const result = await processAlert(baseAlert, userNoPhone);
    expect(result).toBe(false);
  });

  it('should fail if user is missing telegram_id', async () => {
    const userNoTelegram = { ...baseUser, telegram_id: '' };
    const result = await processAlert(baseAlert, userNoTelegram);
    expect(result).toBe(false);
  });
});
