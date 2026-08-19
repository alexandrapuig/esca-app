-- Add profile fields to users table (dietary_restrictions already exists).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS name text;

COMMENT ON COLUMN public.users.name IS 'User display name';
