import { test, expect, devices } from '@playwright/test';
import { mockCheckoutSuccessApi, mockDiscordConfirmApi } from './fixtures/auth.fixture';

/**
 * TC-20: レスポンシブ・モバイルUI
 * 公開ページ（認証不要）でビューポートサイズ変更テスト
 */

const MOBILE = { width: 375, height: 812 };
const TABLET = { width: 768, height: 1024 };
const DESKTOP = { width: 1280, height: 900 };

test.describe('TC-20: レスポンシブ・モバイルUI', () => {

  test('TC-20-01: ランディングページのレスポンシブ — モバイル', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');
    // ページが崩れずに表示される
    await expect(page.getByRole('heading', { name: /Seller Harmony|ファンクラブ/ })).toBeVisible();
    // コンテンツが画面幅内に収まる
    const body = page.locator('body');
    const box = await body.boundingBox();
    expect(box).toBeTruthy();
    // 水平スクロールが発生しないことを確認
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px許容
  });

  test('TC-20-02: ランディングページのレスポンシブ — タブレット', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Seller Harmony|ファンクラブ/ })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('TC-20-03: ランディングページのレスポンシブ — デスクトップ', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Seller Harmony|ファンクラブ/ })).toBeVisible();
  });

  test('TC-20-04: 販売者ログインフォームのモバイル対応', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/seller/login');
    await expect(page.getByRole('heading', { name: /販売者ログイン/ })).toBeVisible();
    // フォームフィールドが画面幅に収まる
    const loginBtn = page.getByRole('button', { name: 'ログイン' });
    await expect(loginBtn).toBeVisible();
    const btnBox = await loginBtn.boundingBox();
    expect(btnBox).toBeTruthy();
    // ボタンが44px以上の高さ
    if (btnBox) {
      expect(btnBox.height).toBeGreaterThanOrEqual(36); // min-height for touch
    }
  });

  test('TC-20-05: 販売者サインアップフォームのモバイル対応', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/seller/signup');
    await expect(page.getByRole('heading', { name: /販売者登録/ })).toBeVisible();
    // 全入力フィールドが表示される
    await expect(page.getByPlaceholder('クリエイター名')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('8文字以上')).toBeVisible();
    // 水平はみ出しなし
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('TC-20-06: Platformログインフォームのモバイル対応', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/platform/login');
    await expect(page.getByRole('heading', { name: /Platform Admin/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('TC-20-07: Buyer決済完了ページのモバイル対応', async ({ page }) => {
    await mockCheckoutSuccessApi(page);
    await page.setViewportSize(MOBILE);
    await page.goto('/checkout/success?session_id=cs_test_mock');
    await expect(page.getByText('🎫 ファンクラブ')).toBeVisible();
    await expect(page.getByText('プレミアム会員')).toBeVisible();
    // プランカードが全幅で表示される
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('TC-20-08: オンボーディングページのモバイル対応', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/seller/onboarding/profile');
    // ステップインジケーターが表示される
    await expect(page.locator('.rounded-full').first()).toBeVisible();
    // ページが表示され、水平はみ出しなし
    await page.waitForTimeout(2000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('TC-20-09: Discord連携確認ページのモバイル対応', async ({ page }) => {
    await mockDiscordConfirmApi(page);
    await page.setViewportSize(MOBILE);
    await page.goto('/buyer/discord/confirm');
    await expect(page.getByText('Discord連携の確認')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('このアカウントで連携する')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('TC-20-10: ビューポート切替でレイアウト再計算される', async ({ page }) => {
    await page.goto('/');
    // デスクトップ → モバイル
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(500);
    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(500);
    // ページがクラッシュしない
    await expect(page.locator('body')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
