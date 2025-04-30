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
  onboarded: boolean;
}

// Example: Alert type (customize as needed)
export interface Alert {
  id: string;
  user_id: string;
  pair: string;
  target_price: number;
  direction: 'above' | 'below';
  active: boolean;
  created_at: string;
  notification_sent?: boolean; // Whether notification has been sent
  retry_count?: number; // Number of notification attempts (default: 0)
  last_failure_reason?: string | null; // Last failure reason if retries exhausted
}

// Alert creation data type
export type AlertCreateData = Omit<Alert, 'id' | 'created_at'>;

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
    if (error.code === 'PGRST116') {
      logger.info('No user found for Telegram ID %s (PGRST116): onboarding required.', telegramId);
    } else {
      logger.error('Supabase getUserByTelegramId error: %o', error);
    }
    return null;
  }
  return data as User;
}

/**
 * Create a new alert for a user
 * @param alertData The alert data to create
 * @returns The created alert with its ID or null if error
 */
export async function createAlert(alertData: AlertCreateData): Promise<string | null> {
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
 * Get a specific alert by ID
 * @param alertId The alert ID
 * @returns The alert or null if not found/error
 */
export async function getAlertById(alertId: string): Promise<Alert | null> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .single();
  
  if (error) {
    logger.error('Supabase getAlertById error: %o', error);
    return null;
  }
  
  return data as Alert;
}

/**
 * Delete an alert by ID
 * @param alertId The alert ID to delete
 * @returns True if successful, false otherwise
 */
export async function deleteAlert(alertId: string): Promise<boolean> {
  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', alertId);
  
  if (error) {
    logger.error('Supabase deleteAlert error: %o', error);
    return false;
  }
  
  return true;
}

/**
 * Update an alert's status
 * @param alertId The alert ID to update
 * @param updates The properties to update
 * @returns True if successful, false otherwise
 */
export async function updateAlert(
  alertId: string, 
  updates: Partial<Omit<Alert, 'id' | 'user_id' | 'created_at'>>
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
    .insert([userData])
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
 * Set user's onboarded status
 * @param telegramId The Telegram user ID
 * @param onboarded Boolean indicating if the user is onboarded
 * @returns True if successful, false otherwise
 */
export async function setUserOnboarded(telegramId: string, onboarded: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ onboarded })
    .eq('telegram_id', telegramId);

  if (error) {
    logger.error('Supabase setUserOnboarded error: %o', error);
    return false;
  }
  return true;
}
