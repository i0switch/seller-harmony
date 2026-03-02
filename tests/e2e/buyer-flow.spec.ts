import { test, expect } from '@playwright/test';
import { mockCheckoutSuccessApi, mockDiscordConfirmApi } from './fixtures/auth.fixture';

test.describe('Buyer Flow', () => {
    test('completes buyer return from checkout and discord connection', async ({ page }) => {
        // Set up API mocks BEFORE navigation
        await mockCheckoutSuccessApi(page);
        await mockDiscordConfirmApi(page);

        // ── 1. Checkout Success Page ───────────────────────────────────────
        await page.goto('/checkout/success?session_id=cs_test_mock_123');

        // Web-first assertion: button/link must exist before clicking
        const discordLink = page.getByRole('link', { name: 'Discordを連携する' });
        await expect(discordLink).toBeVisible({ timeout: 10000 });
        await discordLink.click();

        // ── 2. Discord Confirm Page ────────────────────────────────────────
        await expect(page).toHaveURL(/\/buyer\/discord\/confirm/, { timeout: 8000 });

        // Mock the discord-oauth Edge Function
        let apiCallCount = 0;
        await page.route('**/functions/v1/discord-oauth*', async (route) => {
            apiCallCount++;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    saved: apiCallCount > 1,
                    discord_user: { id: '111222333444', username: 'E2E_Buyer', discriminator: '0', avatar: null }
                }),
            });
        });

        // ── 3. Set CSRF state in sessionStorage, then simulate OAuth callback ─
        const mockState = `e2e_csrf_state_${Date.now()}`;
        await page.evaluate((state) => {
            sessionStorage.setItem('discord_oauth_state', state);
        }, mockState);

        // Navigate to the Discord result page with the mocked code and state
        await page.goto(`/buyer/discord/result?code=mock_code_abc&state=${mockState}`);

        // ── 4. Discord Result Page ─────────────────────────────────────────
        // Wait for either the confirm step or the direct success
        // Use web-first assertion (toBeVisible) which properly retries
        const confirmButton = page.getByRole('button', { name: 'このアカウントで連携を完了する' });
        const successHeading = page.getByText('連携完了！🎉');

        // First, wait for the page to settle (first API call to complete)
        await page.waitForResponse(
            resp => resp.url().includes('discord-oauth') && resp.status() === 200,
            { timeout: 10000 }
        );

        // Check if confirmation step exists (the most reliable way)
        let hasConfirmStep = false;
        try {
            await expect(confirmButton).toBeVisible({ timeout: 5000 });
            hasConfirmStep = true;
        } catch {
            hasConfirmStep = false;
        }

        if (hasConfirmStep) {
            // Click the confirm button and wait for the second API call
            await Promise.all([
                page.waitForResponse(
                    resp => resp.url().includes('discord-oauth') && resp.status() === 200,
                    { timeout: 15000 }
                ),
                confirmButton.click(),
            ]);
        }

        await expect(successHeading).toBeVisible({ timeout: 15000 });

        // ── 5. Navigate to My Page ────────────────────────────────────────
        const myPageLink = page.getByRole('link', { name: 'マイページへ' });
        await expect(myPageLink).toBeVisible();
        await myPageLink.click();

        await expect(page).toHaveURL(/\/member\/me/, { timeout: 8000 });
    });
});
