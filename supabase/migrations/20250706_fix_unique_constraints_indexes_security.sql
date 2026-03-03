-- Migration: fix_unique_constraints_indexes_security
-- Applied: 2025-07-06
-- Purpose: Add missing UNIQUE constraints, indexes, and fix function search_path

-- 1. UNIQUE constraint on seller_profiles.user_id (1 seller = 1 profile)
ALTER TABLE public.seller_profiles ADD CONSTRAINT seller_profiles_user_id_key UNIQUE (user_id);

-- 2. UNIQUE constraint on stripe_connected_accounts.seller_id (1 seller = 1 Stripe account)
ALTER TABLE public.stripe_connected_accounts ADD CONSTRAINT stripe_connected_accounts_seller_id_key UNIQUE (seller_id);

-- 3. Missing indexes for frequently queried FK columns
CREATE INDEX IF NOT EXISTS idx_plans_seller_id ON public.plans (seller_id);
CREATE INDEX IF NOT EXISTS idx_discord_identities_user_id ON public.discord_identities (user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processing_status ON public.stripe_webhook_events (processing_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);

-- 4. Fix search_path security warnings on functions
CREATE OR REPLACE FUNCTION public.expire_grace_period_memberships()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $$ BEGIN
  UPDATE public.memberships
  SET status = 'expired', updated_at = now()
  WHERE status = 'grace_period'
    AND grace_period_ends_at < now();
END; $$;

CREATE OR REPLACE FUNCTION public.check_grace_period_on_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$ BEGIN
  IF NEW.status = 'grace_period' AND NEW.grace_period_ends_at IS NULL THEN
    NEW.grace_period_ends_at := now() + interval '3 days';
  END IF;
  RETURN NEW;
END; $$;
