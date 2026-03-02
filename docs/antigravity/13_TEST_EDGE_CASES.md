# Step 13: エッジケース・異常系テスト

> **目的**: 決済失敗、キャンセル、返金、猶予期間など異常系フローの動作を確認
> **実行環境**: ブラウザ + Stripe Dashboard + Supabase Dashboard
> **前提**: Step 09〜11 完了（正常系フロー完了）

---

## Stripe テストカード一覧

| カード番号 | 動作 |
|---|---|
| `4242 4242 4242 4242` | 成功 |
| `4000 0000 0000 9995` | 残高不足で失敗 |
| `4000 0000 0000 0341` | カード拒否で失敗 |
| `4000 0000 0000 3220` | 3D Secure 認証必要 |

**共通**: CVC `123`, 有効期限 `12/30`, 郵便番号 `12345`

---

## Test Case 1: 決済失敗テスト

### 目的
残高不足カードで Checkout を試み、適切なエラーハンドリングを確認

### 手順

1. 新しい Buyer アカウントを作成:
   - メール: `i0switch.g+buyer02@gmail.com`
   - パスワード: `pasowota427314s`

2. プラン購入フローを開始（Step 09 と同様）

3. Stripe Checkout で以下のカードを使用:
   ```
   4000 0000 0000 9995
   ```

4. 「支払う」をクリック

### 期待される結果

- Stripe Checkout が「Your card has insufficient funds」エラーを表示
- 決済が失敗する
- アプリの成功ページにはリダイレクトされない
- Supabase の `memberships` テーブルにレコードが **作成されない**

### 確認ポイント

- [ ] カード拒否のエラーメッセージが表示される
- [ ] 再度別のカードで試行可能
- [ ] DB に不完全なレコードが残らない

---

## Test Case 2: サブスクリプションキャンセル

### 目的
アクティブなサブスクリプションをキャンセルし、ステータスが正しく更新されることを確認

### 方法A: アプリ内からキャンセル

1. Buyer (`i0switch.g+buyer01@gmail.com`) としてログイン
2. マイページ `/buyer/me` にアクセス
3. 「サブスクリプションをキャンセル」「退会」ボタンをクリック
4. 確認ダイアログで「はい」をクリック

### 方法B: Stripe Dashboard からキャンセル

1. Stripe Dashboard → Subscriptions
   ```
   https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/subscriptions
   ```
2. 対象のサブスクリプションをクリック
3. 「Cancel subscription」をクリック
4. 「Cancel at end of period」を選択（猶予期間テスト）

### 期待される結果

#### 即時キャンセルの場合
1. Stripe → `customer.subscription.deleted` Webhook 発火
2. `memberships.status` → `canceled`
3. Discord ロールが剥奪される
4. Buyer マイページに「キャンセル済み」表示

#### 期間終了時キャンセルの場合
1. `memberships.cancel_at_period_end` → `true`
2. `memberships.status` → `cancel_scheduled`
3. 期間終了まではサービス利用可能
4. 期間終了後に `customer.subscription.deleted` → `canceled`

### Supabase 確認

```sql
SELECT status, cancel_at_period_end, current_period_end 
FROM memberships 
WHERE user_id = '<buyer_user_id>';
```

### Discord 確認

- キャンセル後にロールが剥奪されているか
- `role_assignments.assigned` が `false` になっているか

---

## Test Case 3: 返金テスト

### 手順

1. Stripe Dashboard → Payments:
   ```
   https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/payments
   ```

2. 対象の決済をクリック

3. 「Refund」ボタンをクリック

4. 全額返金 or 一部返金を選択

5. 「Refund」を実行

### 期待される結果

- Stripe → `charge.refunded` Webhook 発火（設定されていれば）
- `memberships.status` → `refunded`（実装による）
- Discord ロールが剥奪される（実装による）

### 確認ポイント

- [ ] Stripe Dashboard で Refund ステータスが「Succeeded」
- [ ] Supabase で membership ステータスが更新される
- [ ] Discord ロールが剥奪される

---

## Test Case 4: 3D Secure 認証テスト

### 手順

1. 新しい Buyer で Checkout フローを実行

2. Stripe Checkout でカード入力:
   ```
   4000 0000 0000 3220
   ```

3. 3D Secure 認証画面が表示される

4. **「Complete authentication」** をクリック

### 期待される結果

- 3D Secure 認証ページが表示される
- 認証成功後、通常の決済成功フローと同じ
- `checkout.session.completed` Webhook が発火

### 認証失敗テスト

1. 3D Secure 画面で **「Fail authentication」** をクリック
2. 決済が失敗する
3. エラーメッセージが表示される

---

## Test Case 5: 決済失敗による猶予期間 (Grace Period)

### 手順

この動作はサブスクの自動更新時に発火する。Stripe Dashboard から手動でシミュレート:

1. Stripe Dashboard → Subscriptions → 対象サブスクをクリック
2. 「Actions」→ 「Update subscription」
3. 次の請求で失敗するよう設定:
   - テスト用の「Fail next invoice」オプション（存在する場合）

### 代替手順: Stripe CLI でイベントを発火

```bash
stripe trigger invoice.payment_failed --stripe-account=acct_1T4pL2CPMy4DDs4S
```

### 期待される結果

- `invoice.payment_failed` Webhook 発火
- `memberships.status` → `payment_failed` or `grace_period`
- 猶予期間設定に応じたリトライスケジュール
- 最終的にリトライ成功 or キャンセル

---

## Test Case 6: 重複 Webhook 処理（冪等性テスト）

### 手順

1. Stripe Dashboard → Webhooks → Recent deliveries
2. 処理済みのイベントを選択
3. 「Resend」ボタンをクリック

### 期待される結果

- Webhook が再度 `200` を返す
- DB にレコードが重複作成されない
- `stripe_webhook_events` テーブルで重複チェックが機能している

---

## Test Case 7: 不正なロールの Seller ページアクセス

### 手順

1. Buyer アカウントでログイン
2. セラー管理ページに直接アクセス:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/dashboard
   ```

### 期待される結果

- アクセス拒否（403）またはリダイレクト
- Buyer がセラーの機能を操作できない

### 逆パターン

1. Seller アカウントで Admin ページに直接アクセス:
   ```
   https://preview--member-bridge-flow.lovable.app/platform
   ```

2. アクセス拒否またはリダイレクト

---

## Test Case 8: 未認証状態でのページアクセス

### 手順

1. ログアウト状態（またはシークレットウィンドウ）で:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/dashboard
   https://preview--member-bridge-flow.lovable.app/platform
   https://preview--member-bridge-flow.lovable.app/buyer/me
   ```

### 期待される結果

- すべてログインページにリダイレクトされる

---

## 完了確認

- [ ] 決済失敗カードでエラーが表示される
- [ ] サブスクリプションキャンセルが正しく処理される
- [ ] キャンセル後に Discord ロールが剥奪される
- [ ] 返金が処理される
- [ ] 3D Secure 認証フローが動作する
- [ ] 重複 Webhook が冪等に処理される
- [ ] ロールベースのアクセス制御が機能する
- [ ] 未認証アクセスがリダイレクトされる

---

## トラブルシューティング

### キャンセル後もロールが残っている
→ `customer.subscription.deleted` Webhook が正しくロール剥奪を実行しているか確認。`discord-bot` Edge Function のログを確認。

### 返金後に membership ステータスが変わらない
→ `charge.refunded` イベントが Webhook エンドポイントの受信イベントに含まれていない可能性。Step 03 で追加する。

### 猶予期間が機能しない
→ Stripe の retry schedule 設定を確認。Stripe Dashboard → Settings → Billing → Subscriptions and emails → Manage failed payments。
