import { Page } from '@playwright/test';

/** Mock the Supabase Auth endpoints to bypass real login / DB errors */
export async function mockSellerAuth(page: Page) {
    const mockUser = {
        id: 'e162ab9d-2ff2-4e02-b68e-55471e4b7b91',
        email: 'e2e-seller@example.com',
        user_metadata: { role: 'seller' },
        app_metadata: { provider: 'email' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
    };

    // POST /auth/v1/token  (password sign-in)
    await page.route('**/auth/v1/token*', async (route) => {
        await route.fulfill({
            json: {
                access_token: 'mock_access_token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'mock_refresh_token',
                user: mockUser,
            },
        });
    });

    // GET /auth/v1/user  (getUser())
    await page.route('**/auth/v1/user*', async (route) => {
        await route.fulfill({ json: mockUser });
    });

    // GET /rest/v1/users?select=role&id=eq.<uid>
    await page.route('**/rest/v1/users*', async (route) => {
        await route.fulfill({
            json: { role: 'seller' },
        });
    });
}

/** Mock the Supabase Auth endpoints for a Buyer user */
export async function mockBuyerAuth(page: Page) {
    const mockUser = {
        id: 'buyer-test-user-uuid-0001',
        email: 'e2e-buyer@example.com',
        user_metadata: { role: 'buyer' },
        app_metadata: { provider: 'email' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
    };
    await page.route('**/auth/v1/token*', async (route) => {
        await route.fulfill({
            json: {
                access_token: 'mock_buyer_token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'mock_buyer_refresh',
                user: mockUser,
            },
        });
    });
    await page.route('**/auth/v1/user*', async (route) => {
        await route.fulfill({ json: mockUser });
    });

    await page.route('**/rest/v1/users*', async (route) => {
        await route.fulfill({
            json: { role: 'buyer' },
        });
    });
}

/** Mock Seller-side Supabase REST / Edge Function APIs */
export async function mockSellerApis(page: Page) {
    const mockPlan = {
        id: 'plan_mock_001',
        name: 'E2E プレミア会員',
        description: 'E2Eテスト用プレミアプラン',
        price: 4980,
        currency: 'JPY',
        interval: 'monthly',
        is_public: true,
        seller_id: 'e162ab9d-2ff2-4e02-b68e-55471e4b7b91',
        discord_server_id: 'ds_mock_001',
        discord_role_id: '987654321098765432',
        created_at: new Date().toISOString(),
        deleted_at: null,
        discord_servers: {
            id: 'ds_mock_001',
            guild_id: '123456789012345678',
            guild_name: 'E2E Test Fanclub',
            seller_id: 'e162ab9d-2ff2-4e02-b68e-55471e4b7b91',
        },
    };

    // Supabase REST: plans table
    await page.route('**/rest/v1/plans*', async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            // Check if it's a head request (count only for stats)
            const prefer = route.request().headers()['prefer'] || '';
            if (prefer.includes('count=exact') && prefer.includes('head=true')) {
                await route.fulfill({
                    status: 200,
                    headers: { 'content-range': '0-0/1' },
                    json: [mockPlan],
                });
            } else {
                await route.fulfill({ json: [mockPlan] });
            }
        } else if (method === 'POST') {
            await route.fulfill({ json: [mockPlan] });
        } else if (method === 'PATCH') {
            await route.fulfill({ json: [mockPlan] });
        } else {
            await route.fulfill({ json: { success: true } });
        }
    });

    // Supabase REST: memberships table (for stats/count)
    await page.route('**/rest/v1/memberships*', async (route) => {
        const prefer = route.request().headers()['prefer'] || '';
        if (prefer.includes('count=exact') && prefer.includes('head=true')) {
            await route.fulfill({
                status: 200,
                headers: { 'content-range': '0-0/0' },
                json: [],
            });
        } else {
            await route.fulfill({ json: [] });
        }
    });

    // Supabase REST: seller_profiles table
    await page.route('**/rest/v1/seller_profiles*', async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            await route.fulfill({
                json: {
                    id: 'seller_profile_mock',
                    seller_id: 'e162ab9d-2ff2-4e02-b68e-55471e4b7b91',
                    store_name: 'E2E Test Fanclub',
                    display_name: 'E2E Test Seller',
                },
            });
        } else {
            await route.fulfill({ json: { success: true } });
        }
    });

    // Supabase REST: discord_servers table
    await page.route('**/rest/v1/discord_servers*', async (route) => {
        await route.fulfill({
            json: {
                id: 'ds_mock_001',
                guild_id: '123456789012345678',
                guild_name: 'E2E Test Fanclub',
                seller_id: 'e162ab9d-2ff2-4e02-b68e-55471e4b7b91',
            },
        });
    });

    // Supabase REST: stripe_connected_accounts table
    await page.route('**/rest/v1/stripe_connected_accounts*', async (route) => {
        await route.fulfill({
            json: {
                charges_enabled: true,
                payouts_enabled: true,
                details_submitted: true,
            },
        });
    });

    // Supabase REST: system_announcements table
    await page.route('**/rest/v1/system_announcements*', async (route) => {
        await route.fulfill({ json: [] });
    });

    // Edge Function: discord-bot (validation)
    await page.route('**/functions/v1/discord-bot*', async (route) => {
        await route.fulfill({
            json: { status: 'ok', bot_in_guild: true, role_assignable: true },
        });
    });

    // Edge Function: stripe-onboarding
    await page.route('**/functions/v1/stripe-onboarding*', async (route) => {
        await route.fulfill({
            json: { url: 'https://connect.stripe.com/mock-onboarding' },
        });
    });

    // Legacy API paths (keep for backwards compatibility)
    await page.route('**/api/seller/plans*', async (route) => {
        await route.fulfill({ json: [mockPlan] });
    });
    await page.route('**/api/seller/profile*', async (route) => {
        await route.fulfill({ json: { id: 'seller_profile_mock', store_name: 'E2E Test Store' } });
    });
    await page.route('**/api/seller/onboarding/complete*', async (route) => {
        await route.fulfill({ json: { success: true } });
    });
}

/** Mock the discord-bot Edge Function to simulate an insufficient-hierarchy error */
export async function mockDiscordBotError(page: Page) {
    await page.route('**/functions/v1/discord-bot*', async (route) => {
        await route.fulfill({
            json: { status: 'insufficient', error: 'DISCORD_ROLE_HIERARCHY_INVALID' },
        });
    });
}

/** Mock the discord-oauth Edge Function (for buyer discord linking) */
export async function mockDiscordOAuth(page: Page) {
    await page.route('**/functions/v1/discord-oauth*', async (route) => {
        await route.fulfill({
            json: { success: true, discord_user: { id: '111222333444', username: 'E2E_Buyer' } },
        });
    });
}

/**
 * Mock Supabase REST API for CheckoutSuccess page.
 * Intercepts memberships, seller_profiles, discord_servers queries
 * so the page renders the success state with plan information.
 */
export async function mockCheckoutSuccessApi(page: Page) {
    // Mock memberships query (with join to plans)
    await page.route('**/rest/v1/memberships*', async (route) => {
        await route.fulfill({
            json: {
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
        });
    });

    // Mock seller_profiles query
    await page.route('**/rest/v1/seller_profiles*', async (route) => {
        await route.fulfill({
            json: { store_name: '星野アイ' },
        });
    });

    // Mock discord_servers query
    await page.route('**/rest/v1/discord_servers*', async (route) => {
        await route.fulfill({
            json: { guild_name: '星野ファンクラブ' },
        });
    });
}

/**
 * Mock Supabase REST API + Auth for DiscordConfirm page.
 * Injects a mock session into localStorage so the Supabase client
 * recognizes the user as authenticated, then intercepts API calls.
 */
export async function mockDiscordConfirmApi(page: Page) {
    const mockUser = {
        id: 'buyer-test-user-uuid-0001',
        email: 'e2e-buyer@example.com',
        user_metadata: {},
        app_metadata: { provider: 'email' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
    };

    // Inject mock session into localStorage BEFORE any page script runs
    // so that supabase.auth.getUser() finds a valid session.
    const mockSession = {
        access_token: 'mock_buyer_access_token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock_buyer_refresh_token',
        user: mockUser,
    };
    await page.addInitScript((session) => {
        localStorage.setItem(
            'sb-xaqzuevdmeqxntvhamce-auth-token',
            JSON.stringify(session)
        );
    }, mockSession);

    // Mock auth getUser (called after session is found)
    await page.route('**/auth/v1/user*', async (route) => {
        await route.fulfill({ json: mockUser });
    });

    // Mock refresh token endpoint (Supabase may try to refresh)
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

    // Mock discord_identities query
    await page.route('**/rest/v1/discord_identities*', async (route) => {
        await route.fulfill({
            json: {
                discord_user_id: '123456789012345678',
                discord_username: 'user_taro#1234',
            },
        });
    });
}
