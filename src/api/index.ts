// NOTE: All Google Sheets admin panel endpoints and logic should be implemented in src/adminsheet/ (not here). See IMPLEMENTATION_PLAN.md and CONTEXT.md for rationale and details. 

import express from 'express';
import bodyParser from 'body-parser';
import { supabase, getAlertsByUserId, createAlert, updateAlert, deleteAlert, AlertCreateData } from '../integrations/supabase';
import logger from '../logger';
import type { Request, Response, NextFunction } from 'express';

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Extend Express Request type for userId and telegramUser
interface TelegramAuthedRequest extends Request {
  userId?: number;
  telegramUser?: any;
}

// New endpoint: Twilio fetches this after call is answered
app.post('/api/twilio/play-message', async (req, res) => {
  const alertId = req.query.alertId as string | undefined;
  let message = 'Hello! This is your Forex Ring Alert. No alert details found.';
  let pair: string | undefined;
  let direction: string | undefined;
  let price: number | undefined;
  if (alertId) {
    // Try to fetch alert details from DB
    const { data, error } = await supabase.from('alerts').select('*').eq('uuid', alertId).single();
    if (!error && data) {
      pair = data.pair;
      direction = data.direction;
      price = data.price;
      // Reuse the message-building logic from notification.ts
      if (pair && direction && typeof price === 'number') {
        // Inline the buildVoiceAlertTwiML logic for now
        const CURRENCY_NAMES: Record<string, string> = {
          EUR: 'Euro', USD: 'US Dollar', GBP: 'British Pound', JPY: 'Japanese Yen', CHF: 'Swiss Franc', AUD: 'Australian Dollar', CAD: 'Canadian Dollar', NZD: 'New Zealand Dollar', SEK: 'Swedish Krona', NOK: 'Norwegian Krone', ZAR: 'South African Rand', MXN: 'Mexican Peso', SGD: 'Singapore Dollar', HKD: 'Hong Kong Dollar', TRY: 'Turkish Lira', PLN: 'Polish Zloty', CZK: 'Czech Koruna', HUF: 'Hungarian Forint', DKK: 'Danish Krone', RUB: 'Russian Ruble', INR: 'Indian Rupee', CNY: 'Chinese Yuan', KRW: 'South Korean Won', BRL: 'Brazilian Real', SAR: 'Saudi Riyal', AED: 'UAE Dirham', THB: 'Thai Baht', MYR: 'Malaysian Ringgit', IDR: 'Indonesian Rupiah', PHP: 'Philippine Peso', TWD: 'Taiwan Dollar', ILS: 'Israeli Shekel', ARS: 'Argentine Peso', CLP: 'Chilean Peso', COP: 'Colombian Peso', PEN: 'Peruvian Sol', RON: 'Romanian Leu', BGN: 'Bulgarian Lev', HRK: 'Croatian Kuna', ISK: 'Icelandic Krona',
        };
        function spellOut(code: string): string { return code.split('').join(' '); }
        function getFullPairName(pair: string): string {
          const base = pair.slice(0, 3).toUpperCase();
          const quote = pair.slice(3, 6).toUpperCase();
          const baseName = CURRENCY_NAMES[base] || spellOut(base);
          const quoteName = CURRENCY_NAMES[quote] || spellOut(quote);
          return `${baseName} ${quoteName}`;
        }
        function getPairDecimals(pair: string): number {
          const quote = pair.slice(3, 6).toUpperCase();
          return quote === 'JPY' ? 3 : 5;
        }
        const fullPair = getFullPairName(pair);
        const dirWord = direction === 'above' ? 'has gone above' : 'has gone below';
        const decimals = getPairDecimals(pair);
        const priceStr = price.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
        const alertMsg = `${fullPair} ${dirWord} ${priceStr}.`;
        message = `Hello! This is your Forex Ring Alert. ${alertMsg} I repeat, ${alertMsg} Happy trading. Goodbye.`;
      } else if (data.message) {
        message = data.message;
      }
    }
  }
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice=\"Google.en-US-Neural2-F\" language=\"en-US\">${message}</Say>\n</Response>`;
  res.type('text/xml').send(twiml);
});

// --- Telegram Mini App Auth Middleware ---
/**
 * Middleware to validate Telegram Mini App initData and extract user ID
 * (Signature validation to be implemented)
 */
function telegramAuthMiddleware(req: TelegramAuthedRequest, res: Response, next: NextFunction) {
  // Accept initData from query, header, or body
  const initData = req.query.initData || req.headers['x-telegram-initdata'] || req.body.initData;
  if (!initData) {
    res.status(401).json({ error: 'Missing Telegram initData' });
    return;
  }
  // TODO: Validate initData signature using Telegram bot token (HMAC-SHA256)
  // See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
  // For now, just parse user info (UNSAFE, for dev only)
  try {
    const params = Object.fromEntries(new URLSearchParams(initData));
    if (!params.user) {
      res.status(401).json({ error: 'Invalid initData: missing user' });
      return;
    }
    const user = JSON.parse(params.user);
    req.userId = user.id;
    req.telegramUser = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid initData format' });
  }
}

// --- Mini App: List Alerts Endpoint ---
app.get('/api/alerts', telegramAuthMiddleware, async (req: TelegramAuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: missing userId' });
      return;
    }
    const alerts = await getAlertsByUserId(String(req.userId));
    res.json({ alerts });
  } catch (error) {
    logger.error('GET /api/alerts error: %o', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// --- Mini App: Create Alert Endpoint ---
app.post('/api/alerts', telegramAuthMiddleware, async (req: TelegramAuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: missing userId' });
      return;
    }
    const alertData: AlertCreateData = {
      ...req.body,
      user_id: String(req.userId),
    };
    const alertId = await createAlert(alertData);
    if (!alertId) {
      res.status(400).json({ error: 'Failed to create alert' });
      return;
    }
    res.status(201).json({ alertId });
  } catch (error) {
    logger.error('POST /api/alerts error: %o', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// --- Mini App: Update Alert Endpoint ---
app.put('/api/alerts/:id', telegramAuthMiddleware, async (req: TelegramAuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: missing userId' });
      return;
    }
    const alertId = Number(req.params.id);
    if (!alertId) {
      res.status(400).json({ error: 'Invalid alert ID' });
      return;
    }
    const success = await updateAlert(alertId, req.body);
    if (!success) {
      res.status(400).json({ error: 'Failed to update alert' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('PUT /api/alerts/:id error: %o', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// --- Mini App: Delete Alert Endpoint ---
app.delete('/api/alerts/:id', telegramAuthMiddleware, async (req: TelegramAuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: missing userId' });
      return;
    }
    const alertId = Number(req.params.id);
    if (!alertId) {
      res.status(400).json({ error: 'Invalid alert ID' });
      return;
    }
    const success = await deleteAlert(alertId);
    if (!success) {
      res.status(400).json({ error: 'Failed to delete alert' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/alerts/:id error: %o', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
}); 