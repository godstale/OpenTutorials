-- Add max_card column to user_progress to track the maximum card reached
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS max_card INTEGER DEFAULT 0;
