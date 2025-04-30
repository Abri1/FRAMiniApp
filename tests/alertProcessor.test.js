"use strict";
// tests/alertProcessor.test.ts
// Unit tests for alertProcessor.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const alertProcessor_1 = require("../src/alertProcessor");
const notification = __importStar(require("../src/integrations/notification"));
// Mock logger to silence output during test
jest.mock('../src/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
describe('processAlert', () => {
    const baseAlert = {
        id: 'alert-1',
        user_id: 'user-1',
        pair: 'EURUSD',
        target_price: 1.1,
        direction: 'above',
        active: true,
        created_at: new Date().toISOString(),
    };
    const baseUser = {
        id: 'user-1',
        telegram_id: '123456',
        credits: 10,
        phone_number: '+1234567890',
        created_at: new Date().toISOString(),
    };
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('should send a voice call notification successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        jest.spyOn(notification, 'sendNotification').mockResolvedValue(true);
        const result = yield (0, alertProcessor_1.processAlert)(baseAlert, baseUser);
        expect(result).toBe(true);
        expect(notification.sendNotification).toHaveBeenCalledWith({
            to: baseUser.phone_number,
            message: expect.stringContaining('EURUSD'),
            channel: 'voice',
            telegramFallbackChatId: baseUser.telegram_id,
        });
    }));
    it('should fallback to Telegram if voice call fails', () => __awaiter(void 0, void 0, void 0, function* () {
        jest.spyOn(notification, 'sendNotification').mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        // Simulate first call fails, fallback returns true
        const result = yield (0, alertProcessor_1.processAlert)(baseAlert, baseUser);
        expect(result).toBe(false); // processAlert returns false if fallback is needed (since sendNotification handles fallback internally)
    }));
    it('should fail if user has no phone number', () => __awaiter(void 0, void 0, void 0, function* () {
        const userNoPhone = Object.assign(Object.assign({}, baseUser), { phone_number: '' });
        const result = yield (0, alertProcessor_1.processAlert)(baseAlert, userNoPhone);
        expect(result).toBe(false);
    }));
    it('should fail if user is missing telegram_id', () => __awaiter(void 0, void 0, void 0, function* () {
        const userNoTelegram = Object.assign(Object.assign({}, baseUser), { telegram_id: '' });
        const result = yield (0, alertProcessor_1.processAlert)(baseAlert, userNoTelegram);
        expect(result).toBe(false);
    }));
});
