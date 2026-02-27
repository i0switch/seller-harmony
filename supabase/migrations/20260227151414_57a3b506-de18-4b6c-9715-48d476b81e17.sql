-- Create a security definer function to check user role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = _user_id AND role = _role
  )
$$;

-- audit_logs: platform_admin can read all
CREATE POLICY "Platform admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- stripe_webhook_events: platform_admin can read all
CREATE POLICY "Platform admins can view all webhook events"
ON public.stripe_webhook_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- system_announcements: platform_admin can manage
CREATE POLICY "Platform admins can manage announcements"
ON public.system_announcements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'))
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- memberships: platform_admin can view all
CREATE POLICY "Platform admins can view all memberships"
ON public.memberships
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- users: platform_admin can view all
CREATE POLICY "Platform admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- seller_profiles: platform_admin can view all
CREATE POLICY "Platform admins can view all seller profiles"
ON public.seller_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- plans: platform_admin can view all
CREATE POLICY "Platform admins can view all plans"
ON public.plans
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- discord_servers: platform_admin can view all
CREATE POLICY "Platform admins can view all discord servers"
ON public.discord_servers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- stripe_connected_accounts: platform_admin can view all
CREATE POLICY "Platform admins can view all stripe accounts"
ON public.stripe_connected_accounts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));