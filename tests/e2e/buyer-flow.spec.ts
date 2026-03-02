import { test, expect } from '@playwright/test';
import { loginAsBuyer } from './fixtures/auth.fixture';

test.describe('Buyer Flow', () => {
    test('completes buyer return from checkout and discord connection', async ({ page }) => {
        // ── 1. Checkout Success Page (no real session → graceful handling) ──
        await page.goto('/checkout/success');
        // BuyerLayout header must render
        await expect(page.getByText('🎫 ファンクラブ')).toBeVisible({ timeout: 15000 });
        // Page renders without crash (no session_id → loading / empty state)
        await expect(page.locator('body')).toBeVisible();

        // ── 2. Discord Confirm Page (real buyer auth) ─────────────────────
        await loginAsBuyer(page);
        await page.goto('/buyer/discord/confirm');
        // Page renders the Discord confirmation UI
        await expect(page.getByText(/Discord連携/)).toBeVisible({ timeout: 15000 });

        // ── 3. Discord Result Page — error state (no code param) ──────────
        await page.goto('/buyer/discord/result');
        await expect(page.getByText('連携に失敗しました')).toBeVisible({ timeout: 15000 });

        // ── 4. Navigate to My Page ────────────────────────────────────────
        await page.goto('/member/me');
        await expect(page.getByText('🎫 ファンクラブ')).toBeVisible({ timeout: 10000 });
    });
});
