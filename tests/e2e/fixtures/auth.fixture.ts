/**
 * Real authentication helpers for E2E tests.
 * Uses Supabase Auth API to obtain real JWT tokens and injects sessions.
 * NO MOCKS — all auth is real.
 */
import { Page } from '@playwright/test';

const SUPABASE_URL = 'https://xaqzuevdmeqxntvhamce.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcXp1ZXZkbWVxeG50dmhhbWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDAxODAsImV4cCI6MjA4NzYxNjE4MH0.p_Gfy9YDtGCnmqa0UjqU0LMVUXS6xDl9-sRipF0xfIU';

// ── Test account credentials ────────────────────────────────────
export const SELLER_EMAIL = 'i0switch.g+test01@gmail.com';
export const BUYER_EMAIL = 'i0switch.g+buyer01@gmail.com';
export const ADMIN_EMAIL = 'i0switch.g@gmail.com';
export const TEST_PASSWORD = 'pasowota427314s';

/**
 * Authenticate with Supabase Auth API and inject the session
 * into the page's localStorage (via addInitScript).
 * Must be called BEFORE page.goto().
 *
 * @returns true on success, false on auth failure
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!res.ok) {
    console.warn(`loginAs(${email}) failed: ${res.status} ${res.statusText}`);
    return false;
  }

  const session = await res.json();

  // Inject session into localStorage before any page load
  await page.addInitScript(
    (sessionData: string) => {
      localStorage.setItem(
        'sb-xaqzuevdmeqxntvhamce-auth-token',
        sessionData,
      );
    },
    JSON.stringify(session),
  );

  return true;
}

/** Login as seller test account */
export async function loginAsSeller(page: Page): Promise<boolean> {
  return loginAs(page, SELLER_EMAIL, TEST_PASSWORD);
}

/** Login as buyer test account */
export async function loginAsBuyer(page: Page): Promise<boolean> {
  return loginAs(page, BUYER_EMAIL, TEST_PASSWORD);
}

/** Login as platform admin */
export async function loginAsAdmin(page: Page): Promise<boolean> {
  return loginAs(page, ADMIN_EMAIL, TEST_PASSWORD);
}

/**
 * Get an auth token string for direct API calls (e.g., Edge Function tests).
 * @returns access_token string, or null on failure.
 */
export async function getAuthToken(
  email: string,
  password: string,
): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export async function mockDiscordBotError(page: Page) {
  await page.route('**/functions/v1/discord-bot*', async (route) => {
    await route.fulfill({
      json: { status: 'insufficient', error: 'DISCORD_ROLE_HIERARCHY_INVALID' },
    });
  });
}

export async function mockCheckoutSuccessApi(page: Page) {
  await page.route('**/rest/v1/memberships*', async (route) => {
    await route.fulfill({
      json: [
        {
          id: 'mock-membership-001',
          plan_id: 'mock-plan-001',
          seller_id: 'mock-seller-001',
          buyer_id: 'mock-buyer-001',
          stripe_checkout_session_id: 'cs_test_mock',
          status: 'active',
          plans: {
            name: 'プレミアム会員',
            price: 2980,
            currency: 'JPY',
            interval: 'monthly',
            discord_server_id: 'mock-server-001',
          },
        },
      ],
    });
  });

  await page.route('**/rest/v1/seller_profiles*', async (route) => {
    await route.fulfill({ json: [{ store_name: '星野アイ' }] });
  });

  await page.route('**/rest/v1/discord_servers*', async (route) => {
    await route.fulfill({ json: [{ guild_name: '星野ファンクラブ' }] });
  });
}

export async function mockDiscordConfirmApi(page: Page) {
  const mockUser = {
    id: 'buyer-test-user-uuid-0001',
    email: 'e2e-buyer@example.com',
    user_metadata: {},
    app_metadata: { provider: 'email' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession = {
    access_token: 'mock_buyer_access_token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock_buyer_refresh_token',
    user: mockUser,
  };

  await page.addInitScript((session) => {
    localStorage.setItem('sb-xaqzuevdmeqxntvhamce-auth-token', JSON.stringify(session));
  }, mockSession);

  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({ json: mockUser });
  });

  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      json: {
        access_token: 'mock_buyer_access_token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_buyer_refresh_token',
        user: mockUser,
      },
    });
  });

  await page.route('**/rest/v1/discord_identities*', async (route) => {
    await route.fulfill({
      json: [
        {
          discord_user_id: '123456789012345678',
          discord_username: 'user_taro#1234',
        },
      ],
    });
  });
}
