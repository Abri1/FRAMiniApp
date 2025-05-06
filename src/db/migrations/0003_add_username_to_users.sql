-- Add username column to users table for Telegram usernames
ALTER TABLE users
  ADD COLUMN username TEXT; 