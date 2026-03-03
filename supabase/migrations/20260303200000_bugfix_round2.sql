-- ============================================================
-- Migration: bugfix_round2
-- Date: 2026-03-03
-- Fixes:
--   2-1: Seller memberships UPDATE → manual_override のみ許可
--   3-1: stripe_webhook_events に seller_id 列追加 → 厳密RLS
-- ============================================================

-- ─── 2-1: Seller の memberships UPDATE を manual_override のみに制限 ───
-- RLSは行レベルのみ制御可能。列レベル制限はBEFORE UPDATEトリガーで実現。
-- auth.uid() が seller_id と一致する場合（= sellerが自分の行を更新）、
-- manual_override 以外の全列を OLD 値に戻す。
-- service_role（Edge Functions / Webhook）は auth.uid() = NULL なので制約対象外。

CREATE OR REPLACE FUNCTION public.restrict_seller_membership_update()
RETURNS TRIGGER AS $$
BEGIN
  -- auth.uid() が NULL でない（= 通常の認証ユーザー）かつ seller_id 一致
  IF auth.uid() IS NOT NULL AND OLD.seller_id = auth.uid() THEN
    -- seller が変更可能: manual_override のみ
    -- それ以外は全て OLD 値に強制リバート
    NEW.id := OLD.id;
    NEW.buyer_id := OLD.buyer_id;
    NEW.plan_id := OLD.plan_id;
    NEW.seller_id := OLD.seller_id;
    NEW.status := OLD.status;
    NEW.risk_flag := OLD.risk_flag;
    NEW.dispute_status := OLD.dispute_status;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_checkout_session_id := OLD.stripe_checkout_session_id;
    NEW.current_period_end := OLD.current_period_end;
    NEW.entitlement_ends_at := OLD.entitlement_ends_at;
    NEW.grace_period_started_at := OLD.grace_period_started_at;
    NEW.grace_period_ends_at := OLD.grace_period_ends_at;
    NEW.revoke_scheduled_at := OLD.revoke_scheduled_at;
    NEW.final_payment_failure_at := OLD.final_payment_failure_at;
    NEW.deleted_at := OLD.deleted_at;
    NEW.created_at := OLD.created_at;
    -- updated_at は DB トリガーで管理されるため制限不要
    -- manual_override は上記リストに含めない → seller が変更可能
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_restrict_seller_membership_update ON public.memberships;
CREATE TRIGGER trg_restrict_seller_membership_update
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_seller_membership_update();


-- ─── 3-1: stripe_webhook_events に seller_id 列追加（LIKE 部分一致→厳密一致） ───

-- 列追加
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_webhook_events_seller_id
  ON public.stripe_webhook_events(seller_id);

-- 既存レコードの seller_id をバックフィル（payload metadata から）
UPDATE public.stripe_webhook_events
SET seller_id = (payload->'data'->'object'->'metadata'->>'seller_id')::uuid
WHERE seller_id IS NULL
  AND payload->'data'->'object'->'metadata'->>'seller_id' IS NOT NULL;

-- LIKE ベースの旧 RLS ポリシー削除 → 厳密一致に置き換え
DROP POLICY IF EXISTS "Sellers can view their own webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Sellers can view their own webhook events"
ON public.stripe_webhook_events FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- RLS 有効化（冪等）
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
