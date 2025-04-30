// src/config/index.ts
// Centralized configuration loader for Forex Ring Alerts
// Follows global rules: modular, testable, secure

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export type AppConfig = {
  telegramBotToken: string;
  forexApiKey: string;
  forexApiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  sentryDsn: string;
  nodeEnv: string;
  port: number;
};

export function loadConfig(): AppConfig {
  // Validate and normalize config
  const cfg: AppConfig = {
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
