-- ============================================================
-- Migration: bugfix_rls_and_memberships
-- Date: 2026-03-03
-- Fixes: BUG-C01, INV-01, seller_profiles public policy
-- ============================================================

-- ─── BUG-C01: Fix "Public can view published plans" RLS policy ───
-- The existing policy references a non-existent `status` column.
-- The plans table uses `is_public` (boolean) + `deleted_at` (timestamptz).
DROP POLICY IF EXISTS "Public can view published plans" ON public.plans;
CREATE POLICY "Public can view published plans"
ON public.plans FOR SELECT
USING (is_public = true AND deleted_at IS NULL);

-- ─── Fix seller_profiles public policy ───
-- seller_profiles uses `status = 'active'` — verify this column exists.
-- The column exists in seller_profiles, so this policy is correct. No change needed.

-- ─── INV-01: Add missing memberships RLS policies for sellers and buyers ───
-- Currently only platform_admin has a SELECT policy on memberships.
-- Sellers need SELECT + UPDATE for their own members.
-- Buyers need SELECT for their own memberships.

-- Seller can view their own members
DROP POLICY IF EXISTS "Sellers can view their own memberships" ON public.memberships;
CREATE POLICY "Sellers can view their own memberships"
ON public.memberships FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Seller can update their own members (e.g., manual_override)
DROP POLICY IF EXISTS "Sellers can update their own memberships" ON public.memberships;
CREATE POLICY "Sellers can update their own memberships"
ON public.memberships FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Buyer can view their own memberships
DROP POLICY IF EXISTS "Buyers can view their own memberships" ON public.memberships;
CREATE POLICY "Buyers can view their own memberships"
ON public.memberships FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Ensure RLS is enabled on memberships (idempotent)
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- ─── Add seller-scoped webhook events policy ───
-- Sellers should be able to view webhook events related to their account.
-- For now, we add a policy that allows viewing events containing their seller_id.
-- This enables proper server-side filtering instead of client-side.
DROP POLICY IF EXISTS "Sellers can view their own webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Sellers can view their own webhook events"
ON public.stripe_webhook_events FOR SELECT
TO authenticated
USING (
  payload::text LIKE '%' || auth.uid()::text || '%'
);

-- ─── INV-02: Enable pg_cron for grace_period expiry ───
-- The expire_grace_period_memberships() function exists but pg_cron is not scheduled.
-- Run the following in the Supabase SQL editor after enabling the pg_cron extension:
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'expire-grace-periods',
--   '*/30 * * * *',
--   'SELECT public.expire_grace_period_memberships()'
-- );
--
-- This runs every 30 minutes to catch expired grace_period memberships.
