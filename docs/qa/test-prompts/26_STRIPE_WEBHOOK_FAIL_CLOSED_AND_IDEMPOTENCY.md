# テスト26: Stripe Webhook 結合テスト — Fail-Closed・署名検証・冪等性・状態遷移

> **カテゴリ**: 外部連携結合テスト  
> **優先度**: P0 (Critical)  
> **推定所要時間**: 60分  
> **前提条件**: Stripe CLIインストール済み、Supabase Edge Functions デプロイ済み  
> **実行環境**: ローカル（Stripe CLI → Edge Function → Supabase DB）

---

## AIエージェントへの指示

```
あなたはStripe連携の結合テストエンジニアです。
Stripe CLIを使用して実際のWebhookイベントを発火し、
Edge Function（stripe-webhook）が要件定義通りに動作することを検証してください。

実行環境:
- Stripe CLI: stripe listen --forward-to <Supabase Edge Function URL>
- Supabase Edge Function: https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook
- DB確認: Supabase SQLエディタ

検証対象の要件:
1. Fail-Closed（署名検証失敗で処理禁止）
2. 冪等性（stripe_event_idベースの重複排除）
3. 全Webhookイベントの状態遷移正確性
4. 猶予期間（grace_period）の実装
5. ロール競合チェック

⚠️ 重要: Stripe CLIの whsec_... と Stripe Dashboardの whsec_... は別物です。
テスト環境と本番環境で secret を混同しないでください。
```

---

## 前提準備

### PREP-01: Stripe CLI セットアップ

```bash
# Stripe CLIのインストール（未済の場合）
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# Webhook転送開始（Edge Functionへ直接転送）
stripe listen --forward-to https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook
```

⚠️ **Secret管理の注意**:
- Stripe CLIが表示する `whsec_...` をメモする
- この値を Supabase の `STRIPE_WEBHOOK_SECRET` 環境変数に設定する
- **この2つが一致しないと全テストが失敗する**
- **Stripe Dashboard で作成した Webhook Endpoint の secret とは別物**

```bash
# Supabase Edge Function の secret 更新
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXXXX
```

### PREP-02: テストデータ準備

```sql
-- テスト用のseller/buyer/planがDBに存在することを確認
SELECT * FROM seller_profiles LIMIT 1;
SELECT * FROM plans WHERE is_active = true LIMIT 1;
SELECT * FROM buyers LIMIT 1;
```

---

## A. Fail-Closed 検証

### STR-26-01: Stripe-Signatureヘッダーなしで拒否

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"id":"evt_test_no_sig","type":"checkout.session.completed","data":{"object":{}}}'
```

**期待結果**:
- [ ] HTTP 400 が返る
- [ ] `"Missing Stripe-Signature header"` エラーメッセージ
- [ ] `stripe_webhook_events` テーブルにレコードが **挿入されない**

### STR-26-02: 不正な署名で拒否

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=fake_signature_value" \
  -d '{"id":"evt_test_bad_sig","type":"checkout.session.completed","data":{"object":{}}}'
```

**期待結果**:
- [ ] HTTP 400 が返る  
- [ ] `"Signature verification failed"` エラーメッセージ
- [ ] `stripe_webhook_events` テーブルにレコードが **挿入されない**

### STR-26-03: STRIPE_WEBHOOK_SECRET未設定で拒否

**手順**:
```bash
# 一時的にsecretを空にする
supabase secrets set STRIPE_WEBHOOK_SECRET=""

# 有効な署名付きリクエストを送信（Stripe CLIから）
stripe trigger checkout.session.completed
```

**期待結果**:
- [ ] HTTP 500 が返る
- [ ] `"Webhook secret not configured"` エラーメッセージ
- [ ] **処理が一切実行されない**

**復旧**:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXXXX
```

### STR-26-04: raw body での署名検証（req.text()使用）

**コードレビュー確認**:
- [ ] `stripe-webhook/index.ts` で `req.text()` を使用して生body取得
- [ ] `req.json()` ではなく `req.text()` が `constructEventAsync` に渡されている
- [ ] body が署名検証前にパース・変形されていない

```
実装確認箇所: stripe-webhook/index.ts
  const body = await req.text();  // ← req.json()ではないこと
  event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
```

---

## B. 冪等性 検証

### STR-26-05: 同一イベントの重複処理防止

**手順**:
```bash
# 1回目: イベント発火
stripe trigger checkout.session.completed
# → event IDをメモ（Stripe CLIの出力から: evt_XXXXXXX）

# DB確認
# SELECT * FROM stripe_webhook_events WHERE stripe_event_id = 'evt_XXXXXXX';
# → processing_status = 'processed' を確認

# 2回目: 同一イベントを再送
stripe events resend evt_XXXXXXX --webhook-endpoint=we_XXXXXXX
```

**期待結果**:
- [ ] 1回目: `stripe_webhook_events` にレコードが作成される（`processing_status = 'processed'`）
- [ ] 2回目: HTTP 200 + `{ "received": true, "duplicate": true }` が返る
- [ ] 2回目: `memberships` テーブルが変化していない
- [ ] 2回目: 新しい `stripe_webhook_events` レコードが作成されない

### STR-26-06: 異なるイベントの連続処理

**手順**:
```bash
# 連続で異なるイベントを発火
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
```

**期待結果**:
- [ ] 各イベントが別レコードとして `stripe_webhook_events` に記録される
- [ ] 各イベントの `processing_status` が `processed` になる

---

## C. 状態遷移 検証

### STR-26-07: checkout.session.completed → membership作成

**手順**:
```bash
# メタデータ付きのCheckoutセッション完了をシミュレート
stripe trigger checkout.session.completed \
  --override checkout_session:metadata.buyer_id=<test_buyer_id> \
  --override checkout_session:metadata.plan_id=<test_plan_id> \
  --override checkout_session:metadata.seller_id=<test_seller_id>
```

**DB確認**:
```sql
SELECT * FROM memberships 
WHERE buyer_id = '<test_buyer_id>' AND plan_id = '<test_plan_id>';
```

**期待結果**:
- [ ] `memberships` にレコードが作成される
- [ ] Discord identity が存在する場合: `status = 'active'`
- [ ] Discord identity が存在しない場合: `status = 'pending_discord'`
- [ ] `stripe_subscription_id` が正しく記録される
- [ ] `audit_logs` に `action = 'create'` のレコードが記録される

### STR-26-08: invoice.payment_failed → grace_period遷移

**前提**: active な membership が存在すること

**手順**:
```bash
stripe trigger invoice.payment_failed
```

**DB確認**:
```sql
SELECT status, grace_period_started_at, grace_period_ends_at 
FROM memberships 
WHERE stripe_subscription_id = '<subscription_id>';
```

**期待結果**:
- [ ] `status` が `grace_period` に変更される
- [ ] `grace_period_started_at` が現在時刻付近
- [ ] `grace_period_ends_at` が 3日後（72時間後）
- [ ] **Discordロールが剥奪されていない**（即時剥奪しない）
- [ ] `audit_logs` に `payment_failed_grace_period` の記録

### STR-26-09: invoice.payment_succeeded → grace_period から active 復旧

**前提**: grace_period の membership が存在すること

**手順**:
```bash
stripe trigger invoice.payment_succeeded
```

**DB確認**:
```sql
SELECT status, grace_period_started_at, grace_period_ends_at 
FROM memberships 
WHERE stripe_subscription_id = '<subscription_id>';
```

**期待結果**:
- [ ] `status` が `active` に変更される
- [ ] `grace_period_started_at` が `null` にリセットされる
- [ ] `grace_period_ends_at` が `null` にリセットされる
- [ ] `audit_logs` に `grace_period_recovered` の記録

### STR-26-10: customer.subscription.updated (cancel_at_period_end=true) → cancel_scheduled

**手順**:
```bash
stripe trigger customer.subscription.updated \
  --override subscription:cancel_at_period_end=true
```

**DB確認**:
```sql
SELECT status, revoke_scheduled_at 
FROM memberships 
WHERE stripe_subscription_id = '<subscription_id>';
```

**期待結果**:
- [ ] `status` が `cancel_scheduled` に変更される
- [ ] `revoke_scheduled_at` が `current_period_end` の値（期間終了日）
- [ ] **Discordロールが維持されている**（期間満了まで）
- [ ] `audit_logs` に `cancel_scheduled` の記録

### STR-26-11: customer.subscription.deleted → canceled + ロール剥奪

**前提**: active な membership + Discord identity + Discord server が存在すること

**手順**:
```bash
stripe trigger customer.subscription.deleted
```

**DB確認**:
```sql
SELECT status, entitlement_ends_at 
FROM memberships 
WHERE stripe_subscription_id = '<subscription_id>';
```

**期待結果**:
- [ ] `status` が `canceled` に変更される
- [ ] `entitlement_ends_at` が現在時刻付近
- [ ] `manual_override = false` の場合: **Discordロールが剥奪される**
- [ ] `manual_override = true` の場合: **Discordロールが維持される**
- [ ] `audit_logs` に `revoke_role` or `override` の記録

### STR-26-12: charge.refunded → refunded + ロール剥奪

**手順**:
```bash
stripe trigger charge.refunded
```

**期待結果**:
- [ ] `status` が `refunded` に変更される
- [ ] `manual_override = false` の場合: Discordロール剥奪
- [ ] `audit_logs` に `refund` の記録

### STR-26-13: charge.dispute.created → risk_flag + dispute_status

**手順**:
```bash
stripe trigger charge.dispute.created
```

**DB確認**:
```sql
SELECT risk_flag, dispute_status 
FROM memberships 
WHERE stripe_subscription_id = '<subscription_id>';
```

**期待結果**:
- [ ] `risk_flag = true` に変更される
- [ ] `dispute_status` にdispute の status 値が記録される
- [ ] `audit_logs` に `dispute_created` の記録

---

## D. ロール競合チェック

### STR-26-14: 同一ロールの複数membership — 片方解約時の剥奪スキップ

**前提セットアップ**:
```sql
-- plan_A と plan_B が同じ discord_role_id を持つ
-- buyer_X が plan_A (active) と plan_B (active) の両方に加入
INSERT INTO memberships (buyer_id, plan_id, seller_id, status, stripe_subscription_id)
VALUES 
  ('<buyer_id>', '<plan_a_id>', '<seller_id>', 'active', 'sub_test_a'),
  ('<buyer_id>', '<plan_b_id>', '<seller_id>', 'active', 'sub_test_b');
```

**手順**:
plan_A の subscription を削除:
```bash
stripe subscriptions cancel sub_test_a
# → customer.subscription.deleted イベントが発火
```

**期待結果**:
- [ ] plan_A の membership が `canceled` になる
- [ ] **Discordロールは剥奪されない**（plan_B が同じロールで active のため）
- [ ] ログに `Skipped removing role due to another active membership.` が出力される

### STR-26-15: 全membershipが無効になった場合のロール剥奪

**手順**:
plan_B の subscription も削除:
```bash
stripe subscriptions cancel sub_test_b
```

**期待結果**:
- [ ] plan_B の membership が `canceled` になる
- [ ] **今度はDiscordロールが剥奪される**（有効な他membershipがないため）

---

## E. Webhook Secret 混同防止

### STR-26-16: Stripe CLI vs Dashboard の secret 区別

**確認項目**:
- [ ] Stripe CLI 起動時の `whsec_...` と Dashboard で設定した Webhook Endpoint の `whsec_...` が **異なる**値であること
- [ ] ローカルテスト時は CLI の secret を設定していること
- [ ] 本番デプロイ時は Dashboard の secret を設定するべきことが明確

**ドキュメント確認**:
```
CLIのsecret:    whsec_CLI_XXXXX  (stripe listen 起動時に表示)
Dashboardの:    whsec_DASH_XXXXX (Webhook Endpoint設定画面で表示)
→ これらは別物！混同すると全Webhookが拒否される
```

---

## F. エラーハンドリングとリトライ

### STR-26-17: 処理エラー時の200応答（Stripe再送防止）

**コードレビュー確認**:
```
// stripe-webhook/index.ts の catch ブロック
// Return 200 to prevent Stripe from retrying (event is recorded for manual retry)
return new Response(JSON.stringify({ error: errorMsg }), {
  status: 200,  // ← Stripeに再送させない
});
```

- [ ] 処理エラー時に200を返してStripeの自動再送を防いでいる
- [ ] エラーイベントは `stripe_webhook_events` に `processing_status = 'failed'` で記録される
- [ ] 手動リトライキュー（Platform Admin UI）から再処理可能

### STR-26-18: 監査ログの相関ID

**確認手順**:
```sql
SELECT action, correlation_id, details 
FROM audit_logs 
WHERE correlation_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

- [ ] 全ての監査ログに `correlation_id` が設定されている
- [ ] `correlation_id` が Stripe の `event_id` と一致する
- [ ] 1つのWebhookイベントに紐づく全操作が同一 `correlation_id` で追跡可能

---

## テスト完了チェックリスト

| セクション | テスト | 結果 | 備考 |
|---|---|---|---|
| A. Fail-Closed | STR-26-01: 署名なし拒否 | | |
| A. Fail-Closed | STR-26-02: 不正署名拒否 | | |
| A. Fail-Closed | STR-26-03: Secret未設定拒否 | | |
| A. Fail-Closed | STR-26-04: raw body検証 | | |
| B. 冪等性 | STR-26-05: 重複排除 | | |
| B. 冪等性 | STR-26-06: 連続処理 | | |
| C. 状態遷移 | STR-26-07: checkout → membership | | |
| C. 状態遷移 | STR-26-08: 支払失敗 → grace_period | | |
| C. 状態遷移 | STR-26-09: 支払成功 → active復旧 | | |
| C. 状態遷移 | STR-26-10: cancel_at_period_end | | |
| C. 状態遷移 | STR-26-11: 解約 → canceled | | |
| C. 状態遷移 | STR-26-12: 返金 → refunded | | |
| C. 状態遷移 | STR-26-13: dispute → risk_flag | | |
| D. ロール競合 | STR-26-14: 複数membership剥奪スキップ | | |
| D. ロール競合 | STR-26-15: 全membership無効で剥奪 | | |
| E. Secret管理 | STR-26-16: CLI vs Dashboard 区別 | | |
| F. エラー | STR-26-17: 200応答で再送防止 | | |
| F. 監査 | STR-26-18: 相関ID追跡 | | |

---

## Done条件

```
全STR項目がPASSであること。
FAIL項目がある場合:
1. Edge Functionの修正コードを生成
2. supabase functions deploy stripe-webhook で再デプロイ
3. 当該テストを再実行
4. 3回連続PASSでDone

⚠️ テスト完了後は必ず:
- テスト用のmembership/eventデータをクリーンアップ
- STRIPE_WEBHOOK_SECRET を本番用に戻す（CLIのsecretのまま放置しない）
```
