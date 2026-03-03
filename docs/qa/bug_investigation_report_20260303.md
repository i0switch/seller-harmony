# seller-harmony 不具合候補調査レポート（提出版）

- 調査日: 2026-03-03
- 対象リポジトリ: https://github.com/i0switch/seller-harmony
- 調査方針: 修正は行わず、不具合候補の再現可能性と証拠を重視
- 注意: 本レポートでは「不具合候補」として記載し、断定はしていない

---

## 1. システム概要

### 主要機能
- Seller: オンボーディング（Stripe/Discord）、プラン作成・公開、会員管理、Webhook閲覧
- Buyer: プラン閲覧・購入、購入後のDiscord連携、会員ページ表示
- Platform Admin: 全体監視・運用画面

### 主要ユーザー種別
- `buyer`
- `seller`
- `platform_admin`

### 主要データフロー
1. Buyerが `/p/:id` で `stripe-checkout` GET を呼び出して購入対象プランを取得
2. Buyerが `stripe-checkout` POST で Checkout Session を生成
3. Stripe Webhook（`checkout.session.completed` 等）で `memberships` 状態更新
4. Discord OAuth（state保存→code交換→save確定）で BuyerのDiscord連携を確定
5. `discord-bot` が `grant_role` でDiscordロール付与

### 決済/Discord/認証の関連図の要約
- 全Edge Functionは `verify_jwt = false` だが、関数内でBearer検証を実装
- 決済状態の正本は `memberships`、ロール同期状態は `role_assignments`、イベント監査は `stripe_webhook_events`
- Discord連携は2段階（情報取得と最終確定）で、状態遷移の整合性が重要

---

## 2. 高優先度の不具合候補

### ID: CAND-P0-01
**タイトル**: 重複購入防止が競合に弱く、同時リクエストで二重課金が起こり得る不具合候補  
**深刻度**: P0  
**対象**: edge function / integration / database

**症状**
- 同一buyer・同一planへの同時POST時、事前チェックを双方通過し複数Checkout Sessionが生成される可能性。

**再現手順**
1. 同一JWTで `stripe-checkout` POST（同一 `plan_id`）を同時に2本送る
2. 両方が `existingMembership` 未検出のまま Session作成に進むか確認

**期待結果**
- 片方のみ成功し、もう片方は重複として拒否される

**実際結果**
- 実装上、排他制御なしで事前チェック後にSession作成へ進む

**証拠**
- `supabase/functions/stripe-checkout/index.ts` の事前チェック: `existingMembership` 判定
- 同ファイルで直後に `stripe.checkout.sessions.create(...)`
- `supabase/functions/stripe-webhook/index.ts` は `upsert(..., { onConflict: 'buyer_id,plan_id' })`
- Supabase MCP実確認: `memberships` に `UNIQUE (buyer_id, plan_id)` は存在（最終整合のみ）

**原因仮説**
- DB整合はWebhook時点で担保されるが、Checkout Session生成前の原子的排他がない

**影響範囲**
- 二重決済、返金対応増、会員状態の一時的不整合

**確信度**: 高

---

### ID: CAND-P0-02
**タイトル**: Webhook冪等性が同時到達で `failed` 誤遷移し得る不具合候補  
**深刻度**: P0  
**対象**: edge function / database

**症状**
- 同一 `event.id` が同時到達すると、SELECT→INSERTの競合で片系が例外化し、既存イベントを `failed` 更新する可能性。

**再現手順**
1. 同一 `Stripe-Signature` / 同一 `event.id` のWebhookを並列送信
2. `stripe_webhook_events.processing_status` の推移を確認

**期待結果**
- duplicateは常に200 duplicate応答で、既存processed行を破壊しない

**実際結果**
- 実装は2段階（重複チェック→INSERT）で、例外時に `failed` 更新分岐がある

**証拠**
- `supabase/functions/stripe-webhook/index.ts` の「Idempotency: skip already-processed events」
- 同ファイルの pending INSERT
- 同ファイルの catch節で `processing_status: 'failed'` 更新
- Supabase MCP実確認: `stripe_webhook_events.stripe_event_id` は UNIQUE

**原因仮説**
- `ON CONFLICT DO NOTHING` 一発処理ではなく、事前SELECT依存のため競合窓がある

**影響範囲**
- Webhook再送ループ、監視ノイズ、状態不整合

**確信度**: 中

---

### ID: CAND-P1-01
**タイトル**: `inactive` プラン拒否ロジックがスキーマ不一致で実効性不明な不具合候補  
**深刻度**: P1  
**対象**: edge function / database / integration

**症状**
- `stripe-checkout` が `plan.is_active` を判定しているが、実DBの `plans` 列に `is_active` が存在しない。

**再現手順**
1. `stripe-checkout` の `is_active` 判定箇所を確認
2. Supabase MCPで `public.plans` の列定義を確認

**期待結果**
- inactive概念を表現する列/状態と購入拒否ロジックが一致

**実際結果**
- 判定コードと実スキーマが一致していない

**証拠**
- `supabase/functions/stripe-checkout/index.ts` の `if (plan.is_active === false)`
- Supabase MCP実確認: `plans` 列一覧に `is_active` なし
- `src/integrations/supabase/types.ts` の `plans` 型にも `is_active` なし

**原因仮説**
- 旧実装残骸、または移行漏れ

**影響範囲**
- hidden/inactive/deleted の扱い不整合、購入可否判定の誤り

**確信度**: 高

---

### ID: CAND-P1-02
**タイトル**: Discord OAuth最終確定で `active` 化するがロール付与保証がない不具合候補  
**深刻度**: P1  
**対象**: edge function / integration

**症状**
- `discord-oauth` の finalize（`save=true`）で `pending_discord -> active` 更新は実施するが、同処理で `grant_role` は実行されない。

**再現手順**
1. OAuth code交換後、`save=true`（codeなし）で finalize
2. `memberships.status` と `role_assignments` の整合を確認

**期待結果**
- `active` 化とDiscordロール付与結果の整合が同一フローで担保

**実際結果**
- `active` 更新のみ先行し、ロール付与は別導線依存

**証拠**
- `supabase/functions/discord-oauth/index.ts` の finalize分岐（`shouldSave && !actualCode`）
- 同分岐で `memberships.update({ status: 'active' })`
- `grant_role` は `supabase/functions/discord-bot/index.ts` の別actionでのみ実施

**原因仮説**
- 2段階フローで状態更新と権限付与の境界が分離しすぎている

**影響範囲**
- 「activeだがDiscord権限未付与」の問い合わせ増

**確信度**: 中

---

### ID: CAND-P1-03
**タイトル**: Hosted環境でlocalhost APIフォールバックにより主要導線が停止する不具合候補  
**深刻度**: P1  
**対象**: frontend / integration / test

**症状**
- `VITE_API_URL` 未設定時、Platform/Seller API が `http://localhost:8000` を参照し、Hosted環境でCORS失敗。

**再現手順**
1. Hosted環境で `VITE_API_URL` を未設定
2. Seller/Platform画面のデータ取得を実行

**期待結果**
- Hostedで有効APIへ接続、または起動時にfail-fast

**実際結果**
- localhost向けリクエストが発生し、ブラウザでブロック

**証拠**
- `src/services/api/http/client.ts`: `const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";`
- `playwright-results.txt`: loopback address space/CORS block ログ

**原因仮説**
- 環境変数未設定時の安全側制御が不足

**影響範囲**
- Seller/Platform主要機能の実質停止

**確信度**: 高

---

### ID: CAND-P1-04
**タイトル**: Buyer系E2EがESM互換性エラーで実行不能な不具合候補  
**深刻度**: P1  
**対象**: test

**症状**
- Buyer導線テストが `ReferenceError: __dirname is not defined in ES module scope` で開始直後に失敗。

**再現手順**
1. `runTests` で `tests/e2e/tc17-buyer-checkout.spec.ts` または `tests/e2e/buyer-flow.spec.ts` を実行

**期待結果**
- fixture読み込みで失敗せず、シナリオ検証へ進む

**実際結果**
- fixture初期化で即失敗

**証拠**
- `tests/e2e/fixtures/auth.fixture.ts`: `path.resolve(__dirname, '../../../.env.test')`
- 実行結果: runTests失敗（ReferenceError）

**原因仮説**
- ESM実行環境でCJS前提の `__dirname` を利用

**影響範囲**
- 購入完了〜Discord連携導線の自動回帰検知が不能

**確信度**: 高

---

## 3. 仕様かバグか不明な論点

### 論点 A: `platform_admin` の buyer画面アクセス許可
- **どこが曖昧か**: 監査/運用目的の意図的仕様か、境界緩和か不明
- **確認すべき実装/テーブル/画面/ログ**:
  - `src/layouts/BuyerLayout.tsx` の `BUYER_ALLOWED_ROLES = ["buyer", "platform_admin"]`
  - 運用設計書（platform_adminの許可範囲）

### 論点 B: discord-bot の fallback server 選択
- **どこが曖昧か**: `plan.discord_server_id` 未設定時に seller唯一serverへ自動フォールバックする仕様の是非
- **確認すべき実装/テーブル/画面/ログ**:
  - `supabase/functions/discord-bot/index.ts` の `ambiguous_server` / `discord_server_not_configured` 分岐
  - `plans.discord_server_id` の運用必須性

### 論点 C: `memberships` RLSポリシーの重複
- **どこが曖昧か**: 実害のない冗長か、許可面積拡大か不明
- **確認すべき実装/テーブル/画面/ログ**:
  - Supabase MCPで取得した `pg_policies`（`memberships` の複数SELECT/UPDATE policy）
  - 旧migration適用順と本番適用履歴

---

## 4. テスト欠落

### 現状不足しているテスト
1. 同一buyer・同一plan同時POST時のCheckout競合テスト
2. 同一Stripe event同時到達時のWebhook冪等性/状態遷移テスト
3. inactive/hidden/deletedプラン購入可否の統合テスト（スキーマ整合含む）
4. OAuth finalize後の `memberships` と `role_assignments` 整合テスト
5. E2E fixtureのESM互換性テスト（実行基盤健全性）

### 優先順位
- **P0**: 1, 2
- **P1**: 3, 4, 5

### なぜ危険か
- P0は課金事故・状態不整合に直結
- P1は主要導線（購入/連携）の品質劣化と検知不能化を招く

---

## 5. 未確認領域

### 見切れていない箇所
1. Stripe実イベント再送を伴う高並列Webhook検証
2. 本番同等Discord組織での複数サーバ運用時挙動
3. Supabase関数実行ログの時系列（失敗→再試行）全量

### その理由
- データ破壊回避のため、課金・外部連携の強い操作を限定
- 本調査では非破壊の静的読解＋限定実行テスト＋Supabaseメタ情報確認を優先

---

## 付録: 実施確認（非破壊）

- Edge Function系テスト実行: `tests/e2e/edge-function-integration.spec.ts`, `tests/e2e/security-tests.spec.ts`（通過）
- Buyer系テスト実行: `tests/e2e/tc17-buyer-checkout.spec.ts` など（fixtureのESMエラーで失敗）
- Supabase MCP確認:
  - `plans` 実列定義（`is_active` 不在）
  - `memberships` 制約（`UNIQUE (buyer_id, plan_id)` あり）
  - `stripe_webhook_events` 制約（`stripe_event_id` UNIQUE あり）
  - `memberships` の seller更新制限トリガー有効化状態

---

以上。