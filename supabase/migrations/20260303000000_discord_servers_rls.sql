-- Add RLS policies so sellers can manage their own discord_servers

CREATE POLICY "Sellers can view own discord servers"
ON public.discord_servers
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

CREATE POLICY "Sellers can update own discord servers"
ON public.discord_servers
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'))
WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Sellers can insert own discord servers"
ON public.discord_servers
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'));
