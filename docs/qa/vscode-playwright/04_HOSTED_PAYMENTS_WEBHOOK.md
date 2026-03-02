# Step 04: 決済・Webhook 検証（Stripe Test Mode）

## 目的

購入処理とWebhook受信がHosted環境で成立するかをVSCodeから確認する。

## 前提

- Stripeはテストモード
- Supabase Edge Function `stripe-webhook` がデプロイ済み

## 実行

1. Hosted E2Eを実行

```powershell
npm run e2e:hosted
```

2. 必要に応じてStripe補助コマンド

```powershell
npm run stripe:listen
npm run stripe:trigger
```

## 目視確認ポイント（外部ダッシュボード）

- Stripe Dashboard の Webhook deliveries が `200`
- Supabase Logs で `stripe-webhook` の処理ログ確認
- memberships など関連テーブル更新を確認

## 完了条件

- テスト決済成功シナリオが通る
- Webhook受信とDB反映を確認できる
