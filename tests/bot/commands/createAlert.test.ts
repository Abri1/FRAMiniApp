import { handleCreateAlertCommand } from '../../../src/bot/commands/createAlert';
import * as telegram from '../../../src/integrations/telegram';
import * as supabase from '../../../src/integrations/supabase';
import * as forex from '../../../src/integrations/forex';
import { mainMenuKeyboard } from '../../../src/bot/menu';

jest.mock('../../../src/integrations/telegram');
jest.mock('../../../src/integrations/supabase');
jest.mock('../../../src/integrations/forex');

const sendTelegramMessage = telegram.sendTelegramMessage as jest.Mock;
const createAlert = supabase.createAlert as jest.Mock;
const isPairValid = forex.isPairValid as jest.Mock;
const getLatestForexPrice = forex.getLatestForexPrice as jest.Mock;

describe('/createalert integration', () => {
  const chat = { id: 1 } as any;
  const user = { id: 42, username: 'testuser' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    isPairValid.mockResolvedValue(true);
    createAlert.mockResolvedValue('ALERT123');
    getLatestForexPrice.mockResolvedValue({ mid: 1.23456 });
  });

  it('creates a valid EURUSD alert', async () => {
    await handleCreateAlertCommand(chat, user, 'EURUSD 1.23456');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        chat_id: 1,
        text: expect.stringContaining('Alert Created!'),
        parse_mode: 'Markdown',
      })
    );
  });

  it('creates a valid USDJPY alert (3 decimals)', async () => {
    await handleCreateAlertCommand(chat, user, 'USDJPY 123.456');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('123.456'),
      })
    );
  });

  it('rejects invalid pair format', async () => {
    await handleCreateAlertCommand(chat, user, 'EUR-USD 1.2500');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('must be 6 uppercase letters'),
      })
    );
  });

  it('rejects unsupported pair', async () => {
    isPairValid.mockResolvedValue(false);
    await handleCreateAlertCommand(chat, user, 'ZZZZZZ 1.2500');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('not a supported currency pair'),
      })
    );
  });

  it('rejects invalid price for EURUSD (>5 decimals)', async () => {
    await handleCreateAlertCommand(chat, user, 'EURUSD 1.234567');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('not a valid price format'),
      })
    );
  });

  it('rejects invalid price for USDJPY (>3 decimals)', async () => {
    await handleCreateAlertCommand(chat, user, 'USDJPY 123.4567');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('not a valid price format'),
      })
    );
  });

  it('rejects negative price', async () => {
    await handleCreateAlertCommand(chat, user, 'EURUSD -1.2500');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('not a valid price format'),
      })
    );
  });

  it('rejects malformed price', async () => {
    await handleCreateAlertCommand(chat, user, 'EURUSD 1.2.3');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('not a valid price format'),
      })
    );
  });

  it('handles price with spaces', async () => {
    await handleCreateAlertCommand(chat, user, 'EURUSD 1 2500');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('not a valid price format'),
      })
    );
  });

  it('shows usage on missing arguments', async () => {
    await handleCreateAlertCommand(chat, user, 'EURUSD');
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('provide all required information'),
      })
    );
  });
}); 