# Step 09: バイヤー新規登録・プラン購入テスト

> **目的**: 新規 Buyer が会員登録し、Stripe Checkout でプランを購入するフローをテスト
> **実行環境**: ブラウザ（Lovable プレビュー + Stripe テストモード）
> **前提**: Step 08 完了（プランが1件以上存在）

---

## テストアカウント（新規作成）

| 項目 | 値 |
|---|---|
| メール | `i0switch.g+buyer01@gmail.com`（任意の新規アドレス） |
| パスワード | `pasowota427314s` |

## Stripe テストカード

| カード番号 | 用途 |
|---|---|
| `4242 4242 4242 4242` | 成功する決済 |
| CVC: `123`（任意の3桁） | |
| 有効期限: `12/30`（未来の日付） | |
| 郵便番号: `12345`（任意） | |

---

## Task 1: Buyer 向けページにアクセス

### 手順

1. ブラウザで以下のURLを開く:
   ```
   https://preview--member-bridge-flow.lovable.app/
   ```

2. トップページが表示されることを確認
3. セラーのプラン一覧ページにアクセス:
   ```
   https://preview--member-bridge-flow.lovable.app/buyer/plans
   ```
   ※ URLは実装によって異なる場合がある。以下も試す:
   - `/plans`
   - `/buyer/checkout`
   - `/seller/{seller_id}/plans`

---

## Task 2: Buyer アカウント新規登録

### 手順

1. Buyer のサインアップページにアクセス:
   ```
   https://preview--member-bridge-flow.lovable.app/buyer/signup
   ```
   ※ 存在しない場合は `/signup` も試す

2. サインアップフォームに入力:
   | フィールド | 入力値 |
   |---|---|
   | メールアドレス | `i0switch.g+buyer01@gmail.com` |
   | パスワード | `pasowota427314s` |
   | パスワード確認 | `pasowota427314s` |
   | 表示名 | `テストバイヤー01`（あれば） |

3. 「アカウント作成」ボタンをクリック

### メール確認

- Supabase で Auto Confirm が有効 → 即時ログイン可能
- 無効 → Gmail で確認メールを開くか、Supabase Dashboard → Authentication → Users で手動確認

---

## Task 3: プラン一覧の確認

### 手順

1. Buyer としてログイン後、プランが表示される画面にアクセス

2. Step 08 で作成した以下のプランが表示されることを確認:
   - **スタンダード会員** — ¥980/月
   - **プレミアム会員** — ¥9,800/年

### 期待される画面

- プラン名、説明、価格が表示される
- 「購入」「サブスクリプションを開始」等のボタンがある

---

## Task 4: Stripe Checkout セッションの開始

### 手順

1. **「スタンダード会員」**の「購入」ボタンをクリック

### 期待される動作

1. Edge Function `stripe-checkout` が呼び出される
2. Stripe Checkout セッションが作成される
3. Stripe の Checkout ページにリダイレクトされる:
   - URL例: `https://checkout.stripe.com/c/pay/cs_test_...`

### エラーの場合

| エラー | 原因 | 対処 |
|---|---|---|
| 「決済セッション作成に失敗」 | Edge Function エラー | Supabase Logs で `stripe-checkout` のログ確認 |
| ネットワークエラー | CORS | `ALLOWED_ORIGIN` を確認 |
| 「ログインが必要です」 | 認証トークン未送信 | ログイン状態を確認 |

---

## Task 5: Stripe Checkout でテスト決済

### 手順

1. Stripe Checkout ページが表示される

2. **メールアドレス**:
   ```
   i0switch.g+buyer01@gmail.com
   ```

3. **カード情報**:
   | フィールド | 入力値 |
   |---|---|
   | カード番号 | `4242 4242 4242 4242` |
   | 有効期限 | `12/30` |
   | CVC | `123` |
   | 郵便番号 | `12345` |

4. **「支払う」「Pay」** ボタンをクリック

### 期待される結果

- 決済処理中のスピナーが表示される
- 決済成功
- アプリの成功ページにリダイレクトされる

---

## Task 6: 決済成功ページの確認

### 期待されるリダイレクト先

```
https://preview--member-bridge-flow.lovable.app/buyer/checkout/success?session_id=cs_test_...
```

### 確認ポイント

- 「決済が完了しました」「ご購入ありがとうございます」等のメッセージ
- 購入したプラン名が表示される
- 「ダッシュボードへ」「マイページへ」等のリンクがある

⚠️ Step 01 でモック削除済みの場合、Supabase からリアルデータを取得して表示すること。

---

## Task 7: Buyer マイページで会員情報確認

### 手順

1. Buyer マイページにアクセス:
   ```
   https://preview--member-bridge-flow.lovable.app/buyer/me
   ```

### 確認ポイント

- 会員ステータス: `active` または `pending_discord`
- プラン名: `スタンダード会員`
- 次回請求日が表示される

---

## Task 8: Supabase でデータ確認

### 手順

1. Supabase Dashboard → Table Editor

### `memberships` テーブル

| カラム | 期待値 |
|---|---|
| `user_id` | Buyer の user_id |
| `plan_id` | スタンダード会員の plan_id |
| `status` | `active` or `pending_discord` |
| `stripe_subscription_id` | `sub_` で始まる |
| `current_period_start` | 直近のタイムスタンプ |
| `current_period_end` | 約1ヶ月後のタイムスタンプ |

### `stripe_webhook_events` テーブル（存在する場合）

| カラム | 期待値 |
|---|---|
| `event_type` | `checkout.session.completed` |
| `processed_at` | 直近のタイムスタンプ |
| `status` | `processed` or `success` |

---

## Task 9: Stripe Dashboard で決済確認

### 手順

1. Stripe Dashboard → Payments:
   ```
   https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/payments
   ```

2. 最新の決済が表示されることを確認:
   - Amount: ¥980
   - Status: Succeeded
   - Customer: `i0switch.g+buyer01@gmail.com`
   - Description: スタンダード会員 関連

3. Stripe Dashboard → Subscriptions:
   ```
   https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/subscriptions
   ```

4. アクティブなサブスクリプションが表示されることを確認

---

## 完了確認

- [ ] Buyer アカウントが新規作成できる
- [ ] プラン一覧が表示される
- [ ] Stripe Checkout にリダイレクトされる
- [ ] テストカード `4242...4242` で決済が成功する
- [ ] 決済成功ページが表示される
- [ ] Buyer マイページに会員情報が表示される
- [ ] Supabase の memberships テーブルにレコードが存在する
- [ ] Stripe Dashboard に決済記録がある
- [ ] Stripe Dashboard にサブスクリプション記録がある

---

## トラブルシューティング

### Stripe Checkout にリダイレクトされない
→ DevTools → Network で `stripe-checkout` Edge Function のレスポンスを確認。`url` フィールドが返されているか。

### 決済後にアプリに戻らない
→ Stripe Checkout の `success_url` の設定を確認。`stripe-checkout` Edge Function のコードを確認。

### memberships にレコードが作成されない
→ Webhook (checkout.session.completed) が処理されていない。Step 03 / Step 10 を確認。
