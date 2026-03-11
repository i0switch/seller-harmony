# Seller Harmony 本番URL 最終テスト実行ランブック

最終更新: 2026-03-11
対象URL: `https://member-bridge-flow.lovable.app`
決済前提: Stripe テストモード

## 1. 目的

本番URL上で、以下が一連で成立するかを最終確認する。

- Seller の認証と初期設定
- Seller の Stripe Connect 連携
- Seller のプラン作成
- Buyer の購入
- Stripe Webhook 反映
- Buyer の Discord 連携
- Discord ロール付与
- Seller / Platform 画面と DB 状態の整合

## 2. 事前確認

### 2-1. 環境

- [ ] 本番URLが `https://member-bridge-flow.lovable.app` である
- [ ] Stripe はテストモードである
- [ ] Supabase Edge Functions 5本がデプロイ済み
  - [ ] `stripe-checkout`
  - [ ] `stripe-onboarding`
  - [ ] `stripe-webhook`
  - [ ] `discord-oauth`
  - [ ] `discord-bot`
- [ ] Supabase Secrets が設定済み
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `DISCORD_CLIENT_ID`
  - [ ] `DISCORD_CLIENT_SECRET`
  - [ ] `DISCORD_BOT_TOKEN`
  - [ ] `ALLOWED_ORIGIN`
- [ ] Discord OAuth Redirect URL が本番URLに一致
- [ ] Discord Bot に `Manage Roles` 権限がある

### 2-2. ローカル実行準備

- [ ] `npm install`
- [ ] `.env.test` が最新
- [ ] `.auth/lovable-hosted-state.json` が有効
- [ ] Stripe CLI ログイン済み

## 3. 自動スモーク

### 3-1. 実行コマンド

```bash
npm run e2e:hosted
```

必要なら安定性確認:

```bash
npm run e2e:hosted:3x
```

### 3-2. 合格条件

- [ ] hosted E2E が成功
- [ ] Seller 認証導線が壊れていない
- [ ] Seller オンボーディング導線が壊れていない
- [ ] Buyer 導線が壊れていない
- [ ] Discord エラー処理導線が壊れていない
- [ ] 保護ルートの認証ガードが壊れていない

自動スモークで失敗したら、手動E2Eは止めて原因切り分けを優先する。

## 4. 手動E2E

### 4-1. Seller

- [ ] Seller でログインできる
- [ ] Seller ダッシュボードが開く
- [ ] Stripe Connect 開始ボタンから Stripe に遷移する
- [ ] Stripe 側のオンボーディング完了後、戻りURLへ正常復帰する
- [ ] 画面上の Stripe 連携状態が更新される

### 4-2. Seller プラン作成

- [ ] 月額プランを1件作成できる
- [ ] 可能なら価格違いでもう1件作成できる
- [ ] 作成後に一覧へ反映される
- [ ] 詳細画面が壊れていない
- [ ] 購入導線または公開導線が壊れていない

### 4-3. Buyer 購入

- [ ] Buyer で購入導線に入れる
- [ ] Stripe Checkout に遷移する
- [ ] テストカード `4242 4242 4242 4242` で決済成功する
- [ ] `/checkout/success` が正常表示される
- [ ] Buyer マイページに加入状態が反映される

### 4-4. Webhook / DB / 画面照合

- [ ] Platform の Webhook 一覧に対象イベントが記録される
- [ ] Retry Queue に失敗イベントが残っていない
- [ ] Seller の会員一覧に buyer が反映される
- [ ] DB 上で membership が `active` になっている
- [ ] 画面表示と DB の状態が一致する

### 4-5. Discord

- [ ] Buyer が Discord OAuth を完走できる
- [ ] 連携成功画面が出る
- [ ] Discord サーバーで対象ロールが付与される
- [ ] Seller のクロスチェック画面で大きな不整合が出ていない

### 4-6. モバイル

以下の4画面だけはスマホ幅でも確認する。

- [ ] 購入開始
- [ ] 購入完了
- [ ] Buyer マイページ
- [ ] Seller ログイン

## 5. 異常系

### 5-1. 決済失敗

- [ ] 失敗カードで1回決済失敗を試す
- [ ] UI が壊れない
- [ ] membership が誤って `active` にならない

推奨カード:

- `4000 0000 0000 9995` 残高不足
- `4000 0000 0000 0002` カード拒否

### 5-2. 権限 / エラー導線

- [ ] Buyer 権限で Seller 用 Stripe 接続ができない
- [ ] Buyer 権限で Seller 用 Bot 操作ができない
- [ ] Discord 連携失敗時にエラー表示が出る
- [ ] Discord 連携失敗時に再試行導線がある

### 5-3. 可能なら実施

- [ ] 返金を1件テストする
- [ ] 返金後に Webhook が処理される
- [ ] 返金後の権限剥奪またはステータス遷移が正しい

## 6. 当日記録するもの

- [ ] 実施日時
- [ ] 実施者
- [ ] Seller / Buyer アカウント
- [ ] 使用したプランID
- [ ] Checkout Session ID
- [ ] Subscription ID
- [ ] Webhook Event ID
- [ ] Discord 連携成否
- [ ] スクリーンショット
- [ ] 発見バグの再現手順

## 7. 最終判定

### GO 条件

- [ ] hosted E2E が通る
- [ ] `Seller作成 → Buyer購入 → Webhook反映 → Discord連携 → ロール付与` が通る
- [ ] Platform 画面 / Seller 画面 / DB の状態が一致する
- [ ] 失敗カードで誤課金や誤ステータス遷移がない
- [ ] 重大な Console Error、無限ローディング、403/500 常駐がない

### 既知の残リスク

- `grace_period -> expired` の自動遷移バッチは別枠確認
- `backend/` は主系ではなく、実運用は Supabase Edge Functions 前提
