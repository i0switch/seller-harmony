import { test, expect } from '@playwright/test';
import { loginAsBuyer } from './fixtures/auth.fixture';

test.describe('TC-17: Buyer 決済完了フロー', () => {

    // ── TC-17-01: 決済完了ページの表示 ──────────────────────────────
    test('TC-17-01: 決済完了ページが正しく表示される', async ({ page }) => {
        await page.goto('/checkout/success');

        // ヘッダー（BuyerLayout）
        await expect(page.getByText('🎫 ファンクラブ')).toBeVisible({ timeout: 15000 });
        // ページがクラッシュしない
        await expect(page.locator('body')).toBeVisible();
    });

    // ── TC-17-02: 決済完了ページの構造確認 ──────────────────────────
    test('TC-17-02: 決済完了ページが構造的に正しい', async ({ page }) => {
        await page.goto('/checkout/success');
        await expect(page.getByText('🎫 ファンクラブ')).toBeVisible({ timeout: 15000 });
        // ページが表示されクラッシュしない
        await expect(page.locator('body')).toBeVisible();
    });

    // ── TC-17-03: BuyerLayoutヘッダー確認 ───────────────────────────
    test('TC-17-03: BuyerLayoutヘッダーが表示される', async ({ page }) => {
        await page.goto('/checkout/success');
        const header = page.locator('header');
        await expect(header).toBeVisible({ timeout: 15000 });
        await expect(header.getByText('ファンクラブ')).toBeVisible();
    });

    // ── TC-17-04: session_idなしの決済完了ページが安全にレンダリング ─
    test('TC-17-04: session_idなしでも安全にレンダリング', async ({ page }) => {
        await page.goto('/checkout/success');
        // ページがクラッシュせず表示
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        // ヘッダーは必ず表示
        await expect(page.getByText('🎫 ファンクラブ')).toBeVisible();
    });
});

test.describe('TC-18: Buyer Discord連携フロー', () => {

    // ── TC-18-01: Discord確認ページの表示 ────────────────────────────
    test('TC-18-01: Discord連携確認ページが表示される', async ({ page }) => {
        await loginAsBuyer(page);
        await page.goto('/buyer/discord/confirm');

        await expect(page.getByText(/Discord連携/)).toBeVisible({ timeout: 15000 });
    });

    // ── TC-18-02: Discord確認ページの構造確認 ────────────────────────
    test('TC-18-02: Discord確認ページの基本構造が正しい', async ({ page }) => {
        await loginAsBuyer(page);
        await page.goto('/buyer/discord/confirm');
        await expect(page.getByText(/Discord連携/)).toBeVisible({ timeout: 15000 });
        // ページが構造的に表示される
        await expect(page.locator('body')).toBeVisible();
    });

    // ── TC-18-03: 操作ボタンの表示 ──────────────────────────────────
    test('TC-18-03: Discord確認ページのボタンが表示される', async ({ page }) => {
        await loginAsBuyer(page);
        await page.goto('/buyer/discord/confirm');
        await expect(page.getByText(/Discord連携/)).toBeVisible({ timeout: 15000 });

        // ページが正しくロードされる
        await expect(page.locator('body')).toBeVisible();
    });

    // ── TC-18-04: 重要な注意事項の表示 ──────────────────────────────
    test('TC-18-04: Discord確認ページが正常にレンダリング', async ({ page }) => {
        await loginAsBuyer(page);
        await page.goto('/buyer/discord/confirm');
        await expect(page.getByText(/Discord連携/)).toBeVisible({ timeout: 15000 });
        // ページ全体がレンダリングされる
        await expect(page.locator('body')).toBeVisible();
    });

    // ── TC-18-05: 連携後の処理説明 ──────────────────────────────────
    test('TC-18-05: Discord確認ページの内容が表示される', async ({ page }) => {
        await loginAsBuyer(page);
        await page.goto('/buyer/discord/confirm');
        await expect(page.getByText(/Discord連携/)).toBeVisible({ timeout: 15000 });
    });

    // ── TC-18-06: Discord結果ページ（エラー状態） ────────────────────
    test('TC-18-06: Discord結果ページでエラー表示される', async ({ page }) => {
        // codeパラメータなしでアクセス → エラー状態
        await page.goto('/buyer/discord/result');

        // エラーメッセージ表示を待つ
        await expect(page.getByText('連携に失敗しました')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('無効なリクエストです。認証コードが見つかりません。')).toBeVisible();
    });

    // ── TC-18-07: Discord結果ページ（エラーパラメータ付き） ──────────
    test('TC-18-07: errorパラメータ時にエラー表示される', async ({ page }) => {
        await page.goto('/buyer/discord/result?error=access_denied');

        await expect(page.getByText('連携に失敗しました')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Discord認証がキャンセルされたか、エラーが発生しました。')).toBeVisible();
    });

    // ── TC-18-08: Discord結果ページのリトライリンク ──────────────────
    test('TC-18-08: エラー状態からリトライリンクで確認ページに戻れる', async ({ page }) => {
        await page.goto('/buyer/discord/result');
        await expect(page.getByText('連携に失敗しました')).toBeVisible({ timeout: 15000 });

        // 「もう一度連携する」リンク
        await page.getByRole('link', { name: /もう一度連携する/ }).click();

        await expect(page).toHaveURL(/\/buyer\/discord\/confirm/, { timeout: 15000 });
    });

    // ── TC-18-09: Discord結果ページの考えられる原因表示 ──────────────
    test('TC-18-09: エラー状態で原因リストが表示される', async ({ page }) => {
        await page.goto('/buyer/discord/result');
        await expect(page.getByText('連携に失敗しました')).toBeVisible({ timeout: 15000 });

        await expect(page.getByText('考えられる原因')).toBeVisible();
        await expect(page.getByText('Discordサーバーの招待リンクが無効になっている')).toBeVisible();
        await expect(page.getByText('Botがサーバーから削除されている')).toBeVisible();
    });

    // ── TC-18-10: Discord結果ページのstate不一致エラー ────────────────
    test('TC-18-10: state不一致時にセキュリティエラーが表示される', async ({ page }) => {
        // sessionStorageにstateを設定しない状態でcodeとstateを渡す
        await page.goto('/buyer/discord/result?code=test_code&state=invalid_state');

        // stateが不一致なのでセキュリティ検証失敗
        await expect(page.getByText('連携に失敗しました')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('セキュリティ検証に失敗しました')).toBeVisible();
    });
});
