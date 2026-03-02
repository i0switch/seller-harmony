import { test, expect } from '@playwright/test';
import { mockDiscordBotError, mockCheckoutSuccessApi } from './fixtures/auth.fixture';

test.describe('Edge Cases', () => {
    /**
     * REQ: When the Discord Bot has insufficient role hierarchy,
     * the validation screen must display an error indicator.
     */
    test('handles Discord Role Hierarchy Error gracefully during validation', async ({ page }) => {
        // Register mock *before* navigation
        await mockDiscordBotError(page);

        await page.goto('/seller/onboarding/discord');

        // Fill in (deliberately invalid) Discord IDs
        await page.getByPlaceholder('例: 1234567890123456789').fill('invalid_guild_id');

        // Search for the Role ID placeholder text
        const roleIdInput = page.getByPlaceholder('例: 9876543210987654321');
        // If the page only has one Discord ID placeholder, fall back:
        const roleInput = (await roleIdInput.count()) > 0
            ? roleIdInput
            : page.getByPlaceholder('例: 1234567890123456789').nth(1);
        await roleInput.fill('invalid_role_id');

        // Click the validate button
        await page.getByRole('button', { name: 'Discord設定を検証' }).click();

        // The edge function mock returns "insufficient" → UI must show 検証NG
        await expect(page.getByText('検証NG')).toBeVisible({ timeout: 10000 });
    });

    /**
     * REQ: Unauthenticated access to seller-protected routes should redirect to login.
     */
    test('redirects unauthenticated user away from seller dashboard', async ({ page }) => {
        await page.goto('/seller/dashboard');
        // Should be redirected (URL changes)
        await expect(page).not.toHaveURL(/\/seller\/dashboard/, { timeout: 6000 });
    });

    /**
     * REQ: Checkout success page renders even without a valid session_id.
     */
    test('checkout success page renders without errors', async ({ page }) => {
        await mockCheckoutSuccessApi(page);
        await page.goto('/checkout/success?session_id=cs_test_robustness');
        // Must not be a 404 or crash; Discord link must still be visible
        await expect(page.getByText('Discordを連携する')).toBeVisible({ timeout: 10000 });
    });
});
