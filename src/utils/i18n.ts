/**
 * Simple i18n utility for bot messages. Extendable for more languages.
 */
type MessageKey =
  | 'CREATEALERT_USAGE'
  | 'INVALID_PAIR'
  | 'INVALID_PAIR_FORMAT'
  | 'INVALID_DIRECTION'
  | 'INVALID_PRICE'
  | 'NEGATIVE_PRICE'
  | 'ALERT_SUCCESS'
  | 'ALERT_ERROR'
  | 'DB_ERROR';

type Messages = {
  [lang: string]: {
    [key in MessageKey]: string;
  };
};

const messages: Messages = {
  en: {
    CREATEALERT_USAGE: '⚠️ Please provide all required information in the format:\n`/createalert CURRENCY_PAIR DIRECTION PRICE`\n\nExample: `/createalert EURUSD above 1.2500`',
    INVALID_PAIR: '⚠️ Sorry, "{pair}" is not a supported currency pair.\n\nPlease enter a valid forex pair (e.g., EURUSD, GBPUSD, USDJPY).',
    INVALID_PAIR_FORMAT: '⚠️ Currency pair must be 6 uppercase letters (e.g., EURUSD).',
    INVALID_DIRECTION: '⚠️ Sorry, "{direction}" is not a valid direction.\n\nSupported directions: {directions}',
    INVALID_PRICE: '⚠️ Sorry, "{price}" is not a valid price format for {pair}.',
    NEGATIVE_PRICE: '⚠️ Price must be greater than zero.',
    ALERT_SUCCESS: '✅ Alert created successfully!\n\n*Alert Details:*\nCurrency Pair: {pair}\nDirection: {direction}\nTarget Price: {price}\nAlert ID: {alertId}\n\nYou\'ll be notified when {pair} goes {direction} {price}.',
    ALERT_ERROR: '⚠️ Sorry, there was an error creating your alert. Please try again later.',
    DB_ERROR: '⚠️ Database error: {error}',
  },
  // Add more languages here
};

export function t(key: MessageKey, vars: Record<string, string | number> = {}, lang: string = 'en'): string {
  let msg = messages[lang]?.[key] || messages['en'][key] || key;
  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`{${k}}`, 'g'), String(v));
  }
  return msg;
} 