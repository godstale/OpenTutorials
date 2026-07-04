-- Add is_ai_tutor column to user_external_agents table
ALTER TABLE public.user_external_agents 
ADD COLUMN IF NOT EXISTS is_ai_tutor BOOLEAN NOT NULL DEFAULT FALSE;
