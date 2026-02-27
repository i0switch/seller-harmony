ALTER TABLE public.discord_identities 
ADD COLUMN IF NOT EXISTS oauth_state text,
ADD COLUMN IF NOT EXISTS oauth_state_created_at timestamp with time zone;