-- ============================================================
-- Migration: seller_webhook_surface_minimize
-- Date: 2026-03-03
-- Purpose: block seller direct SELECT on raw webhook payload
-- ============================================================

-- 1) Remove seller direct SELECT path from base webhook table.
DROP POLICY IF EXISTS "Sellers can view their own webhook events" ON public.stripe_webhook_events;

-- 2) Provide a minimal read surface for seller webhook UI.
-- View intentionally excludes raw payload and other internal columns.
CREATE OR REPLACE VIEW public.seller_webhook_events_public AS
SELECT
  w.id,
  w.seller_id,
  w.event_type,
  w.processing_status,
  w.error_message,
  w.created_at,
  w.stripe_event_id
FROM public.stripe_webhook_events AS w
WHERE w.seller_id = auth.uid();

GRANT SELECT ON public.seller_webhook_events_public TO authenticated;