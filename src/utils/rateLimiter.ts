// src/utils/rateLimiter.ts
// Simple in-memory rate limiter (per user, per action)

const userActionTimestamps: Record<string, number[]> = {};

/**
 * Checks if a user is rate limited for a specific action.
 * @param userId - Unique user identifier (e.g., Telegram ID)
 * @param action - Action name (e.g., 'createAlert')
 * @param limit - Max allowed actions in the window
 * @param perSeconds - Time window in seconds
 * @returns true if rate limited, false otherwise
 */
export function isRateLimited(userId: string, action: string, limit: number, perSeconds: number): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  if (!userActionTimestamps[key]) userActionTimestamps[key] = [];
  // Remove timestamps outside the window
  userActionTimestamps[key] = userActionTimestamps[key].filter(ts => now - ts < perSeconds * 1000);
  if (userActionTimestamps[key].length >= limit) return true;
  userActionTimestamps[key].push(now);
  return false;
} 