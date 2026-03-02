# Step 10: Stripe Webhook 処理の検証

> **目的**: Stripe から送信される Webhook が正しく処理され、DB が更新されることを検証
> **実行環境**: Stripe Dashboard + Supabase Dashboard
> **前提**: Step 09 完了（少なくとも1件の決済成功）

---

## 概要

### Webhook 処理のデータフロー
```
Stripe Event
  → stripe-webhook Edge Function
    → Signature 検証
    → イベントタイプ別処理
    → Supabase DB 更新
    → (必要に応じて) Discord Bot ロール付与
    → audit_logs 記録
    → Response 200
```

---

## Task 1: Webhook 配信ログの確認（Stripe Dashboard）

### 手順

1. Stripe Dashboard → Webhooks → エンドポイント詳細:
   ```
   https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/workbench/webhooks/we_1T52wlCPMy4DDs4SYpAK9yU8
   ```

2. **「Recent deliveries」** または **「Events」** タブを確認

3. Step 09 の決済で以下のイベントが配信されていることを確認:

   | イベント | ステータス | 説明 |
   |---|---|---|
   | `checkout.session.completed` | ✅ `200` | 決済セッション完了 |
   | `invoice.payment_succeeded` | ✅ `200` | 請求書支払い成功 |
   | `customer.subscription.updated` | ✅ `200` | サブスク状態更新（受信設定されている場合） |

### 確認ポイント

- 各イベントの **HTTP Status** が `200` であること
- **Response time** が妥当（< 10秒）
- **Retry** が発生していないこと

---

## Task 2: Supabase Logs で処理ログを確認

### 手順

1. Supabase Dashboard → **Logs** → **Edge Functions**:
   ```
   https://supabase.com/dashboard/project/xaqzuevdmeqxntvhamce/logs/edge-functions
   ```

2. Function: `stripe-webhook` でフィルター

3. 最近のログエントリを確認

### 期待されるログ出力例

```
Processing webhook event: checkout.session.completed (evt_...)
Session completed for subscription: sub_...
Membership created/updated for user: ...
Webhook processed successfully
```

### エラーログの場合

```
❌ Signature verification failed
❌ Unknown event type: ...
❌ Error processing webhook: ...
```
→ 対応するトラブルシューティングを参照

---

## Task 3: memberships テーブルの検証

### 手順

1. Supabase Dashboard → Table Editor → `memberships`

2. Step 09 で作成された会員レコードを確認:

| カラム | 期待値 | 重要度 |
|---|---|---|
| `user_id` | Buyer の UUID | 必須 |
| `plan_id` | スタンダード会員の plan UUID | 必須 |
| `status` | `active` | 必須 |
| `stripe_subscription_id` | `sub_` で始まる | 必須 |
| `stripe_customer_id` | `cus_` で始まる | 必須 |
| `current_period_start` | 決済時刻 | 必須 |
| `current_period_end` | 約1ヶ月後 | 必須 |
| `cancel_at_period_end` | `false` | 必須 |
| `created_at` | 決済時刻 | 自動 |

---

## Task 4: stripe_webhook_events テーブルの検証（存在する場合）

### 手順

1. Supabase Dashboard → Table Editor → `stripe_webhook_events`

2. 処理済みイベントを確認:

| カラム | 期待値 |
|---|---|
| `event_id` | `evt_` で始まる |
| `event_type` | `checkout.session.completed` |
| `processed` | `true` |
| `created_at` | 直近のタイムスタンプ |

⚠️ このテーブルは冪等性（同じイベントの重複処理防止）のために使用される。

---

## Task 5: audit_logs テーブルの検証（存在する場合）

### 手順

1. Supabase Dashboard → Table Editor → `audit_logs`

2. Webhook 処理に関するログが記録されているか確認:

| カラム | 期待値 |
|---|---|
| `action` | `membership_created` or `checkout_completed` 等 |
| `actor_id` | システム or Buyer の UUID |
| `details` | JSON 形式の処理詳細 |

---

## Task 6: Webhook 手動テスト — invoice.payment_failed

### 手順

1. Stripe Dashboard → Webhooks → テスト:
   ```
   https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/workbench/webhooks/we_1T52wlCPMy4DDs4SYpAK9yU8
   ```

2. 「Send test webhook」をクリック
3. イベントタイプ: `invoice.payment_failed` を選択
4. 送信

### 期待される結果

- HTTP Status: `200`
- Supabase Logs に処理ログが出力される
- ⚠️ テストイベントのため実際の membership は更新されない（実在しないサブスクID）

---

## Task 7: Webhook 手動テスト — customer.subscription.deleted

### 手順

1. 「Send test webhook」をクリック
2. イベントタイプ: `customer.subscription.deleted` を選択
3. 送信

### 期待される結果

- HTTP Status: `200`
- Edge Function がエラーなく処理を完了

---

## Task 8: Webhook 失敗時のリトライ確認

### 手順

1. Stripe Dashboard → Webhooks → エンドポイント詳細
2. 「Failed deliveries」タブを確認

### 期待される結果

- 失敗した配信が無いこと
- もし失敗がある場合:
  - ステータスコードを確認
  - 「Retry」ボタンで再送信
  - 成功することを確認

---

## 完了確認

- [ ] Stripe Dashboard で Webhook 配信ログが確認できる
- [ ] `checkout.session.completed` が `200` で処理されている
- [ ] Supabase Logs に処理ログが出力されている
- [ ] `memberships` テーブルにレコードが存在し `status` が `active`
- [ ] `stripe_webhook_events` テーブルにイベント記録がある（テーブル存在時）
- [ ] 手動テスト webhook（payment_failed, subscription_deleted）が `200` 返す
- [ ] 失敗・リトライの配信が無い

---

## トラブルシューティング

### Webhook が `400` を返す
→ `STRIPE_WEBHOOK_SECRET` の不一致。Stripe Dashboard の Signing secret と Supabase Edge Function の Secrets が一致しているか確認。

### Webhook が `500` を返す
→ Edge Function 内部エラー。Supabase Logs で詳細を確認。よくある原因:
- `SUPABASE_SERVICE_ROLE_KEY` 未設定
- DB テーブルのスキーマ不一致
- 必須カラムが NULL

### membership が作成されない
→ Webhook は `200` を返しているが、DB 操作でサイレント失敗している可能性。Edge Function のエラーハンドリングをログで確認。
