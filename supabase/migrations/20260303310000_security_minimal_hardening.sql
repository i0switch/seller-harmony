-- ============================================================
-- Migration: security_minimal_hardening
-- Date: 2026-03-03
-- Purpose: pre-release risk reduction for sensitive exposure points
-- ============================================================

-- 1) discord_identities: stop plaintext token retention
ALTER TABLE public.discord_identities
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;

-- Existing plaintext tokens are nulled to reduce immediate exposure risk.
-- Re-link OAuth if token refresh is required after this migration.
UPDATE public.discord_identities
SET access_token = NULL,
    refresh_token = NULL
WHERE access_token IS NOT NULL
   OR refresh_token IS NOT NULL;


-- 2) stripe_connected_accounts.requirements_due normalization
-- Keep only minimal string-key arrays (drop nested objects that may carry PII).
CREATE OR REPLACE FUNCTION public.normalize_requirements_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized jsonb;
BEGIN
  IF NEW.requirements_due IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.requirements_due) <> 'array' THEN
    NEW.requirements_due := NULL;
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    jsonb_agg(to_jsonb(v)),
    '[]'::jsonb
  )
  INTO normalized
  FROM (
    SELECT elem #>> '{}' AS v
    FROM jsonb_array_elements(NEW.requirements_due) AS elem
    WHERE jsonb_typeof(elem) = 'string'
      AND length(elem #>> '{}') BETWEEN 1 AND 120
  ) AS s;

  NEW.requirements_due := normalized;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_requirements_due ON public.stripe_connected_accounts;
CREATE TRIGGER trg_normalize_requirements_due
  BEFORE INSERT OR UPDATE OF requirements_due
  ON public.stripe_connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_requirements_due();

-- Backfill existing rows with the same normalization rules.
UPDATE public.stripe_connected_accounts
SET requirements_due = CASE
  WHEN requirements_due IS NULL THEN NULL
  WHEN jsonb_typeof(requirements_due) <> 'array' THEN NULL
  ELSE (
    SELECT COALESCE(
      jsonb_agg(to_jsonb(v)),
      '[]'::jsonb
    )
    FROM (
      SELECT elem #>> '{}' AS v
      FROM jsonb_array_elements(requirements_due) AS elem
      WHERE jsonb_typeof(elem) = 'string'
        AND length(elem #>> '{}') BETWEEN 1 AND 120
    ) AS s
  )
END;


-- 3) stripe_webhook_events.payload minimization for existing records
UPDATE public.stripe_webhook_events
SET payload = jsonb_strip_nulls(
  jsonb_build_object(
    'id', payload->>'id',
    'type', payload->>'type',
    'account', payload->>'account',
    'created', payload->'created',
    'livemode', payload->'livemode',
    'api_version', payload->>'api_version',
    'data', jsonb_build_object(
      'object', jsonb_strip_nulls(
        jsonb_build_object(
          'id', payload->'data'->'object'->>'id',
          'object', payload->'data'->'object'->>'object',
          'subscription', payload->'data'->'object'->>'subscription',
          'customer', payload->'data'->'object'->>'customer',
          'invoice', payload->'data'->'object'->>'invoice',
          'metadata', jsonb_strip_nulls(
            jsonb_build_object(
              'seller_id', payload->'data'->'object'->'metadata'->>'seller_id',
              'buyer_id', payload->'data'->'object'->'metadata'->>'buyer_id',
              'plan_id', payload->'data'->'object'->'metadata'->>'plan_id'
            )
          )
        )
      )
    )
  )
)
WHERE payload IS NOT NULL;


-- 4) Enforce strict non-public audit_logs SELECT policy
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Platform admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role = 'platform_admin'
  )
);


-- 5) Fix missing search_path on SECURITY DEFINER functions
DO $$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public';
  END IF;

  IF to_regprocedure('public.expire_grace_period_memberships()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.expire_grace_period_memberships() SET search_path = public';
  END IF;

  IF to_regprocedure('public.check_grace_period_on_update()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.check_grace_period_on_update() SET search_path = public';
  END IF;

  IF to_regprocedure('public.restrict_seller_membership_update()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.restrict_seller_membership_update() SET search_path = public';
  END IF;
END;
$$;