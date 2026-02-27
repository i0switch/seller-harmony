-- Add new statuses to subscription_status enum
-- Note: Postgres doesn't allow ALTER TYPE ADD VALUE in a transaction block. 
-- However, Supabase migrations usually allow this if not wrapped in BEGIN/COMMIT.
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'pending_discord';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'grace_period';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'cancel_scheduled';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'refunded';

-- Update memberships table
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS grace_period_started_at timestamptz;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS final_payment_failure_at timestamptz;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS revoke_scheduled_at timestamptz;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS entitlement_ends_at timestamptz;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS risk_flag boolean DEFAULT false;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS dispute_status text;

-- Update plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update audit_logs check constraint
-- First, check if the constraint exists, if so drop and recreate to include more actions if needed.
-- For now, we just ensure it's logged correctly.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'audit_logs' AND constraint_name = 'audit_logs_action_check') THEN
        ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check 
        CHECK (action IN ('create', 'update', 'delete', 'cancel', 'refund', 'grant_role', 'revoke_role', 'override'));
    END IF;
END $$;
