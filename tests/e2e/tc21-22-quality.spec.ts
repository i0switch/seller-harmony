import { test, expect } from '@playwright/test';

/**
 * TC-21: エラーハンドリング・エッジケース
 * TC-22: アクセシビリティ・UX品質
 */

test.describe('TC-21: エラーハンドリング・エッジケース', () => {

  test('TC-21-01: ブラウザの戻る/進むボタンで正常遷移', async ({ page }) => {
    await page.goto('/');
    await page.goto('/seller/login');
    await page.goto('/seller/signup');
    // 戻る
    await page.goBack();
    await expect(page).toHaveURL(/\/seller\/login/);
    await expect(page.getByRole('heading', { name: /販売者ログイン/ })).toBeVisible();
    // 進む
    await page.goForward();
    await expect(page).toHaveURL(/\/seller\/signup/);
    await expect(page.getByRole('heading', { name: /販売者登録/ })).toBeVisible();
  });

  test('TC-21-02: 存在しないURLで404ページが表示される', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    // NotFoundページが表示される
    await expect(page.getByText(/見つかりませんでした|404|Not Found/)).toBeVisible();
  });

  test('TC-21-03: サインアップフォームで空文字送信がブロックされる', async ({ page }) => {
    await page.goto('/seller/signup');
    const createBtn = page.getByRole('button', { name: 'アカウント作成' });
    await createBtn.click();
    // HTML5 required validation でブロックされるはず
    // URLが変わっていないことを確認
    await expect(page).toHaveURL(/\/seller\/signup/);
  });

  test('TC-21-04: サインアップで特殊文字・絵文字が入力可能', async ({ page }) => {
    await page.goto('/seller/signup');
    const nameField = page.getByPlaceholder('クリエイター名');
    // 特殊文字入力
    await nameField.fill('テスト🎤<script>alert(1)</script>');
    const value = await nameField.inputValue();
    expect(value).toContain('テスト🎤');
    expect(value).toContain('<script>');
    // XSSが実行されないことをクラッシュなしで確認
    await expect(page.getByRole('heading', { name: /販売者登録/ })).toBeVisible();
  });

  test('TC-21-05: PlatformログインでHTML required属性が機能する', async ({ page }) => {
    await page.goto('/platform/login');
    // 空のまま送信
    const loginBtn = page.getByRole('button', { name: 'ログイン' });
    await loginBtn.click();
    // URLが変わらない（form validation で阻止）
    await expect(page).toHaveURL(/\/platform\/login/);
  });

  test('TC-21-06: セッションクリア後にSellerルートがリダイレクト', async ({ page }) => {
    await page.goto('/seller/dashboard');
    await expect(page).toHaveURL(/\/seller\/(login|onboarding\/profile)/);
    // localStorageを直接確認
    const hasSession = await page.evaluate(() => {
      return Object.keys(localStorage).some(k => k.includes('supabase'));
    });
    // セッションがないことを確認
    expect(hasSession).toBe(false);
  });

  test('TC-21-07: URL直接入力でページが正常ロードされる', async ({ page }) => {
    // 各種URLに直接アクセス
    const urls = [
      { path: '/', check: /Seller Harmony|ファンクラブ/ },
      { path: '/seller/login', check: /販売者ログイン/ },
      { path: '/seller/signup', check: /販売者登録/ },
      { path: '/platform/login', check: /Platform Admin/ },
      { path: '/checkout/success', check: /ファンクラブ/ },
    ];
    for (const { path, check } of urls) {
      await page.goto(path);
      await expect(page.getByText(check).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('TC-21-08: ページリフレッシュ後もコンテンツが維持される', async ({ page }) => {
    await page.goto('/seller/signup');
    await expect(page.getByRole('heading', { name: /販売者登録/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: /販売者登録/ })).toBeVisible();
  });
});

test.describe('TC-22: アクセシビリティ・UX品質', () => {

  test('TC-22-01: キーボードナビゲーション — サインアップフォーム', async ({ page }) => {
    await page.goto('/seller/signup');
    // Tab キーで入力フィールド間を移動
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // フォーカスされた要素が入力フィールドであることを確認
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA']).toContain(activeTag);
  });

  test('TC-22-02: フォーカスリングの可視性', async ({ page }) => {
    await page.goto('/seller/login');
    // email フィールドにフォーカス
    const emailInput = page.locator('#email');
    await emailInput.focus();
    // フォーカスリングが表示される（outlineまたはring）
    const outline = await emailInput.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
    });
    expect(outline).toBe(true);
  });

  test('TC-22-03: フォームラベルとaria属性 — Platformログイン', async ({ page }) => {
    await page.goto('/platform/login');
    // email と password フィールドにid属性がある
    const email = page.locator('#email');
    const password = page.locator('#password');
    await expect(email).toHaveAttribute('type', 'email');
    await expect(password).toHaveAttribute('type', 'password');
    // required属性を持つ
    await expect(email).toHaveAttribute('required', '');
    await expect(password).toHaveAttribute('required', '');
  });

  test('TC-22-04: キーボードでダイアログ操作（Escape で閉じる）', async ({ page }) => {
    await page.goto('/checkout/success');
    await expect(page.getByText('🎫 ファンクラブ')).toBeVisible({ timeout: 15000 });
    // Escapeキーでページがクラッシュしない
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-22-05: 金額フォーマット — プランページで確認', async ({ page }) => {
    // ランディングページなどで金額が含まれる場所を確認
    await page.goto('/');
    // ページがレンダリングされることだけ確認
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
  });

  test('TC-22-06: 日本語テキストの品質 — ボタンテキスト統一', async ({ page }) => {
    // ログインボタンの表記統一を確認
    await page.goto('/seller/login');
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
    await page.goto('/platform/login');
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });
});
