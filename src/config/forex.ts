// src/config/forex.ts
// Centralized supported forex pairs, directions, and validation regex

export const SUPPORTED_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
  'EURJPY', 'GBPJPY'
];

export const SUPPORTED_DIRECTIONS = ['above', 'below'] as const;
export type AlertDirection = typeof SUPPORTED_DIRECTIONS[number];

// Regex to validate a proper price format (allows for up to 5 decimal places)
export const PRICE_REGEX = /^\d+(\.\d{1,5})?$/;

export function isSupportedPair(pair: string): boolean {
  return SUPPORTED_PAIRS.includes(pair.toUpperCase());
}

export function isSupportedDirection(direction: string): direction is AlertDirection {
  return SUPPORTED_DIRECTIONS.includes(direction.toLowerCase() as AlertDirection);
}

export function isValidPriceFormat(price: string): boolean {
  return PRICE_REGEX.test(price);
} 