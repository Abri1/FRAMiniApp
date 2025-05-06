import { isValidPriceForPair, normalizePrice, isValidPairFormat, isValidDirection, sanitizeArgs, extractPriceArg } from '../../src/utils/validation';

describe('Validation Utilities', () => {
  describe('isValidPriceForPair', () => {
    it('accepts valid 5-decimal price for non-JPY', () => {
      expect(isValidPriceForPair('EURUSD', '1.23456')).toBe(true);
    });
    it('rejects >5 decimals for non-JPY', () => {
      expect(isValidPriceForPair('EURUSD', '1.234567')).toBe(false);
    });
    it('accepts valid 3-decimal price for JPY', () => {
      expect(isValidPriceForPair('USDJPY', '123.456')).toBe(true);
    });
    it('accepts integer price for JPY', () => {
      expect(isValidPriceForPair('USDJPY', '123')).toBe(true);
    });
    it('rejects >3 decimals for JPY', () => {
      expect(isValidPriceForPair('USDJPY', '123.4567')).toBe(false);
    });
    it('rejects negative and zero prices', () => {
      expect(isValidPriceForPair('EURUSD', '-1.2345')).toBe(false);
      expect(isValidPriceForPair('EURUSD', '0')).toBe(false);
    });
    it('rejects invalid formats', () => {
      expect(isValidPriceForPair('EURUSD', '1.')).toBe(false);
      expect(isValidPriceForPair('EURUSD', '.12345')).toBe(false);
      expect(isValidPriceForPair('EURUSD', '1.2.3')).toBe(false);
    });
  });

  describe('normalizePrice', () => {
    it('normalizes to 5 decimals for non-JPY', () => {
      expect(normalizePrice('EURUSD', 1.2)).toBe(1.20000);
    });
    it('normalizes to 3 decimals for JPY', () => {
      expect(normalizePrice('USDJPY', 123.4)).toBe(123.400);
    });
  });

  describe('isValidPairFormat', () => {
    it('accepts 6 uppercase letters', () => {
      expect(isValidPairFormat('EURUSD')).toBe(true);
    });
    it('rejects lowercase, symbols, or wrong length', () => {
      expect(isValidPairFormat('eurusd')).toBe(false);
      expect(isValidPairFormat('EUR-USD')).toBe(false);
      expect(isValidPairFormat('EURUS')).toBe(false);
      expect(isValidPairFormat('EURUSD1')).toBe(false);
    });
  });

  describe('isValidDirection', () => {
    it('accepts supported directions', () => {
      expect(isValidDirection('above')).toBe(true);
      expect(isValidDirection('below')).toBe(true);
    });
    it('rejects unsupported directions', () => {
      expect(isValidDirection('up')).toBe(false);
      expect(isValidDirection('down')).toBe(false);
    });
  });

  describe('sanitizeArgs', () => {
    it('trims and splits arguments', () => {
      expect(sanitizeArgs('  EURUSD   above   1.2500  ')).toEqual(['EURUSD', 'above', '1.2500']);
    });
    it('removes empty arguments', () => {
      expect(sanitizeArgs('   ')).toEqual([]);
    });
  });

  describe('extractPriceArg', () => {
    it('joins all parts after the first two as price', () => {
      expect(extractPriceArg(['EURUSD', 'above', '1', '2500'])).toBe('12500');
      expect(extractPriceArg(['EURUSD', 'above', '1.2500'])).toBe('1.2500');
    });
  });
}); 