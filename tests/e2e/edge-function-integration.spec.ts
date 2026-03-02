import { test, expect } from '@playwright/test';

/**
 * Edge Function Integration Tests (EF-08, EF-12, EF-13, EF-14, EF-15, EF-17, EF-20, EF-23)
 * 
 * These tests verify Edge Function behavior via direct HTTP requests.
 * Tests that require Stripe CLI (EF-01〜EF-07, EF-09〜EF-11) are marked as manual.
 * Tests here focus on auth, validation, and error handling.
 */

const SUPABASE_URL = 'https://xaqzuevdmeqxntvhamce.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcXp1ZXZkbWVxeG50dmhhbWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NjMyMTUsImV4cCI6MjA2MjQzOTIxNX0.p_Gfy9YDtGCnmqa0UjqU0LMVUXS6xDl9-sRipF0xfIU';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Helper: Login and get JWT token
async function getAuthToken(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

test.describe('Edge Function Integration Tests', () => {

  // ── EF-14: stripe-checkout 未認証リクエスト拒否 ───
  test('EF-14: stripe-checkout rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post(`${FUNCTIONS_URL}/stripe-checkout`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      data: { plan_id: 'test-plan-id' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  // ── EF-14b: stripe-checkout rejects invalid Bearer token ───
  test('EF-14b: stripe-checkout rejects invalid Bearer token', async ({ request }) => {
    const res = await request.post(`${FUNCTIONS_URL}/stripe-checkout`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer invalid-token-here',
      },
      data: { plan_id: 'test-plan-id' },
    });
    // Should get 400 (user auth fails) or 401
    expect([400, 401]).toContain(res.status());
  });

  // ── EF-13: stripe-checkout 削除済みプラン拒否 (BUG-07 fix) ───
  test('EF-13: stripe-checkout rejects non-existent plan_id', async ({ request }) => {
    const token = await getAuthToken('i0switch.g+buyer01@gmail.com', 'pasowota427314s');
    test.skip(!token, 'Could not get buyer auth token');

    const res = await request.post(`${FUNCTIONS_URL}/stripe-checkout`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      data: { plan_id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  // ── EF-14c: stripe-checkout requires plan_id ───
  test('EF-14c: stripe-checkout requires plan_id parameter', async ({ request }) => {
    const token = await getAuthToken('i0switch.g+buyer01@gmail.com', 'pasowota427314s');
    test.skip(!token, 'Could not get buyer auth token');

    const res = await request.post(`${FUNCTIONS_URL}/stripe-checkout`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('plan_id');
  });

  // ── EF-17: stripe-onboarding バイヤーロール拒否 (BUG-08 fix) ───
  test('EF-17: stripe-onboarding rejects buyer role (BUG-08)', async ({ request }) => {
    const token = await getAuthToken('i0switch.g+buyer01@gmail.com', 'pasowota427314s');
    test.skip(!token, 'Could not get buyer auth token');

    const res = await request.post(`${FUNCTIONS_URL}/stripe-onboarding`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      data: {},
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  // ── EF-17b: stripe-onboarding 未認証拒否 ───
  test('EF-17b: stripe-onboarding rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post(`${FUNCTIONS_URL}/stripe-onboarding`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  // ── EF-08: stripe-webhook 署名検証失敗 ───
  test('EF-08: stripe-webhook rejects invalid signature', async ({ request }) => {
    const res = await request.post(`${FUNCTIONS_URL}/stripe-webhook`, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'invalid-signature',
      },
      data: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // ── EF-08b: stripe-webhook rejects missing signature ───
  test('EF-08b: stripe-webhook rejects missing Stripe-Signature header', async ({ request }) => {
    const res = await request.post(`${FUNCTIONS_URL}/stripe-webhook`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing Stripe-Signature');
  });

  // ── EF-23: discord-bot 非セラーロール拒否 ───
  test('EF-23: discord-bot rejects non-seller role', async ({ request }) => {
    const token = await getAuthToken('i0switch.g+buyer01@gmail.com', 'pasowota427314s');
    test.skip(!token, 'Could not get buyer auth token');

    const res = await request.post(`${FUNCTIONS_URL}/discord-bot`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      data: { action: 'validate_bot_permission', guild_id: '123', role_id: '456' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  // ── EF-23b: discord-bot 未認証拒否 ───
  test('EF-23b: discord-bot rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post(`${FUNCTIONS_URL}/discord-bot`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      data: { action: 'validate_bot_permission', guild_id: '123', role_id: '456' },
    });
    expect(res.status()).toBe(401);
  });

  // ── EF-20: discord-oauth state パラメータ CSRF 検証 ───
  test('EF-20: discord-oauth rejects missing state parameter', async ({ request }) => {
    const token = await getAuthToken('i0switch.g+buyer01@gmail.com', 'pasowota427314s');
    test.skip(!token, 'Could not get buyer auth token');

    const res = await request.post(`${FUNCTIONS_URL}/discord-oauth`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      data: { code: 'fake-code', state: '' },
    });
    // Should fail with state-related error
    expect([400, 403]).toContain(res.status());
  });

  // ── EF-20b: discord-oauth rejects invalid state ───
  test('EF-20b: discord-oauth rejects mismatched state (CSRF protection)', async ({ request }) => {
    const token = await getAuthToken('i0switch.g+buyer01@gmail.com', 'pasowota427314s');
    test.skip(!token, 'Could not get buyer auth token');

    const res = await request.post(`${FUNCTIONS_URL}/discord-oauth`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      data: { code: 'fake-code', state: 'definitely-not-the-right-state' },
    });
    expect([400, 403]).toContain(res.status());
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // ── discord-oauth 未認証拒否 ───
  test('discord-oauth rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post(`${FUNCTIONS_URL}/discord-oauth`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      data: {},
    });
    expect(res.status()).toBe(401);
  });
});
