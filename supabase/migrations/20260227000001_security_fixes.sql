-- Security Fixes (Phase 2): RLS Gaps

-- 1. discord_identities: Allow users to UPSERT their own identity
ALTER TABLE public.discord_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own discord identity" ON public.discord_identities;
CREATE POLICY "Users can manage their own discord identity" ON public.discord_identities 
FOR ALL USING (auth.uid() = user_id);

-- 2. audit_logs: Restrict to platform admins
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can view all audit logs" ON public.audit_logs 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
);

-- 3. stripe_webhook_events: Restrict to platform admins
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can view webhook events" ON public.stripe_webhook_events 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
);

-- 4. role_assignments: Buyer/Seller scoped access
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view their own role assignments" ON public.role_assignments 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.id = role_assignments.membership_id 
    AND memberships.buyer_id = auth.uid()
  )
);
CREATE POLICY "Sellers can view their customers' role assignments" ON public.role_assignments 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.id = role_assignments.membership_id 
    AND memberships.seller_id = auth.uid()
  )
);

-- 5. platform_admin Protection: Trigger modification to prevent self-promotion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role user_role;
BEGIN
  -- Determine role from metadata (default to buyer)
  assigned_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role, 
    'buyer'::user_role
  );

  -- SECURITY: Prevent self-promotion to platform_admin
  IF assigned_role = 'platform_admin' THEN
    assigned_role := 'buyer'::user_role;
  END IF;

  INSERT INTO public.users (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    assigned_role
  );
  
  -- If role is seller, auto-create a profile
  IF assigned_role = 'seller' THEN
    INSERT INTO public.seller_profiles (user_id, store_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || ' Store');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
