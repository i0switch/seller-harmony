import { Page, expect } from '@playwright/test';

/**
 * Seller認証ヘルパー
 * テスト用アカウントでサインアップ → ログイン → オンボーディング完了を設定
 */

const TEST_EMAIL_PREFIX = 'e2e-seller-test';
const TEST_PASSWORD = 'TestPassword123!';

/** ユニークなテストメールアドレスを生成 */
export function generateTestEmail(): string {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return `${TEST_EMAIL_PREFIX}+${suffix}@test-seller-harmony.example.com`;
}

/**
 * Sellerとしてサインアップし、オンボーディングを完了状態にする
 * @returns 成功したかどうか
 */
export async function signUpAsSeller(page: Page): Promise<boolean> {
    const email = generateTestEmail();

    // サインアップページに遷移
    await page.goto('/seller/signup');
    await page.waitForLoadState('networkidle');

    // フォームが表示されるまで待機
    const emailInput = page.getByPlaceholder('you@example.com');
    await expect(emailInput).toBeVisible({ timeout: 15000 });

    // フォーム入力
    await page.getByPlaceholder('クリエイター名').fill('E2Eテスト');
    await emailInput.fill(email);
    await page.getByPlaceholder('8文字以上').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'アカウント作成' }).click();

    // 成功を確認: オンボーディングへリダイレクトされる or 成功メッセージ
    await page.waitForTimeout(3000);

    const url = page.url();
    const isOnboarding = url.includes('/seller/onboarding/');
    const isLoginPage = url.includes('/seller/login');
    const isSignupPage = url.includes('/seller/signup');

    if (isOnboarding) {
        // サインアップ成功 → オンボーディング完了に設定
        await page.evaluate(() => {
            localStorage.setItem('seller_onboarding_step', 'complete');
        });
        return true;
    }

    // メール確認が必要な場合やエラーの場合
    console.warn(`signUpAsSeller: サインアップ後のURL = ${url} (期待: /seller/onboarding/)`);
    return false;
}

/**
 * 既存のSellerアカウントでログイン
 */
export async function loginAsSeller(page: Page, email: string, password: string = TEST_PASSWORD): Promise<boolean> {
    await page.goto('/seller/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.getByPlaceholder('you@example.com');
    await expect(emailInput).toBeVisible({ timeout: 15000 });

    await emailInput.fill(email);
    await page.getByPlaceholder('パスワードを入力').fill(password);
    await page.getByRole('button', { name: /ログイン/ }).click();

    await page.waitForTimeout(3000);

    const url = page.url();
    return url.includes('/seller/dashboard') || url.includes('/seller/onboarding/');
}

/**
 * localStorageのオンボーディング状態を「完了」に設定
 */
export async function setOnboardingComplete(page: Page): Promise<void> {
    await page.evaluate(() => {
        localStorage.setItem('seller_onboarding_step', 'complete');
    });
}

/**
 * Sellerダッシュボードに認証付きでアクセスを試みる
 * 認証不可の場合は null を返す
 */
export async function navigateToSellerDashboard(page: Page): Promise<boolean> {
    // まずサインアップを試行
    const signedUp = await signUpAsSeller(page);

    if (signedUp) {
        // ダッシュボードに遷移
        await page.goto('/seller/dashboard');
        await page.waitForTimeout(3000);

        const url = page.url();
        return url.includes('/seller/dashboard');
    }

    return false;
}
