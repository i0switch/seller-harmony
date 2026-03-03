-- Add unique constraint to membership_id to ensure one record per membership
-- This is required for the backend upsert logic to work correctly when tracking role status.
ALTER TABLE public.role_assignments ADD CONSTRAINT role_assignments_membership_id_key UNIQUE (membership_id);
