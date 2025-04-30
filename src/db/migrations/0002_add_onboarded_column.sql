-- Add onboarded column to users table
ALTER TABLE users
  ADD COLUMN onboarded BOOLEAN NOT NULL DEFAULT FALSE; 