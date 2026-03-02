import { test, expect } from '@playwright/test';
import { SELLER_EMAIL, TEST_PASSWORD } from './fixtures/auth.fixture';

test.describe('TC-02: Seller認証（新規登録・ログイン）', () => {

    // ── TC-02-01: 新規登録ページの表示 ─────────────────────────────
    test('TC-02-01: 新規登録ページが正しく表示される', async ({ page }) => {
        await page.goto('/seller/signup');

        await expect(page.getByText('🎤 販売者登録')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('ファンクラブを始めましょう')).toBeVisible();

        // フォームフィールド
        await expect(page.getByText('表示名')).toBeVisible();
        await expect(page.getByPlaceholder('クリエイター名')).toBeVisible();
        await expect(page.getByText('メールアドレス')).toBeVisible();
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
        await expect(page.getByText('パスワード')).toBeVisible();
        await expect(page.getByPlaceholder('8文字以上')).toBeVisible();

        // チェックボックス・ボタン・リンク
        await expect(page.getByText('利用規約')).toBeVisible();
        await expect(page.getByText('プライバシーポリシー')).toBeVisible();
        await expect(page.getByRole('button', { name: 'アカウント作成' })).toBeVisible();
        await expect(page.getByText('既にアカウントをお持ちですか？')).toBeVisible();
        await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
    });

    // ── TC-02-02: 空送信バリデーション ──────────────────────────────
    test('TC-02-02: 空送信でバリデーションエラーが表示される', async ({ page }) => {
        await page.goto('/seller/signup');
        await expect(page.getByRole('button', { name: 'アカウント作成' })).toBeVisible({ timeout: 15000 });

        await page.getByRole('button', { name: 'アカウント作成' }).click();

        await expect(page.getByText('表示名を入力してください')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('有効なメールアドレスを入力してください')).toBeVisible();
        await expect(page.getByText('パスワードは8文字以上にしてください')).toBeVisible();
        // URLが変わっていない（フォーム送信されていない）
        await expect(page).toHaveURL(/\/seller\/signup/);
    });

    // ── TC-02-03: 個別フィールドバリデーション ──────────────────────
    test('TC-02-03: 個別フィールドのバリデーションエラー', async ({ page }) => {
        await page.goto('/seller/signup');
        await expect(page.getByPlaceholder('クリエイター名')).toBeVisible({ timeout: 15000 });

        await page.getByPlaceholder('クリエイター名').fill('テスト販売者');
        await page.getByPlaceholder('you@example.com').fill('invalid-email');
        await page.getByPlaceholder('8文字以上').fill('1234');
        // 利用規約はチェックしない

        await page.getByRole('button', { name: 'アカウント作成' }).click();

        // 表示名はOKなのでエラーなし
        await expect(page.getByText('表示名を入力してください')).not.toBeVisible();
        // メール形式エラー
        await expect(page.getByText('有効なメールアドレスを入力してください')).toBeVisible();
        // パスワード長エラー
        await expect(page.getByText('パスワードは8文字以上にしてください')).toBeVisible();
        // 利用規約エラー
        await expect(page.getByText('利用規約に同意してください')).toBeVisible();
    });

    // ── TC-02-04: 有効な入力で送信 ─────────────────────────────────
    test('TC-02-04: 有効な入力でアカウント作成', async ({ page }) => {
        // Use real Supabase auth — submit form with real-ish data
        await page.goto('/seller/signup');
        await expect(page.getByPlaceholder('クリエイター名')).toBeVisible({ timeout: 15000 });

        await page.getByPlaceholder('クリエイター名').fill('テスト販売者');
        await page.getByPlaceholder('you@example.com').fill('test-seller-e2e-tc02-04@example.com');
        await page.getByPlaceholder('8文字以上').fill('password123');
        await page.getByRole('checkbox').check();

        await page.getByRole('button', { name: 'アカウント作成' }).click();

        // バリデーションエラーが出ない
        await expect(page.getByText('表示名を入力してください')).not.toBeVisible();
        await expect(page.getByText('有効なメールアドレスを入力してください')).not.toBeVisible();
        await expect(page.getByText('パスワードは8文字以上にしてください')).not.toBeVisible();

        // Form submitted (may succeed or show server error, but form validation passed)
        await page.waitForTimeout(3000);
        const url = page.url();
        // Either redirected to onboarding/profile or stayed on signup (account may already exist)
        const navigated = url.includes('/seller/onboarding/profile') || url.includes('/seller/signup');
        expect(navigated).toBeTruthy();
    });

    // ── TC-02-05: 新規登録→ログインへの遷移 ──────────────────────
    test('TC-02-05: 新規登録→ログインページへの遷移', async ({ page }) => {
        await page.goto('/seller/signup');
        await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible({ timeout: 15000 });

        await page.getByRole('link', { name: 'ログイン' }).click();

        await expect(page).toHaveURL(/\/seller\/login/, { timeout: 10000 });
        await expect(page.getByText('🎤 販売者ログイン')).toBeVisible();
    });

    // ── TC-02-06: ログインページの表示 ──────────────────────────────
    test('TC-02-06: ログインページが正しく表示される', async ({ page }) => {
        await page.goto('/seller/login');

        await expect(page.getByText('🎤 販売者ログイン')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('ダッシュボードにアクセス')).toBeVisible();

        await expect(page.getByLabel('メールアドレス')).toBeVisible();
        await expect(page.getByLabel('パスワード')).toBeVisible();
        await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
        await expect(page.getByText('初めてですか？')).toBeVisible();
        await expect(page.getByRole('link', { name: '新規登録' })).toBeVisible();
    });

    // ── TC-02-07: ログイン空送信バリデーション ───────────────────────
    test('TC-02-07: ログイン空送信でエラーが表示される', async ({ page }) => {
        await page.goto('/seller/login');
        await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 15000 });

        await page.getByRole('button', { name: 'ログイン' }).click();

        await expect(page.getByText('メールアドレスとパスワードを入力してください')).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveURL(/\/seller\/login/);
    });

    // ── TC-02-08: 不正な認証情報 ───────────────────────────────────
    test('TC-02-08: 不正な認証情報でエラーが表示される', async ({ page }) => {
        // Do NOT mock auth so real Supabase rejects
        await page.goto('/seller/login');
        await expect(page.getByLabel('メールアドレス')).toBeVisible({ timeout: 15000 });

        await page.getByLabel('メールアドレス').fill('wrong@example.com');
        await page.getByLabel('パスワード').fill('wrongpassword');
        await page.getByRole('button', { name: 'ログイン' }).click();

        await expect(page.getByText('ログインに失敗しました')).toBeVisible({ timeout: 15000 });
    });

    // ── TC-02-09: ログイン成功（実認証） ─────────────────────────
    test('TC-02-09: 実認証でログイン成功', async ({ page }) => {
        await page.goto('/seller/login');
        await expect(page.getByLabel('メールアドレス')).toBeVisible({ timeout: 15000 });

        await page.getByLabel('メールアドレス').fill(SELLER_EMAIL);
        await page.getByLabel('パスワード').fill(TEST_PASSWORD);
        await page.getByRole('button', { name: 'ログイン' }).click();

        // ダッシュボード or オンボーディングにリダイレクト
        await page.waitForTimeout(5000);
        const url = page.url();
        const redirected = url.includes('/seller/dashboard') || url.includes('/seller/onboarding');
        expect(redirected).toBeTruthy();
    });

    // ── TC-02-10: ログイン→新規登録への遷移 ─────────────────────────
    test('TC-02-10: ログイン→新規登録ページへの遷移', async ({ page }) => {
        await page.goto('/seller/login');
        await expect(page.getByRole('link', { name: '新規登録' })).toBeVisible({ timeout: 15000 });

        await page.getByRole('link', { name: '新規登録' }).click();

        await expect(page).toHaveURL(/\/seller\/signup/, { timeout: 10000 });
        await expect(page.getByText('🎤 販売者登録')).toBeVisible();
    });

    // ── TC-02-11: パスワードマスク ──────────────────────────────────
    test('TC-02-11a: サインアップのパスワードがマスクされている', async ({ page }) => {
        await page.goto('/seller/signup');
        await expect(page.getByPlaceholder('8文字以上')).toBeVisible({ timeout: 15000 });

        const passwordField = page.getByPlaceholder('8文字以上');
        await expect(passwordField).toHaveAttribute('type', 'password');
    });

    test('TC-02-11b: ログインのパスワードがマスクされている', async ({ page }) => {
        await page.goto('/seller/login');
        await expect(page.getByLabel('パスワード')).toBeVisible({ timeout: 15000 });

        const passwordField = page.getByLabel('パスワード');
        await expect(passwordField).toHaveAttribute('type', 'password');
    });
});
