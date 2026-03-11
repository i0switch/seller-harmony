# Seller Harmony 本番URL 最終テスト記録テンプレ

実施日:
実施者:
対象URL: `https://member-bridge-flow.lovable.app`
Stripe モード: テスト

## 1. 使用アカウント

- Seller:
- Buyer:
- Platform Admin:

## 2. 自動スモーク

- 実行コマンド:
- 実行時刻:
- 結果:
- レポート場所:
- 補足:

## 3. 手動E2E

### Seller

- ログイン:
- Stripe Connect:
- プラン作成:
- プランID:

### Buyer

- 購入導線:
- Checkout Session ID:
- Subscription ID:
- 成功ページ:
- マイページ反映:

### Webhook / DB

- Webhook Event ID:
- membership status:
- Seller 会員一覧反映:
- Platform Webhook 一覧反映:
- Retry Queue 状態:

### Discord

- OAuth 完了:
- 成功画面:
- ロール付与:
- クロスチェック結果:

### モバイル

- 購入開始:
- 購入完了:
- Buyer マイページ:
- Seller ログイン:

## 4. 異常系

- 決済失敗カード:
- UI 崩れの有無:
- 誤ステータス遷移の有無:
- Buyer 権限の Seller 操作拒否:
- Discord 失敗時の再試行導線:
- 返金テスト:

## 5. Console / Network

- 重大 Console Error:
- 常駐 403/500:
- 無限ローディング:

## 6. 発見事項

### Bug 1

- 概要:
- 再現手順:
- 期待結果:
- 実際の結果:
- スクショ:

### Bug 2

- 概要:
- 再現手順:
- 期待結果:
- 実際の結果:
- スクショ:

## 7. 最終判定

- 判定:
- 理由:
- 次アクション:
