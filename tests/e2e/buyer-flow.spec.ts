import { test, expect } from '@playwright/test';
import { mockDiscordOAuth } from './fixtures/auth.fixture';

test.describe('Buyer Flow', () => {
    test('completes buyer return from checkout and discord connection', async ({ page }) => {
        // ── 1. Checkout Success Page ───────────────────────────────────────
        await page.goto('/checkout/success?session_id=cs_test_mock_123');

        // Web-first assertion: button/link must exist before clicking
        const discordLink = page.getByRole('link', { name: 'Discordを連携する' });
        await expect(discordLink).toBeVisible({ timeout: 10000 });
        await discordLink.click();

        // ── 2. Discord Confirm Page ────────────────────────────────────────
        await expect(page).toHaveURL(/\/buyer\/discord\/confirm/, { timeout: 8000 });

        // Mock the discord-oauth Edge Function BEFORE clicking so route is registered
        await mockDiscordOAuth(page);

        // ── 3. Set CSRF state in sessionStorage, then simulate OAuth callback ─
        const mockState = `e2e_csrf_state_${Date.now()}`;

        // Instead of clicking the confirm button (which would call the real Edge Function
        // and redirect to Discord), go directly to the result page simulating the callback.
        // Set sessionStorage state first using evaluate (must be on the same page).
        await page.evaluate((state) => {
            sessionStorage.setItem('discord_oauth_state', state);
        }, mockState);

        // Navigate to the Discord result page with the mocked code and state
        await page.goto(`/buyer/discord/result?code=mock_code_abc&state=${mockState}`);

        // ── 4. Discord Result Page ─────────────────────────────────────────
        // The mock OAuth exchange resolves immediately → show success heading
        await expect(page.getByText('連携完了！🎉')).toBeVisible({ timeout: 10000 });

        // ── 5. Navigate to My Page ────────────────────────────────────────
        const myPageLink = page.getByRole('link', { name: 'マイページへ' });
        await expect(myPageLink).toBeVisible();
        await myPageLink.click();

        await expect(page).toHaveURL(/\/member\/me/, { timeout: 8000 });
    });
});
