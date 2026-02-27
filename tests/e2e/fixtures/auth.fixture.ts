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

/** Mock Seller-side REST/Edge Function APIs */
export async function mockSellerApis(page: Page) {
    await page.route('**/api/seller/plans*', async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            await route.fulfill({
                json: [
                    {
                        id: 'plan_mock_001',
                        name: 'プレミア会員',
                        description: 'E2Eテスト用プラン',
                        price: 3000,
                        status: 'published',
                        planType: 'subscription',
                        memberCount: 0,
                    },
                ],
            });
        } else {
            await route.fulfill({ json: { id: 'plan_mock_001', name: 'プレミア会員' } });
        }
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
