"use strict";
// tests/priceMonitor.test.ts
// Integration tests for priceMonitor.ts and alerting pipeline
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// Set required env vars for Supabase client initialization before imports
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test_anon_key';
const priceMonitor_1 = require("../src/priceMonitor");
// Mock logger to silence output during test
jest.mock('../src/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
describe('monitorPrices', () => {
    const mockAlert = {
        id: 'alert-1',
        user_id: 'user-1',
        pair: 'EURUSD',
        target_price: 1.1,
        direction: 'above', // ensure trigger logic
        active: true,
        created_at: new Date().toISOString(),
    };
    const mockUser = {
        id: 'user-1',
        telegram_id: '123456',
        credits: 10,
        phone_number: '+1234567890',
        created_at: new Date().toISOString(),
    };
    const mockPrice = {
        pair: 'EURUSD',
        price: 1.2, // ensure price > target_price for trigger
        timestamp: new Date().toISOString(),
    };
    it('should process triggered alerts and notify user', () => __awaiter(void 0, void 0, void 0, function* () {
        const fetchActiveAlerts = jest.fn().mockResolvedValue([mockAlert]);
        const fetchUser = jest.fn().mockResolvedValue(mockUser);
        const getLatestForexPrice = jest.fn().mockResolvedValue(mockPrice);
        const processAlert = jest.fn().mockResolvedValue(true);
        // Mock supabase.from().update().eq() chain
        const eqMock = jest.fn().mockResolvedValue({});
        const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
        const fromMock = jest.fn().mockReturnValue({ update: updateMock });
        require('../src/integrations/supabase').supabase.from = fromMock;
        yield (0, priceMonitor_1.monitorPrices)({
            fetchActiveAlerts,
            fetchUser,
            getLatestForexPrice,
            processAlert,
        });
        expect(fetchActiveAlerts).toHaveBeenCalled();
        expect(fetchUser).toHaveBeenCalledWith('user-1');
        expect(getLatestForexPrice).toHaveBeenCalledWith('EUR', 'USD');
        expect(processAlert).toHaveBeenCalledWith(mockAlert, mockUser);
        expect(fromMock).toHaveBeenCalledWith('alerts');
        expect(updateMock).toHaveBeenCalledWith({ active: false, retry_count: 1, last_failure_reason: null });
        expect(eqMock).toHaveBeenCalledWith('id', mockAlert.id);
    }));
    it('should retry notification up to 3 times and succeed on last try', () => __awaiter(void 0, void 0, void 0, function* () {
        const fetchActiveAlerts = jest.fn().mockResolvedValue([mockAlert]);
        const fetchUser = jest.fn().mockResolvedValue(mockUser);
        const getLatestForexPrice = jest.fn().mockResolvedValue(mockPrice);
        // Fail first 2 attempts, succeed on 3rd
        const processAlert = jest.fn()
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);
        const eqMock = jest.fn().mockResolvedValue({});
        const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
        const fromMock = jest.fn().mockReturnValue({ update: updateMock });
        require('../src/integrations/supabase').supabase.from = fromMock;
        yield (0, priceMonitor_1.monitorPrices)({ fetchActiveAlerts, fetchUser, getLatestForexPrice, processAlert });
        expect(processAlert).toHaveBeenCalledTimes(3);
        expect(updateMock).toHaveBeenCalledWith({ retry_count: 3, active: false, last_failure_reason: null });
        expect(eqMock).toHaveBeenCalledWith('id', mockAlert.id);
    }));
    it('should mark alert inactive and set last_failure_reason if all retries fail', () => __awaiter(void 0, void 0, void 0, function* () {
        const fetchActiveAlerts = jest.fn().mockResolvedValue([mockAlert]);
        const fetchUser = jest.fn().mockResolvedValue(mockUser);
        const getLatestForexPrice = jest.fn().mockResolvedValue(mockPrice);
        // All attempts fail
        const processAlert = jest.fn().mockResolvedValue(false);
        const eqMock = jest.fn().mockResolvedValue({});
        const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
        const fromMock = jest.fn().mockReturnValue({ update: updateMock });
        require('../src/integrations/supabase').supabase.from = fromMock;
        yield (0, priceMonitor_1.monitorPrices)({ fetchActiveAlerts, fetchUser, getLatestForexPrice, processAlert });
        expect(processAlert).toHaveBeenCalledTimes(3);
        expect(updateMock).toHaveBeenCalledWith({ retry_count: 3, active: false, last_failure_reason: expect.any(String) });
        expect(eqMock).toHaveBeenCalledWith('id', mockAlert.id);
    }));
});
