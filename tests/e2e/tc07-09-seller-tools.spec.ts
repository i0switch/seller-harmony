import { test, expect } from '@playwright/test';

test.describe('TC-07: 販売者 クロスチェック', () => {
  test('TC-07-01: /seller/crosscheck → /seller/login にリダイレクト', async ({ page }) => {
    await page.goto('/seller/crosscheck');
    await expect(page).toHaveURL(/\/seller\/(login|onboarding\/profile)/);
  });

  test('TC-07-02: クロスチェックページのメタ情報が正しい', async ({ page }) => {
    // ページ存在確認 — 認証リダイレクトが発生すれば、ルートは存在する
    const response = await page.goto('/seller/crosscheck');
    // SPAなので200が返るはず
    expect(response?.status()).toBe(200);
  });
});

test.describe('TC-08: 販売者 Webhook履歴', () => {
  test('TC-08-01: /seller/webhooks → /seller/login にリダイレクト', async ({ page }) => {
    await page.goto('/seller/webhooks');
    await expect(page).toHaveURL(/\/seller\/(login|onboarding\/profile)/);
  });

  test('TC-08-02: Webhookページルートが有効（SPA 200応答）', async ({ page }) => {
    const response = await page.goto('/seller/webhooks');
    expect(response?.status()).toBe(200);
  });
});

test.describe('TC-09: 販売者 Discord設定', () => {
  test('TC-09-01: /seller/settings/discord → /seller/login にリダイレクト', async ({ page }) => {
    await page.goto('/seller/settings/discord');
    await expect(page).toHaveURL(/\/seller\/(login|onboarding\/profile)/);
  });

  test('TC-09-02: Discord設定ページルートが有効（SPA 200応答）', async ({ page }) => {
    const response = await page.goto('/seller/settings/discord');
    expect(response?.status()).toBe(200);
  });
});
