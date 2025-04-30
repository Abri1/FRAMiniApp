"use strict";
// Main entrypoint for Forex Ring Alerts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_1 = __importDefault(require("./logger"));
const webhook_1 = require("./api/webhook");
const supabase_1 = require("./integrations/supabase");
const telegram_1 = require("./integrations/telegram");
const config_1 = require("./config");
const config = (0, config_1.loadConfig)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Check DB connectivity
    let dbStatus = 'ok';
    try {
        const { error } = yield supabase_1.supabase.from('users').select('id').limit(1);
        if (error)
            dbStatus = 'error';
    }
    catch (_a) {
        dbStatus = 'error';
    }
    // Check Telegram bot connectivity
    let telegramStatus = 'ok';
    try {
        const botInfo = yield (0, telegram_1.getBotInfo)();
        if (!botInfo)
            telegramStatus = 'error';
    }
    catch (_b) {
        telegramStatus = 'error';
    }
    // TODO: Add Polygon.io and Twilio checks if needed
    res.json({
        status: 'ok',
        db: dbStatus,
        telegram: telegramStatus,
        // polygon: 'todo',
        // twilio: 'todo',
        timestamp: new Date().toISOString(),
    });
}));
// Telegram webhook endpoint
app.post('/telegram/webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    (0, webhook_1.handleTelegramWebhook)(req.body)
        .catch(err => logger_1.default.error('Unhandled webhook error: %o', err));
    res.status(200).send('OK');
}));
app.listen(PORT, () => {
    logger_1.default.info(`Forex Ring Alerts service listening on port ${PORT}`);
});
