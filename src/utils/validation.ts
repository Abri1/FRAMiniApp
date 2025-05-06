import logger from '../logger';
import { SUPPORTED_DIRECTIONS } from '../config/forex';

/**
 * Validate if the price is a valid number for the given pair.
 * - JPY pairs: allow integer or up to 3 decimals (e.g., 123, 123.456)
 * - Others: require decimal point and up to 5 decimals (e.g., 1.2500)
 * Rejects negative, zero, and invalid decimal counts.
 */
export function isValidPriceForPair(pair: string, priceStr: string): boolean {
  const quote = pair.slice(3, 6).toUpperCase();
  let regexResult = false;
  if (quote === 'JPY') {
    // Allow integer or up to 3 decimals, but no more
    regexResult = /^\d+(\.\d{1,3})?$/.test(priceStr);
  } else {
    // Require decimal point and up to 5 decimals
    regexResult = /^\d+\.\d{1,5}$/.test(priceStr);
  }
  const price = parseFloat(priceStr);
  return regexResult && price > 0;
}

/**
 * Normalize price to correct decimals for the pair.
 */
export function normalizePrice(pair: string, price: number): number {
  const quote = pair.slice(3, 6).toUpperCase();
  const decimals = quote === 'JPY' ? 3 : 5;
  return parseFloat(price.toFixed(decimals));
}

/**
 * Validate currency pair format (6 uppercase letters, no symbols).
 */
export function isValidPairFormat(pair: string): boolean {
  return /^[A-Z]{6}$/.test(pair);
}

/**
 * Validate direction is supported.
 */
export function isValidDirection(direction: string): boolean {
  return SUPPORTED_DIRECTIONS.includes(direction.toLowerCase() as any);
}

/**
 * Trim and sanitize all input arguments.
 */
export function sanitizeArgs(args: string): string[] {
  return args.trim().split(/\s+/).map(arg => arg.trim()).filter(Boolean);
}

/**
 * Join all parts after the first two as price (handles prices with spaces).
 */
export function extractPriceArg(argsParts: string[]): string {
  return argsParts.slice(2).join('');
}

/**
 * Extract the ISO 2-letter country code from a phone number using libphonenumber-js
 * @param phoneNumber The phone number in E.164 format
 * @returns The ISO 2-letter country code (e.g., 'US'), or null if invalid
 */
export function getCountryFromPhoneNumber(phoneNumber: string): string | null {
  try {
    // Lazy require to avoid breaking environments where the lib isn't installed
    // (You must add libphonenumber-js to your dependencies)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { parsePhoneNumber } = require('libphonenumber-js');
    const parsed = parsePhoneNumber(phoneNumber);
    return parsed.country || null;
  } catch {
    return null;
  }
} 