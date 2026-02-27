# Security Review Report (Phase 2)

## Executive Summary
A comprehensive security and infrastructure audit was performed on the Supabase configuration and Edge Functions. While core logic follows best practices (fail-closed, environment secrets), several Row Level Security (RLS) gaps and minor logic refinements were identified to strictly enforce multi-tenancy and data integrity.

## Audit Findings

### 1. Row Level Security (RLS) Gaps
Several tables have RLS enabled but lack comprehensive policies for all operations, or have no RLS enabled at all.

| Table | Finding | Risk | Remediation |
|---|---|---|---|
| `discord_identities` | Missing `INSERT/UPDATE` policies for users. | **MEDIUM**: Users cannot link their own Discord accounts via the frontend client. | Add `FOR ALL` policy with `auth.uid() = user_id`. |
| `audit_logs` | No RLS policies defined. | **LOW**: Data leakage (though currently only accessible via service role). | Enable RLS and restrict `SELECT` to `platform_admin`. Disable `INSERT/UPDATE` for users. |
| `stripe_webhook_events` | No RLS policies defined. | **LOW**: Internal event logs could be exposed. | Enable RLS and restrict to service role / admin only. |
| `role_assignments` | No RLS policies defined. | **LOW**: Role assignment history exposure. | Enable RLS. Allow buyers to see their own, sellers to see their customers. |

### 2. Edge Function Security
Audit of `supabase/functions/` code.

| Function | Finding | Risk | Remediation |
|---|---|---|---|
| `discord-oauth` | `state` parameter was optional. | **HIGH**: CSRF vulnerability in OAuth flow. | (FIXED) Enforced `state` parameter verification and confirmation step. |
| `discord-bot` | Missing ownership check before calling Discord API. | **LOW**: Potential metadata probing of other guilds. | Verify that the `guild_id` belongs to the requesting `seller_id` in the DB before making external API requests. |
| `stripe-webhook` | Signature verification logic. | **LOW**: None. | (VERIFIED) Signature verification is implemented correctly (Fail-Closed). |

### 3. Tenant Isolation
- **Status**: Generally well-enforced via `seller_id` and `buyer_id` checks.
- **Improvement**: Ensure all future tables follow the `seller_id` column convention for RLS consistency.

## Remediation Plan

### Immediate Fixes (Next Step)
1. Apply a migration to fix RLS gaps on `discord_identities`, `audit_logs`, `stripe_webhook_events`, and `role_assignments`.
2. Update `discord-bot` function to add a DB-level ownership check for `guild_id`.

### Verification
- Run manual tests to ensure users can link Discord identities.
- Attempt unauthorized access to `audit_logs` via anon/authenticated user keys.
