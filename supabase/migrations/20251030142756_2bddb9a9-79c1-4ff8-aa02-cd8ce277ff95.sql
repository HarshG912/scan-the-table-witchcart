-- Add login_type column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS login_type TEXT NOT NULL DEFAULT 'google' 
CHECK (login_type IN ('none', 'google', 'otp'));