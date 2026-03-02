-- ============================================================
-- Production Readiness Fixes
-- BUG-11: system_announcements SELECT policy for buyer/seller
-- BUG-12: grace_period → expired automatic transition
-- BUG-09: discord_identities empty string CHECK constraint
-- DB-01:  memberships.current_period_end allow NULL
-- ============================================================

-- ─── BUG-11: Add SELECT policy for system_announcements ───
-- Allow all authenticated users to read published announcements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'system_announcements' 
    AND policyname = 'Published announcements are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Published announcements are viewable by all authenticated users"
      ON public.system_announcements
      FOR SELECT
      TO authenticated
      USING (is_published = true);
  END IF;
END $$;

-- ─── BUG-09: Prevent empty discord_user_id ───
-- Add CHECK constraint to prevent empty string (NULL is allowed for placeholder rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'discord_identities_discord_user_id_not_empty'
  ) THEN
    -- First, clean up any existing empty strings by setting them to NULL
    UPDATE public.discord_identities 
    SET discord_user_id = NULL 
    WHERE discord_user_id = '';

    ALTER TABLE public.discord_identities
      ADD CONSTRAINT discord_identities_discord_user_id_not_empty
      CHECK (discord_user_id IS NULL OR discord_user_id <> '');
  END IF;
END $$;

-- ─── DB-01: Ensure current_period_end allows NULL ───
-- (Subscriptions may not have period_end at creation time)
ALTER TABLE public.memberships 
  ALTER COLUMN current_period_end DROP NOT NULL;

-- ─── BUG-12: Create function + cron for grace_period expiry ───
-- Function to transition expired grace_period memberships to 'expired'
CREATE OR REPLACE FUNCTION public.expire_grace_period_memberships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.memberships
  SET status = 'expired',
      entitlement_ends_at = now()
  WHERE status = 'grace_period'
    AND grace_period_ends_at IS NOT NULL
    AND grace_period_ends_at < now();
END;
$$;

-- Enable pg_cron extension if available (Supabase has it)
-- Note: pg_cron must be enabled in Supabase dashboard → Extensions
-- Once enabled, schedule the job:
-- SELECT cron.schedule('expire-grace-periods', '*/30 * * * *', 'SELECT public.expire_grace_period_memberships()');
-- This runs every 30 minutes to catch expired grace_period memberships

-- For immediate availability without pg_cron, also create a DB trigger
-- that checks on any membership update
CREATE OR REPLACE FUNCTION public.check_grace_period_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If any membership is being read/updated, also expire old grace periods
  IF NEW.status = 'grace_period' 
     AND NEW.grace_period_ends_at IS NOT NULL 
     AND NEW.grace_period_ends_at < now() THEN
    NEW.status := 'expired';
    NEW.entitlement_ends_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_check_grace_period ON public.memberships;
CREATE TRIGGER trg_check_grace_period
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.check_grace_period_on_update();
