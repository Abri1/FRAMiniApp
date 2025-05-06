// src/integrations/supabase.ts
// Supabase integration for Forex Ring Alerts
// Modular, type-safe, testable, robust error handling

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from '../config';
import logger from '../logger';

const config = loadConfig();

// Ensure that sensitive data like Supabase URL and key are loaded from environment variables
export const supabase: SupabaseClient = createClient(
  config.supabaseUrl || process.env.SUPABASE_URL || '',
  config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Example: User type (customize as needed)
export interface User {
  id: string;
  telegram_id: string;
  credits: number;
  phone_number: string; // E.164 formatted phone number for voice call notifications
  created_at: string;
  username?: string;
  subscription_status?: 'active' | 'inactive';
  subscription_end?: string | null;
  max_active_alerts: number; // New field for alert cap
  created_via?: string; // Channel/campaign source for attribution
}

// Example: Alert type (customize as needed)
export interface Alert {
  id: number; // Global, auto-incrementing integer primary key
  uuid: string; // Internal unique identifier (was old id)
  user_id: string;
  pair: string;
  target_price: number;
  direction: 'above' | 'below' | null;
  active: boolean;
  created_at: string;
  notification_sent?: boolean; // Whether notification has been sent
  retry_count?: number; // Number of notification attempts (default: 0)
  last_failure_reason?: string | null; // Last failure reason if retries exhausted
  delivery_type: 'premium' | 'telegram'; // New field for alert delivery type
}

// Alert creation data type
export type AlertCreateData = Omit<Alert, 'id' | 'created_at' | 'uuid'>;

/**
 * Fetch user by Telegram ID
 * @param telegramId The Telegram user ID
 * @returns The user record or null if not found
 */
export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  if (error) {
    // Only log if it's not a 'no rows' error
    if (!(error.code === 'PGRST116' && error.details && error.details.includes('0 rows'))) {
      logger.error('Supabase getUserByTelegramId error: %o', error);
    }
    return null;
  }
  return data as User;
}

/**
 * Create a new alert for a user
 * @param alertData The alert data to create
 * @returns The created alert with its integer ID or null if error
 */
export async function createAlert(alertData: AlertCreateData): Promise<number | null> {
  const { data, error } = await supabase
    .from('alerts')
    .insert([alertData])
    .select('id')
    .single();
  if (error) {
    logger.error('Supabase createAlert error: %o', error);
    return null;
  }
  return data.id;
}

/**
 * Get all alerts for a specific user
 * @param userId The user ID
 * @param activeOnly Whether to return only active alerts (default: true)
 * @returns Array of alerts or empty array if none/error
 */
export async function getAlertsByUserId(userId: string, activeOnly = true): Promise<Alert[]> {
  let query = supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId);
    
  if (activeOnly) {
    query = query.eq('active', true);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Supabase getAlertsByUserId error: %o', error);
    return [];
  }
  
  return data as Alert[];
}

/**
 * Get a specific alert by integer ID
 * @param alertId The alert integer ID
 * @returns The alert or null if not found/error
 */
export async function getAlertById(alertId: number): Promise<Alert | null> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .single();
  if (error) {
    if (error.details && error.details.includes('0 rows')) {
      return null;
    }
    logger.error('Supabase getAlertById error: %o', error);
    return null;
  }
  return data as Alert;
}

/**
 * Soft delete an alert by ID (set active = false)
 * @param alertId The alert ID to soft delete
 * @returns True if successful, false otherwise
 */
export async function deleteAlert(alertId: number): Promise<boolean> {
  const { error } = await supabase
    .from('alerts')
    .update({ active: false })
    .eq('id', alertId);
  if (error) {
    logger.error('Supabase deleteAlert (soft) error: %o', error);
    return false;
  }
  return true;
}

/**
 * Update an alert's status
 * @param alertId The alert integer ID to update
 * @param updates The properties to update
 * @returns True if successful, false otherwise
 */
export async function updateAlert(
  alertId: number,
  updates: Partial<Omit<Alert, 'id' | 'user_id' | 'created_at' | 'uuid'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('alerts')
    .update(updates)
    .eq('id', alertId);
  if (error) {
    logger.error('Supabase updateAlert error: %o', error);
    return false;
  }
  return true;
}

/**
 * Create a new user
 * @param userData The user data to create
 * @returns The created user ID or null if error
 */
export async function createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .insert([{ ...userData, username: userData.username ?? undefined }])
    .select('id')
    .single();
  
  if (error) {
    logger.error('Supabase createUser error: %o', error);
    return null;
  }
  
  return data.id;
}

/**
 * Update user credits
 * @param userId The user ID
 * @param newCredits The new credit balance
 * @returns True if successful, false otherwise
 */
export async function updateUserCredits(userId: string, newCredits: number): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ credits: newCredits })
    .eq('id', userId);
  
  if (error) {
    logger.error('Supabase updateUserCredits error: %o', error);
    return false;
  }
  
  return true;
}

/**
 * Update user's phone number
 * @param telegramId The Telegram user ID
 * @param phoneNumber The new phone number (E.164 format)
 * @returns True if successful, false otherwise
 */
export async function updateUserPhoneNumber(telegramId: string, phoneNumber: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ phone_number: phoneNumber })
    .eq('telegram_id', telegramId);

  if (error) {
    logger.error('Supabase updateUserPhoneNumber error: %o', error);
    return false;
  }
  return true;
}

/**
 * Update user's Telegram username
 * @param telegramId The Telegram user ID
 * @param username The new username (or null if not set)
 * @returns True if successful, false otherwise
 */
export async function updateUserUsername(telegramId: string, username: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ username })
    .eq('telegram_id', telegramId);

  if (error) {
    logger.error('Supabase updateUserUsername error: %o', error);
    return false;
  }
  return true;
}

export function isUserSubscriptionActive(user: User): boolean {
  if (user.subscription_status !== 'active' || !user.subscription_end) return false;
  return new Date(user.subscription_end) > new Date();
}

/**
 * Insert a transaction (revenue event) for a user
 * @param params Transaction details
 * @returns True if successful, false otherwise
 */
export async function insertTransaction(params: {
  user_id: string;
  amount: number;
  currency?: string;
  type: string;
  status?: string;
  payment_provider?: string;
  external_reference?: string;
  affiliate?: string;
  notes?: string;
  expected_unit_cost?: number;
  expected_total_cost?: number;
}): Promise<boolean> {
  const { user_id, amount, currency = 'USD', type, status = 'completed', payment_provider, external_reference, affiliate, notes, expected_unit_cost, expected_total_cost } = params;
  const { error } = await supabase
    .from('transactions')
    .insert([{
      user_id,
      amount,
      currency,
      type,
      status,
      payment_provider,
      external_reference,
      affiliate,
      notes,
      expected_unit_cost,
      expected_total_cost
    }]);
  if (error) {
    logger.error('Supabase insertTransaction error: %o', error);
    return false;
  }
  return true;
}

/**
 * Update last_active_at for a user
 * @param telegramId The Telegram user ID
 * @returns True if successful, false otherwise
 */
export async function updateLastActiveAt(telegramId: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('telegram_id', telegramId);
  if (error) {
    logger.error('Supabase updateLastActiveAt error: %o', error);
    return false;
  }
  return true;
}

/**
 * Update last_alert_triggered_at for a user
 * @param userId The user ID
 * @returns True if successful, false otherwise
 */
export async function updateLastAlertTriggeredAt(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ last_alert_triggered_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    logger.error('Supabase updateLastAlertTriggeredAt error: %o', error);
    return false;
  }
  return true;
}

/**
 * Update user's country
 * @param telegramId The Telegram user ID
 * @param country The ISO 2-letter country code
 * @returns True if successful, false otherwise
 */
export async function updateUserCountry(telegramId: string, country: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ country })
    .eq('telegram_id', telegramId);
  if (error) {
    logger.error('Supabase updateUserCountry error: %o', error);
    return false;
  }
  return true;
}

/**
 * Update user's phone number and country (atomic)
 * @param telegramId The Telegram user ID
 * @param phoneNumber The new phone number (E.164 format)
 * @param country The ISO 2-letter country code
 * @returns True if successful, false otherwise
 */
export async function updateUserPhoneAndCountry(telegramId: string, phoneNumber: string, country: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ phone_number: phoneNumber, country })
    .eq('telegram_id', telegramId);
  if (error) {
    logger.error('Supabase updateUserPhoneAndCountry error: %o', error);
    return false;
  }
  return true;
}

/**
 * Update user's Twilio voice rate
 * @param telegramId The Telegram user ID
 * @param twilioVoiceRate The Twilio voice rate (price per minute)
 * @returns True if successful, false otherwise
 */
export async function updateUserTwilioVoiceRate(telegramId: string, twilioVoiceRate: number): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ twilio_voice_rate: twilioVoiceRate })
    .eq('telegram_id', telegramId);
  if (error) {
    logger.error('Supabase updateUserTwilioVoiceRate error: %o', error);
    return false;
  }
  return true;
}

/**
 * Update user's phone number, country, and Twilio voice rate (atomic)
 * @param telegramId The Telegram user ID
 * @param phoneNumber The new phone number (E.164 format)
 * @param country The ISO 2-letter country code
 * @param twilioVoiceRate The Twilio voice rate (price per minute)
 * @returns True if successful, false otherwise
 */
export async function updateUserPhoneCountryAndRate(telegramId: string, phoneNumber: string, country: string, twilioVoiceRate: number): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ phone_number: phoneNumber, country, twilio_voice_rate: twilioVoiceRate })
    .eq('telegram_id', telegramId);
  if (error) {
    logger.error('Supabase updateUserPhoneCountryAndRate error: %o', error);
    return false;
  }
  return true;
}
