import { test, expect } from '@playwright/test';
import { mockCheckoutSuccessApi, mockDiscordConfirmApi } from './fixtures/auth.fixture';

test.describe('TC-17: Buyer 決済完了フロー', () => {

    test.beforeEach(async ({ page }) => {
        await mockCheckoutSuccessApi(page);
    });

    // ── TC-17-01: 決済完了ページの表示 ──────────────────────────────
    test('TC-17-01: 決済完了ページが正しく表示される', async ({ page }) => {
        await page.goto('/checkout/success?session_id=cs_test_mock');

        // ヘッダー（BuyerLayout）
        await expect(page.getByText('🎫 ファンクラブ')).toBeVisible({ timeout: 15000 });

        // 決済完了メッセージ
        await expect(page.getByText('決済が完了しました！')).toBeVisible();
        await expect(page.getByText('ご購入ありがとうございます。')).toBeVisible();
    });

    // ── TC-17-02: 購入内容の表示 ────────────────────────────────────
    test('TC-17-02: 購入内容が正しく表示される', async ({ page }) => {
        await page.goto('/checkout/success?session_id=cs_test_mock');
        await expect(page.getByText('決済が完了しました！')).toBeVisible({ timeout: 15000 });

        // 購入内容セクション
        await expect(page.getByText('購入内容')).toBeVisible();

        // プラン・販売者・金額
        await expect(page.getByText('プラン')).toBeVisible();
        await expect(page.getByText('プレミアム会員')).toBeVisible();
        await expect(page.getByText('販売者')).toBeVisible();
        await expect(page.getByText('星野アイ')).toBeVisible();
        await expect(page.getByText('金額')).toBeVisible();

        // 種別バッジ
        await expect(page.getByText('月額')).toBeVisible();

        // 次回請求日
        await expect(page.getByText('次回請求日')).toBeVisible();
    });

    // ── TC-17-03: Discord連携CTAの表示 ──────────────────────────────
    test('TC-17-03: Discord連携CTAが表示される', async ({ page }) => {
        await page.goto('/checkout/success?session_id=cs_test_mock');
        await expect(page.getByText('決済が完了しました！')).toBeVisible({ timeout: 15000 });

        // Discord連携セクション
        await expect(page.getByText('Discordに参加して連携しよう')).toBeVisible();
        await expect(page.getByText('星野ファンクラブ')).toBeVisible();

        // 「Discordを連携する」ボタン
        const discordBtn = page.getByRole('link', { name: /Discordを連携する/ });
        await expect(discordBtn).toBeVisible();
    });

    // ── TC-17-04: Discord連携ボタンのリンク先 ───────────────────────
    test('TC-17-04: Discordを連携するボタンからDiscord確認ページへ', async ({ page }) => {
        await page.goto('/checkout/success?session_id=cs_test_mock');
        await expect(page.getByText('決済が完了しました！')).toBeVisible({ timeout: 15000 });

        await page.getByRole('link', { name: /Discordを連携する/ }).click();

        await expect(page).toHaveURL(/\/buyer\/discord\/confirm/, { timeout: 15000 });
    });

    // ── TC-17-05: 「あとで連携する」オプション ──────────────────────
    test('TC-17-05: あとで連携するとマイページリンクが表示される', async ({ page }) => {
        await page.goto('/checkout/success?session_id=cs_test_mock');
        await expect(page.getByText('決済が完了しました！')).toBeVisible({ timeout: 15000 });

        // 「あとで連携する」リンク
        await page.getByText('あとで連携する').click();

        // マイページへのリンクが表示される
        await expect(page.getByText('マイページからいつでもDiscord連携できます。')).toBeVisible();
        await expect(page.getByRole('link', { name: 'マイページへ' })).toBeVisible();
    });

    // ── TC-17-06: Discord未連携の警告表示 ────────────────────────────
    test('TC-17-06: Discord未連携の警告メッセージが表示される', async ({ page }) => {
        await page.goto('/checkout/success?session_id=cs_test_mock');
        await expect(page.getByText('決済が完了しました！')).toBeVisible({ timeout: 15000 });

        // 警告メッセージ
        await expect(page.getByText('Discord連携をしないと、限定サーバーの権限が付与されない場合があります。')).toBeVisible();
    });

    // ── TC-17-07: BuyerLayoutのヘッダー表示 ─────────────────────────
    test('TC-17-07: BuyerLayoutヘッダーが表示される', async ({ page }) => {
        await page.goto('/checkout/success?session_id=cs_test_mock');

        // BuyerLayoutのヘッダー
        const header = page.locator('header');
        await expect(header).toBeVisible({ timeout: 15000 });
        await expect(header.getByText('ファンクラブ')).toBeVisible();
    });
});

test.describe('TC-18: Buyer Discord連携フロー', () => {

    test.beforeEach(async ({ page }) => {
        await mockDiscordConfirmApi(page);
    });

    // ── TC-18-01: Discord確認ページの表示 ────────────────────────────
    test('TC-18-01: Discord連携確認ページが表示される', async ({ page }) => {
        await page.goto('/buyer/discord/confirm');

        await expect(page.getByText('Discord連携の確認')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('以下のDiscordアカウントで連携します。正しいか確認してください。')).toBeVisible();
    });

    // ── TC-18-02: Discordユーザー情報の表示 ──────────────────────────
    test('TC-18-02: Discordユーザー情報が表示される', async ({ page }) => {
        await page.goto('/buyer/discord/confirm');
        await expect(page.getByText('Discord連携の確認')).toBeVisible({ timeout: 15000 });

        // ユーザー名
        await expect(page.getByText('user_taro#1234')).toBeVisible();
        // OAuth認証済みバッジ
        await expect(page.getByText('OAuth認証済み')).toBeVisible();
    });

    // ── TC-18-03: 操作ボタンの表示 ──────────────────────────────────
    test('TC-18-03: 連携ボタンと別アカウントボタンが表示される', async ({ page }) => {
        await page.goto('/buyer/discord/confirm');
        await expect(page.getByText('Discord連携の確認')).toBeVisible({ timeout: 15000 });

        // このアカウントで連携する
        await expect(page.getByRole('button', { name: 'このアカウントで連携する' })).toBeVisible();
        // 別のアカウントで連携する
        await expect(page.getByRole('button', { name: '別のアカウントで連携する' })).toBeVisible();
    });

    // ── TC-18-04: 重要な注意事項の表示 ──────────────────────────────
    test('TC-18-04: スマホ向け注意事項が表示される', async ({ page }) => {
        await page.goto('/buyer/discord/confirm');
        await expect(page.getByText('Discord連携の確認')).toBeVisible({ timeout: 15000 });

        // 重要な警告メッセージ
        await expect(page.getByText('ブラウザでログイン中のDiscordアカウントが連携されます')).toBeVisible();
    });

    // ── TC-18-05: 連携後の処理説明 ──────────────────────────────────
    test('TC-18-05: 連携後の処理説明が表示される', async ({ page }) => {
        await page.goto('/buyer/discord/confirm');
        await expect(page.getByText('Discord連携の確認')).toBeVisible({ timeout: 15000 });

        await expect(page.getByText('連携すると以下が行われます：')).toBeVisible();
        await expect(page.getByText('Discordアカウントの認証情報の確認')).toBeVisible();
        await expect(page.getByText('ファンクラブサーバーへの自動参加')).toBeVisible();
        await expect(page.getByText('購入プランに応じたロールの付与')).toBeVisible();
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
