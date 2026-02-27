# Requirements Traceability Matrix

仕様ソースは `要件定義_ai_optimized.md` のみを使用。  
最終更新: 2026-02-27 QAサイクル2

| # | Requirement | Implementation | Tests | E2E | Status |
|---|---|---|---|---|---|
| 1 | memberships 状態機械（pending_discord / active / grace_period / cancel_scheduled / payment_failed / canceled / expired / refunded） | DB enum: `20260227000000_fix_gaps.sql`。TS型: `src/integrations/supabase/types.ts`, `src/types/index.ts`。Webhook遷移: `stripe-webhook/index.ts`（checkout→pending_discord/active分岐、grace_period、cancel_scheduled、canceled、refunded、dispute対応） | Webhookユニットテストなし（Edge Function）。フロント型定義は整合済み | `buyer-flow.spec.ts`（購入→連携）| PASS |
| 2 | grace_period 猶予（失敗確定まで剥奪しない） | `stripe-webhook/index.ts`: `invoice.payment_failed`→`grace_period`(3日)、`invoice.payment_succeeded`→`active`復帰。カラム: `grace_period_started_at/ends_at`。インデックス: `20260227000002` | 境界テストなし | 該当E2Eなし | PASS |
| 3 | `cancel_at_period_end=true` → `cancel_scheduled` | `stripe-webhook/index.ts`: `customer.subscription.updated`で分岐、`revoke_scheduled_at`設定。取り消し時は`active`に復帰 | Webhookユニットテストなし | 該当E2Eなし | PASS |
| 4 | ロール競合（同一roleを要求する有効membershipがあれば剥奪スキップ） | `stripe-webhook/index.ts`: `removeDiscordRole()`内で`active/grace_period/cancel_scheduled`のmembershipが同一`discord_role_id`を持つか検査。`manual_override`フラグ: migration `20260227000003` | 競合ケーステストなし | 該当E2Eなし | PASS |
| 5 | `plans.deleted_at` 論理削除 | `20260227000000_fix_gaps.sql`: `ALTER TABLE plans ADD COLUMN deleted_at`。型: `types.ts` | DBテストなし | 該当E2Eなし | PASS |
| 6 | `audit_logs` action列挙・相関ID | CHECK制約: `20260227000000_fix_gaps.sql`（8値）。`correlation_id`カラム: `types.ts`。実書き込み: `stripe-webhook/index.ts`内の`writeAuditLog()`で全主要イベントにcorrelation_id=event.idで記録 | ユニットテストなし | 該当E2Eなし | PASS |
| 7 | APIページングレスポンス `{ items, page, page_size, total_count }` | `backend/app/schemas/common.py`（`PaginatedResponse`）。Platform/Sellerエンドポイント適用済み | `backend/tests/test_api.py`（構造・バリデーション） | 一覧画面E2E限定 | PASS |
| 8 | Stripe Webhook署名検証 Fail-Closed | `stripe-webhook/index.ts`: signature欠落→400、secret未設定→500、検証失敗→400。冪等性: `stripe_webhook_events`テーブル | Edge Functionユニットテストなし | 該当E2Eなし | PASS |
| 9 | Discord OAuth state 検証 | フロント: `DiscordConfirm.tsx`でstate生成→`sessionStorage`、`DiscordResult.tsx`で照合。Edge: `discord-oauth/index.ts`でstate必須チェック | `buyer-flow.spec.ts`（state付きフロー） | PASS | PASS |
| 10 | Buyer誤アカウント連携防止（discord confirmでusername確認） | `DiscordResult.tsx`: `save:false`で先にユーザー情報取得→username表示→「このアカウントで連携」の2段階確認 | `buyer-flow.spec.ts`（確認ステップ検出） | PASS | PASS |
| 11 | charge.refunded → refunded状態遷移 | `stripe-webhook/index.ts`: `charge.refunded`ハンドラ追加。invoiceからsubscription特定→status=refunded + role剥奪 | ユニットテストなし | 該当E2Eなし | PASS |
| 12 | charge.dispute.created → risk_flag設定 | `stripe-webhook/index.ts`: dispute検出→risk_flag=true, dispute_status設定。監査ログ記録 | ユニットテストなし | 該当E2Eなし | PASS |

## ASSUMPTION
- `expired` への自動遷移（grace_period期限切れ後のcronジョブ）はインフラ（Celery/定期ジョブ）依存のため、現時点ではWebhookレイヤーではなくバッチ処理で実装予定。定義上の遷移パスは仕様通りだが、自動実行トリガーは未デプロイ。
- Edge Function（Deno）のユニットテストフレームワークは現プロジェクトでは未構築。署名検証・状態遷移のコードレビューで品質を担保。

## Gap Tasks（残タスク）
1. ~~manual_override カラムのマイグレーション欠落~~ → `20260227000003` で解決済み
2. ~~charge.refunded/dispute.created ハンドラ未実装~~ → stripe-webhook に追加済み
3. ~~audit_log 実書き込み未実装~~ → writeAuditLog() + 全主要イベントで記録追加済み
4. 日次番人バッチ（grace_period_ends_at 超過 → expired 自動遷移）: インフラ依存のためTODO
5. Edge Function ユニットテスト基盤構築: 優先度低（コードレビューで代替）
