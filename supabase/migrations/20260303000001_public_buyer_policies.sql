-- Allow public read access to published plans
CREATE POLICY "Public can view published plans"
ON public.plans FOR SELECT
USING (status = 'published' AND deleted_at IS NULL);

-- Allow public read access to active seller profiles so buyers can see who they are buying from
CREATE POLICY "Public can view active seller profiles"
ON public.seller_profiles FOR SELECT
USING (status = 'active');
