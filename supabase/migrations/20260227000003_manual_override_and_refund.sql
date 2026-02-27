-- Add manual_override column to memberships (required by stripe-webhook role-conflict logic)
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS manual_override boolean DEFAULT false;

-- Add payment_failed status if missing (needed for grace_period → payment_failed transition)
-- NOTE: subscription_status enum should already include this from the initial migration.
-- If not present, it will fail harmlessly.
-- ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'payment_failed';

-- Add composite index for role_assignments (spec requirement: discord_user_id + guild_id + actual_state)
CREATE INDEX IF NOT EXISTS idx_role_assignments_discord_guild_state
  ON public.role_assignments (discord_user_id, guild_id, actual_state);

-- Add oauth_state columns to discord_identities for server-side CSRF validation
ALTER TABLE public.discord_identities ADD COLUMN IF NOT EXISTS oauth_state text;
ALTER TABLE public.discord_identities ADD COLUMN IF NOT EXISTS oauth_state_created_at timestamptz;
