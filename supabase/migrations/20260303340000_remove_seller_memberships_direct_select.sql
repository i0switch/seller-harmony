-- ============================================================
-- Migration: remove_seller_memberships_direct_select
-- Date: 2026-03-03
-- Purpose: remove seller direct SELECT on memberships table
-- ============================================================

DROP POLICY IF EXISTS "Sellers can view memberships of their plans" ON public.memberships;
DROP POLICY IF EXISTS "Sellers can view their own memberships" ON public.memberships;