import { test, expect } from '@playwright/test';

/**
 * TC-11〜16: Platform管理機能テスト
 * 全ページがPlatformLayout内（platform_admin認証必須）
 * Supabaseメール確認要件のため、認証ガードのリダイレクト動作を検証
 */

test.describe('TC-11: Platform ダッシュボード', () => {
  test('TC-11-01: /platform/dashboard → /platform/login にリダイレクト', async ({ page }) => {
    await page.goto('/platform/dashboard');
    await expect(page).toHaveURL(/\/platform\/login/);
    await expect(page.getByRole('heading', { name: /Platform Admin/ })).toBeVisible();
  });

  test('TC-11-02: ダッシュボードルートが有効（SPA 200応答）', async ({ page }) => {
    const response = await page.goto('/platform/dashboard');
    expect(response?.status()).toBe(200);
  });
});

test.describe('TC-12: Platform テナント管理', () => {
  test('TC-12-01: /platform/tenants → /platform/login にリダイレクト', async ({ page }) => {
    await page.goto('/platform/tenants');
    await expect(page).toHaveURL(/\/platform\/login/);
    await expect(page.getByRole('heading', { name: /Platform Admin/ })).toBeVisible();
  });

  test('TC-12-02: /platform/tenants/:id → /platform/login にリダイレクト', async ({ page }) => {
    await page.goto('/platform/tenants/t1');
    await expect(page).toHaveURL(/\/platform\/login/);
  });

  test('TC-12-03: 存在しないテナントIDもリダイレクトされる', async ({ page }) => {
    await page.goto('/platform/tenants/nonexistent-id');
    await expect(page).toHaveURL(/\/platform\/login/);
  });
});

test.describe('TC-13: Platform Webhook監視', () => {
  test('TC-13-01: /platform/webhooks → /platform/login にリダイレクト', async ({ page }) => {
    await page.goto('/platform/webhooks');
    await expect(page).toHaveURL(/\/platform\/login/);
    await expect(page.getByRole('heading', { name: /Platform Admin/ })).toBeVisible();
  });

  test('TC-13-02: Webhookルートが有効（SPA 200応答）', async ({ page }) => {
    const response = await page.goto('/platform/webhooks');
    expect(response?.status()).toBe(200);
  });
});

test.describe('TC-14: Platform リトライキュー', () => {
  test('TC-14-01: /platform/retry-queue → /platform/login にリダイレクト', async ({ page }) => {
    await page.goto('/platform/retry-queue');
    await expect(page).toHaveURL(/\/platform\/login/);
    await expect(page.getByRole('heading', { name: /Platform Admin/ })).toBeVisible();
  });

  test('TC-14-02: リトライキュールートが有効（SPA 200応答）', async ({ page }) => {
    const response = await page.goto('/platform/retry-queue');
    expect(response?.status()).toBe(200);
  });
});

test.describe('TC-15: Platform お知らせ管理', () => {
  test('TC-15-01: /platform/announcements → /platform/login にリダイレクト', async ({ page }) => {
    await page.goto('/platform/announcements');
    await expect(page).toHaveURL(/\/platform\/login/);
    await expect(page.getByRole('heading', { name: /Platform Admin/ })).toBeVisible();
  });

  test('TC-15-02: お知らせ管理ルートが有効（SPA 200応答）', async ({ page }) => {
    const response = await page.goto('/platform/announcements');
    expect(response?.status()).toBe(200);
  });
});

test.describe('TC-16: Platform システム制御', () => {
  test('TC-16-01: /platform/system-control → /platform/login にリダイレクト', async ({ page }) => {
    await page.goto('/platform/system-control');
    await expect(page).toHaveURL(/\/platform\/login/);
    await expect(page.getByRole('heading', { name: /Platform Admin/ })).toBeVisible();
  });

  test('TC-16-02: システム制御ルートが有効（SPA 200応答）', async ({ page }) => {
    const response = await page.goto('/platform/system-control');
    expect(response?.status()).toBe(200);
  });

  test('TC-16-03: 全Platform保護ルートの一括リダイレクトテスト', async ({ page }) => {
    const protectedRoutes = [
      '/platform/dashboard',
      '/platform/tenants',
      '/platform/webhooks',
      '/platform/retry-queue',
      '/platform/announcements',
      '/platform/system-control',
    ];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/platform\/login/, {
        timeout: 10000
      });
    }
  });
});
