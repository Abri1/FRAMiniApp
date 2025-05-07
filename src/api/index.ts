// NOTE: All Google Sheets admin panel endpoints and logic should be implemented in src/adminsheet/ (not here). See IMPLEMENTATION_PLAN.md and CONTEXT.md for rationale and details. 

import express from 'express';
import bodyParser from 'body-parser';
import { supabase } from '../integrations/supabase';
import logger from '../logger';

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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