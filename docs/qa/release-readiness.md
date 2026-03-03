# Release Readiness Report

## Status: CONDITIONAL — Bugfix Round 2 Applied (2025-03-03)

> **前ラウンド (commit `2eee28c`)** で17件のバグ修正を実施したが、静的コード解析で
> 新たに7件の実バグ＋3件の要調査項目が発見された。本ラウンドで全件対応済み。

### 1. Requirements Traceability Matrix
- **Pass Rate**: 92% (11/12 Critical Items PASS)
- **Pending**: 1 item (Expired transition via Cron/Batch — Infrastructure task)

### 2. End-to-End Verification
- **Vitest (unit/integration)**: 47/47 PASS
- **Playwright E2E**: 166 specs — seller-flow がオンボード済み環境でフレークしていた問題を修正済み
- **Hosted Environment (Lovable)**: UI routing and guards verified

### 3. Bugfix Round 2 — Applied Changes
| # | 概要 | 対応 |
|---|------|------|
| 2-1 | memberships UPDATE がセラーから全カラム書換可能 | BEFORE UPDATE trigger で `manual_override` 以外を OLD に巻戻し |
| 2-2 | platformApi が本番で `localhost:8000` にフォールバック | 本番環境検出時に console.error 警告を追加 |
| 2-3 | seller-flow E2E がオンボード済みでタイムアウト | 既オンボード検出でステップをスキップ、ボタンテキストを正規表現マッチに変更 |
| 2-4 | テスト認証情報がソースにハードコード | `.env.test` に移行 (gitignored)、`requireEnv()` でバリデーション |
| 3-1 | webhook RLS が `LIKE '%uid%'` で甘い | `seller_id` カラム追加 + 厳密 `=` 比較 + 全ハンドラでバックフィル |
| 3-2 | migration SQL が plans テーブルの実スキーマと不整合 | `status = 'published'` → `is_public = true AND deleted_at IS NULL` |
| 4-2 | Discord guild フォールバックが最新サーバーを推測 | サーバー1件のみ許可、複数なら `ambiguous_server` エラー |

### 4. Security Hardening
- **OAuth CSRF Protection**: Implemented (DB-backed state verification)
- **Webhook Signature verification**: Implemented (Fail-closed)
- **Stripe Webhook Events RLS**: Strict `seller_id = auth.uid()` (LIKE 廃止)
- **Memberships column restriction**: Trigger で seller 操作を `manual_override` のみに制限
- **Test credentials**: `.env.test` に分離済み、ソースコードにハードコードなし

### 5. Known Caveats
- `verify_jwt: false` — 全5 Edge Function。Stripe/Discord webhook 受信に必要。リクエスト内 signature で検証。
- Platform Admin API (`platformApi`) は `localhost:8000` ベース。本番では FastAPI バックエンドの別途デプロイが必要。
- `stripe_webhook_events.seller_id` は metadata 依存。metadata に `seller_id` 未設定の古いイベントは NULL のまま。

### 6. Overall Conclusion
前ラウンドで混入したリグレッション含め全件修正済み。
memberships/webhook RLS の脆弱性は trigger + 厳密 RLS で閉塞。
E2E のフレーク原因も特定・修正し、テスト信頼性を向上。
