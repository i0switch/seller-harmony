import { test, expect } from '@playwright/test';

test.describe('TC-01: ランディングページ・ルーティング・404', () => {

    // ── TC-01-01: ランディングページの表示 ──────────────────────────
    test('TC-01-01: ランディングページが正しく表示される', async ({ page }) => {
        await page.goto('/');

        // タイトル
        await expect(page.getByText('🎤 ファンクラブ運用インフラ')).toBeVisible({ timeout: 15000 });
        // サブタイトル
        await expect(page.getByText('マルチテナントSaaS')).toBeVisible();

        // 3つのナビゲーションカード
        await expect(page.getByText('🛡️ Platform Admin')).toBeVisible();
        await expect(page.getByText('SaaS管理者としてログイン')).toBeVisible();
        await expect(page.getByText('🎤 Seller / Tenant')).toBeVisible();
        await expect(page.getByText('販売者としてログイン')).toBeVisible();
        await expect(page.getByText('🎫 Buyer / Member')).toBeVisible();
        await expect(page.getByText('購入者フローを確認')).toBeVisible();
    });

    // ── TC-01-02: 各ロールへの遷移 ──────────────────────────────────
    test('TC-01-02a: Platform Adminカードから /platform/login へ遷移', async ({ page }) => {
        await page.goto('/');
        await page.getByText('🛡️ Platform Admin').click();
        await expect(page).toHaveURL(/\/platform\/login/, { timeout: 15000 });
    });

    test('TC-01-02b: Sellerカードから /seller/login へ遷移', async ({ page }) => {
        await page.goto('/');
        await page.getByText('🎤 Seller / Tenant').click();
        await expect(page).toHaveURL(/\/seller\/(login|onboarding\/profile)/, { timeout: 15000 });
    });

    test('TC-01-02c: Buyerカードから /member/me へ遷移', async ({ page }) => {
        await page.goto('/');
        await page.getByText('🎫 Buyer / Member').click();
        await expect(page).toHaveURL(/\/member\/me/, { timeout: 15000 });
    });

    // ── TC-01-03: 404ページ ──────────────────────────────────────────
    test('TC-01-03a: 存在しないURLで404が表示される', async ({ page }) => {
        await page.goto('/nonexistent-page');
        await expect(page.getByText('404')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Page not found')).toBeVisible();
        // ホームに戻るリンクが存在
        await expect(page.getByText('Return to Home')).toBeVisible();
    });

    test('TC-01-03b: /platform/nonexistent で404が表示される', async ({ page }) => {
        await page.goto('/platform/nonexistent');
        // 404 or redirect to login (platformLayout has auth guard)
        const url = page.url();
        const is404 = await page.getByText('404').isVisible().catch(() => false);
        const isLogin = url.includes('/platform/login');
        expect(is404 || isLogin).toBeTruthy();
    });

    test('TC-01-03c: /seller/nonexistent で404またはリダイレクト', async ({ page }) => {
        await page.goto('/seller/nonexistent');
        // 404 or redirect to login (sellerLayout has auth guard)
        await page.waitForTimeout(3000);
        const url = page.url();
        const is404 = await page.getByText('404').isVisible().catch(() => false);
        const isRedirected =
            url.includes('/seller/login') || url.includes('/seller/onboarding/profile');
        expect(is404 || isRedirected).toBeTruthy();
    });

    // ── TC-01-04: 認証ガードのリダイレクト ────────────────────────────
    test('TC-01-04a: /seller/dashboard → /seller/login にリダイレクト', async ({ page }) => {
        await page.goto('/seller/dashboard');
        await expect(page).not.toHaveURL(/\/seller\/dashboard/, { timeout: 15000 });
        // ログインページにリダイレクトされるはず
        await expect(page).toHaveURL(/\/seller\/(login|onboarding\/profile)/);
    });

    test('TC-01-04b: /platform/dashboard → /platform/login にリダイレクト', async ({ page }) => {
        await page.goto('/platform/dashboard');
        await expect(page).not.toHaveURL(/\/platform\/dashboard/, { timeout: 15000 });
        await expect(page).toHaveURL(/\/platform\/login/);
    });

    test('TC-01-04c: /seller/plans → /seller/login にリダイレクト', async ({ page }) => {
        await page.goto('/seller/plans');
        await expect(page).not.toHaveURL(/\/seller\/plans$/, { timeout: 15000 });
        await expect(page).toHaveURL(/\/seller\/(login|onboarding\/profile)/);
    });

    test('TC-01-04d: /seller/members → /seller/login にリダイレクト', async ({ page }) => {
        await page.goto('/seller/members');
        await expect(page).not.toHaveURL(/\/seller\/members$/, { timeout: 15000 });
        await expect(page).toHaveURL(/\/seller\/(login|onboarding\/profile)/);
    });

    // ── TC-01-05: 公開ページへの直接アクセス ──────────────────────────
    test('TC-01-05a: /checkout/success が正常に表示される', async ({ page }) => {
        await page.goto('/checkout/success');
        await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 15000 });
        // ページがレンダリングされクラッシュしない
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('TC-01-05b: /buyer/discord/confirm が表示される', async ({ page }) => {
        await page.goto('/buyer/discord/confirm');
        await expect(page).toHaveURL(/\/buyer\/discord\/confirm/, { timeout: 15000 });
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('TC-01-05c: /seller/signup が表示される', async ({ page }) => {
        await page.goto('/seller/signup');
        await expect(page).toHaveURL(/\/seller\/signup/, { timeout: 15000 });
        await expect(page.locator('body')).not.toBeEmpty();
    });
});
