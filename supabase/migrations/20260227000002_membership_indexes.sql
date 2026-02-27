-- Membership query/performance indexes required by spec
CREATE INDEX IF NOT EXISTS idx_memberships_seller_status
  ON public.memberships (seller_id, status);

CREATE INDEX IF NOT EXISTS idx_memberships_buyer_status
  ON public.memberships (buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_memberships_grace_period_ends_at
  ON public.memberships (grace_period_ends_at);
