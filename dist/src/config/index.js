"use strict";
// src/config/index.ts
// Centralized configuration loader for Forex Ring Alerts
// Follows global rules: modular, testable, secure
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env
const envPath = path_1.default.resolve(process.cwd(), '.env');
if (fs_1.default.existsSync(envPath)) {
    dotenv_1.default.config({ path: envPath });
}
function loadConfig() {
    // Validate and normalize config
    const cfg = {
        telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
        forexApiKey: process.env.FOREX_API_KEY || '',
        forexApiUrl: process.env.FOREX_API_URL || '',
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
        twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
        sentryDsn: process.env.SENTRY_DSN || '',
        nodeEnv: process.env.NODE_ENV || 'development',
        port: Number(process.env.PORT) || 3000,
    };
    // Optionally: throw if required config is missing
    return cfg;
}
