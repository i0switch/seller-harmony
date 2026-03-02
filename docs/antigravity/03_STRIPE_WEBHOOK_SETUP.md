# Step 03: Stripe Webhook エンドポイント設定

> **目的**: Stripe Webhook を Supabase Edge Function に正しく接続する
> **実行環境**: Stripe Dashboard (テストモード)
> **前提**: Step 02 で環境変数を設定済み

---

## 概要

Stripe で発生するイベント（決済成功、サブスク更新、キャンセル等）を  
Supabase Edge Function `stripe-webhook` で受け取り処理する。

### アーキテクチャ
```
Stripe Event → Webhook エンドポイント → stripe-webhook Edge Function
  → membership テーブル更新
  → Discord Bot でロール付与/剥奪
  → audit_logs 記録
```

---

## Task 1: 既存 Webhook エンドポイントの確認

### 手順

1. Stripe Dashboard を開く:
   ```
   https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/workbench/webhooks
   ```

2. 既存のエンドポイント `we_1T52wlCPMy4DDs4SYpAK9yU8` を確認

3. **Endpoint URL** が以下になっているか確認:
   ```
   https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook
   ```
   → 異なる場合は Task 2 で更新する

---

## Task 2: Webhook エンドポイントURLの設定（必要な場合）

### エンドポイントURLを更新する手順

1. 該当の Webhook エンドポイントをクリック
2. **「...」メニュー** or **「Update details」** をクリック
3. **Endpoint URL** を以下に設定:
   ```
   https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook
   ```
4. 保存

### 新規作成が必要な場合

1. 「+ Add endpoint」をクリック
2. **Endpoint URL**:
   ```
   https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook
   ```
3. 「Select events to listen to」で以下を選択

---

## Task 3: 受信イベントの設定

### 必要なイベント一覧

以下のイベントが設定されていることを確認する:

#### 決済関連（必須）
- [x] `checkout.session.completed` — 決済完了
- [x] `invoice.payment_succeeded` — サブスク更新成功
- [x] `invoice.payment_failed` — 決済失敗

#### サブスクリプション関連（必須）
- [x] `customer.subscription.updated` — サブスク更新
- [x] `customer.subscription.deleted` — サブスクキャンセル

#### Connect 関連（seller onboarding）
- [x] `account.updated` — Seller の Stripe アカウント状態変更

#### 争議関連（推奨）
- [x] `charge.dispute.created` — 不正利用申告

### 設定手順

1. エンドポイント詳細ページ → 「Events to send」セクション
2. 上記イベントがすべてチェックされていることを確認
3. 不足があれば「+ Select events」で追加
4. 「Update endpoint」をクリック

---

## Task 4: Webhook 署名シークレットの確認

### 手順

1. エンドポイント詳細ページ → **「Signing secret」** セクション
2. 「Reveal」をクリックして値を確認
3. 値が `whsec_` で始まることを確認
4. **この値が Step 02 で Supabase の `STRIPE_WEBHOOK_SECRET` に設定した値と一致するか確認**

⚠️ **一致しない場合**: Supabase Edge Functions の Secrets を更新する
→ Supabase Dashboard → Edge Functions → Secrets → `STRIPE_WEBHOOK_SECRET` を更新

---

## Task 5: Webhook テスト送信

### Stripe Dashboard からテストイベントを送信

1. エンドポイント詳細ページ → 「Testing」タブ
2. **「Send test webhook」** ボタンをクリック
3. イベントタイプ: `checkout.session.completed` を選択
4. 「Send test webhook」を実行

### 期待される結果

- **Response**: `200 OK`
- **Response body**: `{"received": true}` or 類似のJSON
- エンドポイント詳細の「Recent deliveries」に成功ログが表示される

### 失敗した場合

| ステータス | 原因 | 対処 |
|---|---|---|
| `401` | Authorization ヘッダーなし | Edge Function の CORS / 認証設定を確認 |
| `400` | Signature verification failed | `STRIPE_WEBHOOK_SECRET` の値が不一致 |
| `500` | Function 内部エラー | Supabase Logs で詳細確認 |
| Timeout | Function 応答なし | Edge Function がデプロイされているか確認 |

---

## Task 6: Supabase ログで Webhook 受信を確認

### 手順

1. Supabase Dashboard → **Logs** → **Edge Functions**
2. Function: `stripe-webhook` を絞り込み
3. テスト送信したイベントのログが出ていることを確認

### 確認ポイント

- ログに `Received Stripe webhook:` 等のメッセージが出力されている
- HTTP ステータスコードが `200`
- エラースタックトレースが無い

---

## 完了確認

- [ ] Webhook エンドポイント URL が `https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook` である
- [ ] 全7イベント（checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted, account.updated, charge.dispute.created）が設定されている
- [ ] Signing secret が Supabase の `STRIPE_WEBHOOK_SECRET` と一致している
- [ ] テスト Webhook 送信で `200 OK` が返る
- [ ] Supabase Logs にイベントログが記録されている

---

## トラブルシューティング

### テスト Webhook が 404 を返す
→ Edge Function `stripe-webhook` がデプロイされていない。Step 02 に戻ってデプロイする。

### テスト Webhook が 400 "Invalid signature" を返す
→ `STRIPE_WEBHOOK_SECRET` が Stripe Dashboard の Signing secret と一致していない。Supabase Secrets を更新する。

### Supabase Logs にログが出ない
→ Edge Functions → `stripe-webhook` が「Active」状態か確認。「Paused」の場合は再デプロイが必要。
