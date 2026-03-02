import { test, expect } from '@playwright/test';
import { loginAsSeller } from './fixtures/auth.fixture';

test.describe('Edge Cases', () => {
    /**
     * REQ: When the Discord Bot has insufficient role hierarchy,
     * the validation screen must display an error indicator.
     */
    test('handles Discord Role Hierarchy Error gracefully during validation', async ({ page }) => {
        // Login as seller (real auth required for discord-bot Edge Function)
        await loginAsSeller(page);

        await page.goto('/seller/onboarding/discord');

        // Fill in (deliberately invalid) Discord IDs
        await page.getByPlaceholder('例: 1234567890123456789').fill('111111111111111111');

        // Search for the Role ID placeholder text
        const roleIdInput = page.getByPlaceholder('例: 9876543210987654321');
        const roleInput = (await roleIdInput.count()) > 0
            ? roleIdInput
            : page.getByPlaceholder('例: 1234567890123456789').nth(1);
        await roleInput.fill('222222222222222222');

        // Click the validate button
        await page.getByRole('button', { name: 'Discord設定を検証' }).click();

        // The edge function should return error for non-existent guild → UI must show 検証NG
        await expect(page.getByText('検証NG')).toBeVisible({ timeout: 15000 });
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
        await page.goto('/checkout/success');
        // Must not be a 404 or crash; BuyerLayout header must still be visible
        await expect(page.getByText('🎫 ファンクラブ')).toBeVisible({ timeout: 10000 });
    });
});
