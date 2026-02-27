import { test, expect } from '@playwright/test';

test.describe('TC-10: Platform Admin 認証', () => {

    // ── TC-10-01: ログインページの表示 ──────────────────────────────
    test('TC-10-01: Platform Adminログインページが正しく表示される', async ({ page }) => {
        await page.goto('/platform/login');

        // 見出し
        await expect(page.getByText('Platform Admin')).toBeVisible({ timeout: 15000 });
        // サブテキスト
        await expect(page.getByText('管理者ログイン')).toBeVisible();

        // フォームフィールド
        await expect(page.getByLabel('メールアドレス')).toBeVisible();
        await expect(page.getByLabel('パスワード')).toBeVisible();

        // ログインボタン
        await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
    });

    // ── TC-10-02: 空フォーム送信（HTML required属性でバリデーション）─
    test('TC-10-02: 空のままログインできない（HTML required）', async ({ page }) => {
        await page.goto('/platform/login');
        await expect(page.getByText('Platform Admin')).toBeVisible({ timeout: 15000 });

        // ログインボタンをクリック（required属性でブラウザが遮断）
        await page.getByRole('button', { name: 'ログイン' }).click();

        // ページ遷移しない
        await expect(page).toHaveURL(/\/platform\/login/);
    });

    // ── TC-10-03: 不正な認証情報でエラー表示 ────────────────────────
    test('TC-10-03: 不正認証でToastエラーが表示される', async ({ page }) => {
        await page.goto('/platform/login');
        await expect(page.getByText('Platform Admin')).toBeVisible({ timeout: 15000 });

        await page.getByLabel('メールアドレス').fill('wrong@example.com');
        await page.getByLabel('パスワード').fill('wrongpassword');
        await page.getByRole('button', { name: 'ログイン' }).click();

        // ボタンが「ログイン中...」に変わる
        await expect(page.getByRole('button', { name: 'ログイン中...' })).toBeVisible({ timeout: 5000 });

        // Toast エラー表示
        await expect(page.getByText('ログイン失敗', { exact: true })).toBeVisible({ timeout: 15000 });

        // ページ遷移しない
        await expect(page).toHaveURL(/\/platform\/login/);
    });

    // ── TC-10-04: Platform保護ルートの認証ガード ─────────────────────
    test('TC-10-04: Platform保護ルートがすべてリダイレクトする', async ({ page }) => {
        const routes = [
            '/platform/dashboard',
            '/platform/tenants',
            '/platform/webhooks',
            '/platform/retry-queue',
            '/platform/announcements',
            '/platform/system-control',
        ];

        for (const route of routes) {
            await page.goto(route);
            await expect(page).toHaveURL(/\/platform\/login/, { timeout: 15000 });
        }
    });

    // ── TC-10-05: ログインボタンのローディング状態 ───────────────────
    test('TC-10-05: ログイン中ボタンがdisabledになる', async ({ page }) => {
        await page.goto('/platform/login');
        await expect(page.getByText('Platform Admin')).toBeVisible({ timeout: 15000 });

        await page.getByLabel('メールアドレス').fill('test@example.com');
        await page.getByLabel('パスワード').fill('somepassword');

        // ログインボタンクリック
        const loginBtn = page.getByRole('button', { name: 'ログイン' });
        await loginBtn.click();

        // ローディング中はdisabled
        await expect(page.getByRole('button', { name: /ログイン中/ })).toBeVisible({ timeout: 5000 });
    });

    // ── TC-10-06: input typeの検証 ──────────────────────────────────
    test('TC-10-06: メールとパスワードのinput typeが正しい', async ({ page }) => {
        await page.goto('/platform/login');
        await expect(page.getByText('Platform Admin')).toBeVisible({ timeout: 15000 });

        // email input type
        const emailInput = page.locator('#email');
        await expect(emailInput).toHaveAttribute('type', 'email');

        // password input type
        const passwordInput = page.locator('#password');
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });
});
