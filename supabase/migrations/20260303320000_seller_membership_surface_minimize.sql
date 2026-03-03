-- ============================================================
-- Migration: seller_membership_surface_minimize
-- Date: 2026-03-03
-- Purpose: block seller direct SELECT on sensitive membership billing identifiers
-- ============================================================

-- 1) Remove direct seller SELECT path from base table.
DROP POLICY IF EXISTS "Sellers can view their own memberships" ON public.memberships;

-- 2) Provide a minimal read surface for seller UI.
-- View intentionally excludes stripe_customer_id / stripe_subscription_id / stripe_checkout_session_id.
CREATE OR REPLACE VIEW public.seller_memberships_public AS
SELECT
  m.id,
  m.buyer_id,
  m.plan_id,
  m.seller_id,
  m.status,
  m.created_at,
  m.updated_at
FROM public.memberships AS m
WHERE m.seller_id = auth.uid();

GRANT SELECT ON public.seller_memberships_public TO authenticated;