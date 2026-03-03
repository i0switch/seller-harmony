-- ============================================================
-- Migration: add default_role_id to discord_servers
-- Date: 2026-03-03
-- Purpose:
--   Persist seller onboarding Discord role setting for restore on revisit
-- ============================================================

ALTER TABLE public.discord_servers
  ADD COLUMN IF NOT EXISTS default_role_id TEXT;
