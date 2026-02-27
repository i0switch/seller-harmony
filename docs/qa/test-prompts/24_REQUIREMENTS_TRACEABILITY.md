# テスト24: 要件定義トレーサビリティ — 仕様準拠の証明

> **カテゴリ**: 仕様準拠  
> **優先度**: P0 (Critical)  
> **推定所要時間**: 60分  
> **前提条件**: 要件定義_ai_optimized.md および 要件定義.txt を参照  
> **実行方法**: コードレビュー + ローカルテスト + Supabase管理画面確認

---

## AIエージェントへの指示

```
あなたは要件準拠監査を行うQAエンジニアです。
以下のトレーサビリティマトリクスに従い、要件定義の各項目が実装・テストで
カバーされていることを証明してください。

対象リポジトリ: seller-harmony
要件文書: 要件定義_ai_optimized.md, 要件定義.txt

各項目について:
1. 該当コードのファイルパスと行番号を記録
2. 該当テストケース（01〜23）を記録
3. テストで確認不能な場合は「コードレビューで確認」と記録
4. 未実装の場合は「❌ 未実装」と明記し修正提案を記載
```

---

## A. Membership状態遷移（ステートマシン）

要件定義で定義されたステートマシンが正確に実装されているか検証する。

### REQ-SM-01: ステータス定義の完全性

| ステータス | 要件定義 | DB実装 (migration) | Edge Function | UI表示 |
|---|---|---|---|---|
| `pending_discord` | ✅ | `20260227000000_fix_gaps.sql` | `stripe-webhook: checkout.session.completed` | 確認 |
| `active` | ✅ | 初期migration | `stripe-webhook: invoice.payment_succeeded` | 確認 |
| `grace_period` | ✅ | `20260227000000_fix_gaps.sql` | `stripe-webhook: invoice.payment_failed` | 確認 |
| `cancel_scheduled` | ✅ | `20260227000000_fix_gaps.sql` | `stripe-webhook: customer.subscription.updated` | 確認 |
| `payment_failed` | ✅ | 初期migration | ⚠️ 猶予期間満了後の自動遷移 | 確認 |
| `canceled` | ✅ | 初期migration | `stripe-webhook: customer.subscription.deleted` | 確認 |
| `expired` | ✅ | `20260227000000_fix_gaps.sql` | ⚠️ 確認必要 | 確認 |
| `refunded` | ✅ | `20260227000000_fix_gaps.sql` | `stripe-webhook: charge.refunded` | 確認 |

**検証手順**:
1. `subscription_status` enum を Supabase SQLエディタで確認:
   ```sql
   SELECT unnest(enum_range(NULL::subscription_status));
   ```
2. [ ] 上記8ステータスが全て存在すること

### REQ-SM-02: 状態遷移ルールの検証

| 遷移 | 要件 | 実装箇所 | PASS/FAIL |
|---|---|---|---|
| `pending_discord → active` | checkout後Discord連携完了時 | `discord-oauth: pending_discord → active update` | |
| `active → grace_period` | `invoice.payment_failed` 受信時 | `stripe-webhook: payment_failed handler` | |
| `active → cancel_scheduled` | `cancel_at_period_end=true` | `stripe-webhook: subscription.updated handler` | |
| `cancel_scheduled → expired` | 有効期間終了時 | ⚠️ **日次バッチ or Webhook** → 確認必要 | |
| `grace_period → active` | `invoice.payment_succeeded` 受信時 | `stripe-webhook: payment_succeeded handler` | |
| `grace_period → payment_failed` | 猶予期間満了・最終失敗確定 | ⚠️ **日次バッチ** → 確認必要 | |
| `active → canceled` | 即時解約 | `stripe-webhook: subscription.deleted` | |
| `canceled → expired` | 自動移行 | ⚠️ 確認必要 | |

**検証手順**:
1. [ ] Stripe CLIで各イベントを発火し、DB上の状態遷移をSQLで確認
2. [ ] 不正な遷移（例: `expired → active`）がブロックされるか確認

---

## B. Webhook処理要件

### REQ-WH-01: 署名検証（Fail-Closed）

| 要件 | 実装箇所 | 検証方法 |
|---|---|---|
| `Stripe-Signature` ヘッダー必須 | `stripe-webhook/index.ts` L155-160 | curl で署名なし送信 → 400確認 |
| `STRIPE_WEBHOOK_SECRET` 未設定で拒否 | `stripe-webhook/index.ts` L161-167 | 環境変数なしで起動 → 500確認 |
| 署名不一致で拒否 | `stripe-webhook/index.ts` L170-179 | 不正署名送信 → 400確認 |
| `req.text()` で生body取得 | `stripe-webhook/index.ts` L172 | コード確認（JSONパース前に取得） |

**検証手順**:
```bash
# 署名なし送信テスト
curl -X POST https://<project>.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}' 
# → 400 "Missing Stripe-Signature header" を期待

# 不正署名送信テスト  
curl -X POST https://<project>.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234,v1=fake_signature" \
  -d '{"type":"test"}'
# → 400 "Signature verification failed" を期待
```

- [ ] 署名なしで400が返る
- [ ] 不正署名で400が返る
- [ ] STRIPE_WEBHOOK_SECRET未設定で500が返る

### REQ-WH-02: 冪等性（重複受信の安全処理）

| 要件 | 実装箇所 | 検証方法 |
|---|---|---|
| `stripe_event_id` で重複チェック | `stripe-webhook/index.ts` L182-190 | 同一イベントID 2回送信 |
| 重複時は200返却 | `stripe-webhook/index.ts` L188-190 | 2回目で `{ duplicate: true }` |

**検証手順**:
```bash
# Stripe CLIで同一イベントを2回転送
stripe trigger checkout.session.completed
stripe events resend evt_XXXX --webhook-endpoint=we_XXXX
```
- [ ] 2回目の処理がスキップされ `duplicate: true` が返る
- [ ] DB上のmembershipが1レコードのまま変化しない

### REQ-WH-03: 対応イベントの完全性

| Webhookイベント | 要件 | 実装 | PASS/FAIL |
|---|---|---|---|
| `checkout.session.completed` | ✅ | stripe-webhook L197-230 | |
| `invoice.payment_succeeded` (≒ `invoice.paid`) | ✅ | stripe-webhook L231-247 | |
| `invoice.payment_failed` | ✅ | stripe-webhook L248-265 | |
| `customer.subscription.updated` | ✅ | stripe-webhook L266-288 | |
| `customer.subscription.deleted` | ✅ | stripe-webhook L289-322 | |
| `charge.refunded` | ✅ | stripe-webhook L323-355 | |
| `charge.dispute.created` | ✅ | stripe-webhook L356-381 | |
| `charge.dispute.closed` | ⚠️ 要件にあるが実装確認必要 | | |
| `invoice.finalization_failed` | ⚠️ 要件にあるが実装確認 | | |
| `invoice.marked_uncollectible` | ⚠️ 要件にあるが実装確認 | | |

- [ ] 上記全イベントの実装を確認
- [ ] 未実装イベントのリストアップと優先度付け

---

## C. Discord連携要件

### REQ-DC-01: OAuth state検証（CSRF防止）

| 要件 | 実装箇所 | PASS/FAIL |
|---|---|---|
| `state` パラメータ生成・送信 | `discord-oauth/index.ts` L94-104 | |
| サーバーサイドstate保存 | `discord-oauth/index.ts` L97-103 | |
| callback時のstate照合 | `discord-oauth/index.ts` L115-122 | |
| state不一致で403拒否 | `discord-oauth/index.ts` L119-122 | |
| state有効期限（10分） | `discord-oauth/index.ts` L125-131 | |
| 使用後のstate無効化 | `discord-oauth/index.ts` L141 (`oauth_state: null`) | |

### REQ-DC-02: ロール階層チェック

| 要件 | 実装箇所 | PASS/FAIL |
|---|---|---|
| Guild内の全ロール取得 | `discord-bot/index.ts` L79-83 | |
| Bot自身のロール位置計算 | `discord-bot/index.ts` L93-97 | |
| 対象ロールとの階層比較 | `discord-bot/index.ts` L100-101 | |
| `insufficient` 判定を返却 | `discord-bot/index.ts` L101 | |
| DB更新 (`bot_permission_status`) | `discord-bot/index.ts` L105-108 | |

### REQ-DC-03: ロール競合チェック（複数プラン同一ロール）

| 要件 | 実装箇所 | PASS/FAIL |
|---|---|---|
| 剥奪前に同一ロールの有効membership確認 | `stripe-webhook: removeDiscordRole()` L106-119 | |
| 有効な別membershipがあれば剥奪スキップ | `stripe-webhook: removeDiscordRole()` L121-126 | |
| スキップ時のログ出力 | `stripe-webhook: removeDiscordRole()` L128 | |

### REQ-DC-04: 誤アカウント連携防止

| 要件 | 実装箇所 | PASS/FAIL |
|---|---|---|
| OAuth完了後にDiscord usernameを表示 | フロント `DiscordResult.tsx` 確認必要 | |
| 「このアカウントで連携する/やり直す」UI | フロント `DiscordConfirm.tsx` 確認必要 | |

---

## D. 不払い猶予（Grace Period）

### REQ-GP-01: 猶予期間の実装

| 要件 | 実装箇所 | PASS/FAIL |
|---|---|---|
| `invoice.payment_failed` で即剥奪しない | stripe-webhook: grace_period遷移 | |
| デフォルト3日間の猶予 | stripe-webhook: `3 * 24 * 60 * 60 * 1000` | |
| `grace_period_started_at` 記録 | stripe-webhook L254 | |
| `grace_period_ends_at` 記録 | stripe-webhook L255 | |
| 期間内に `invoice.paid` → `active` 復旧 | stripe-webhook: payment_succeeded handler | |
| 復旧時に猶予カラムをnullリセット | stripe-webhook L237-239 | |

### REQ-GP-02: Stripe Smart Retries連携

| 要件 | 実装状況 | PASS/FAIL |
|---|---|---|
| `grace_period_ends_at` を Smart Retries と同期 | ⚠️ 現在は固定3日。Stripe側設定との連動検証必要 | |
| `invoice.voided` での同期 | ⚠️ 実装確認必要 | |

---

## E. 手動オーバーライド

### REQ-MO-01: 自動剥奪の保留

| 要件 | 実装箇所 | PASS/FAIL |
|---|---|---|
| `manual_override` フラグ | migration `20260227000003` | |
| subscription.deleted 時の override 確認 | stripe-webhook L296-297 | |
| override=true なら剥奪スキップ | stripe-webhook L310-316 | |
| refund 時の override 確認 | stripe-webhook L343 | |

---

## F. プラットフォーム管理機能

### REQ-PF-01: テナント管理

| 要件 | UI実装 | テストケース | PASS/FAIL |
|---|---|---|---|
| 販売者一覧 | `PlatformTenants.tsx` | TC-12 | |
| 状態監視（Stripe/KYC） | `PlatformTenantDetail.tsx` | TC-12 | |
| 利用停止/再開 | `PlatformTenantDetail.tsx` | TC-12 | |
| プラン数・会員数表示 | `PlatformTenants.tsx` | TC-12 | |

### REQ-PF-02: Kill Switch

| 要件 | UI実装 | テストケース | PASS/FAIL |
|---|---|---|---|
| Webhook処理停止 | `PlatformSystemControl.tsx` | TC-16 | |
| Discord剥奪停止 | `PlatformSystemControl.tsx` | TC-16 | |
| Discord付与停止 | `PlatformSystemControl.tsx` | TC-16 | |
| 番人バッチ停止 | `PlatformSystemControl.tsx` | TC-16 | |

### REQ-PF-03: お知らせ管理

| 要件 | UI実装 | テストケース | PASS/FAIL |
|---|---|---|---|
| title, body, starts_at, ends_at | `PlatformAnnouncements.tsx` | TC-15 | |
| CRUD操作 | `PlatformAnnouncements.tsx` | TC-15 | |
| ダッシュボードバナー表示 | `SellerDashboard.tsx` | TC-04 | |

---

## G. API ページング統一

### REQ-PG-01: レスポンス形式

| 要件 | 確認対象 | PASS/FAIL |
|---|---|---|
| `{ items, page, page_size, total_count }` 形式 | Backend API 全一覧エンドポイント | |
| フロントのPaginationBar統一 | TC-23-07 | |

---

## H. セキュリティ・データポリシー

### REQ-SEC-01: OAuth state (CSRF)

→ REQ-DC-01 で検証

### REQ-SEC-02: トークン暗号化

| 要件 | 実装確認 | PASS/FAIL |
|---|---|---|
| OAuthトークン暗号化保存 | `discord_identities.access_token` → カラム名確認 | |
| 平文ロギング禁止 | Edge Function console.log 確認 | |

### REQ-SEC-03: service_role 露出防止

→ テスト25 で詳細検証

### REQ-SEC-04: platform_admin 自己昇格防止

| 要件 | 実装箇所 | PASS/FAIL |
|---|---|---|
| signup時にplatform_admin指定でbuyer降格 | migration `20260227000001` trigger | |

---

## I. 監査ログ

### REQ-AL-01: action列挙値

| 要件 | 実装確認 | PASS/FAIL |
|---|---|---|
| CHECK制約で列挙値管理 | migration `20260227000000` | |
| 許可値: create, update, delete, cancel, refund, grant_role, revoke_role, override | 制約確認 | |

### REQ-AL-02: 相関ID

| 要件 | 実装確認 | PASS/FAIL |
|---|---|---|
| `correlation_id` カラム | stripe-webhook `writeAuditLog` | |
| Stripe event_id を correlation_id に使用 | stripe-webhook 全イベントハンドラ | |

---

## テスト完了チェックリスト

| セクション | 項目数 | PASS | FAIL | 未実装 |
|---|---|---|---|---|
| A. 状態遷移 | 8+8 | | | |
| B. Webhook処理 | 3セクション | | | |
| C. Discord連携 | 4セクション | | | |
| D. 不払い猶予 | 2セクション | | | |
| E. 手動オーバーライド | 1セクション | | | |
| F. Platform管理 | 3セクション | | | |
| G. ページング | 1セクション | | | |
| H. セキュリティ | 4セクション | | | |
| I. 監査ログ | 2セクション | | | |

---

## Done条件

```
全てのREQ項目に対して:
- PASS: 該当コード＋テストが存在し、動作確認済み
- FAIL: 修正コードを提案し、修正後に再テスト → 3回連続PASSでDone
- 未実装: 実装コードを生成し、テスト追加 → 3回連続PASSでDone
```
