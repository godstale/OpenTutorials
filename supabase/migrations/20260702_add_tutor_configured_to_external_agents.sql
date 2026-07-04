-- Add is_tutor_configured column to user_external_agents table
ALTER TABLE public.user_external_agents 
ADD COLUMN IF NOT EXISTS is_tutor_configured BOOLEAN NOT NULL DEFAULT FALSE;
