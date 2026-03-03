# seller-harmony バグ調査レポート

- 調査日: 2026-03-03
- 対象リポジトリ: https://github.com/i0switch/seller-harmony
- 調査範囲: Frontend / Supabase Edge Functions / Supabase migrations / 既存テスト / 既存ドキュメント
- 実施制約: コード修正・コミット・PR作成なし（調査のみ）

---

## 1. 全体所見

### リスクの高い領域

- 認可/RLS（sellerの更新権限、Webhook閲覧権限）
- Hosted環境でのAPI接続経路（localhost依存）
- E2E品質（状態依存テストの不安定化）
- テスト資産の機密情報露出（固定メール/パスワード）

### 重点的に見た理由

- マルチテナントSaaSでは越権更新・越境閲覧が直接インシデント化するため
- Stripe/Discord連携は失敗時の影響範囲が課金・権限付与に直結するため
- 現行ドキュメントの準備完了表現と、実テスト結果の乖離が存在するため

---

## 2. 確認済みバグ

### 2-1. sellerがmembershipsの任意列を更新可能（manual_override用途を超える越権）

- 深刻度: **Critical**
- 種別: **Permissions**
- 発生箇所: `supabase/migrations/20260303100000_bugfix_rls_and_memberships.sql`
- 再現手順:
  1. seller権限ユーザーでログイン
  2. `memberships` の seller_id一致行へ `status` / `risk_flag` / `dispute_status` 等をUPDATE
  3. 更新が通ることを確認
- 実際の結果: seller_id一致のみでUPDATE許可され、更新列の制約がない
- 期待結果: sellerは業務上必要な最小列のみ更新可能であるべき
- 根拠ファイル/ログ:
  - `supabase/migrations/20260303100000_bugfix_rls_and_memberships.sql` (FOR UPDATE, WITH CHECK が seller_id のみ)
- 原因の仮説: UPDATEポリシーが行所有のみを判定し、列レベル統制が未実装
- 修正方針の概要（コードは書かない）: 更新対象を限定するRPC/トリガー/列制約に分離

### 2-2. Hosted環境でPlatform APIがlocalhost固定に落ち、機能停止

- 深刻度: **High**
- 種別: **Config**
- 発生箇所:
  - `src/services/api/http/client.ts`
  - `src/services/api/index.ts`
- 再現手順:
  1. `VITE_API_URL` 未設定でHosted起動
  2. Platform/Seller系API呼び出し
  3. ブラウザ通信先が `http://localhost:8000` になる
- 実際の結果: CORS/ERR_FAILEDでAPI失敗
- 期待結果: Hostedでは有効なBackend URLへ接続される
- 根拠ファイル/ログ:
  - `src/services/api/http/client.ts` (`const BASE_URL = ... || "http://localhost:8000"`)
  - `src/services/api/index.ts` (platformApiがHTTP実装を使用)
  - `playwright-results.txt` (localhost向けCORSブロックログ)
- 原因の仮説: HTTPクライアントのデフォルトBASE_URLがlocalhost、platform APIがHTTP依存のまま
- 修正方針の概要（コードは書かない）: Hosted必須環境変数化、未設定時fail-fast、またはSupabase直結へ統一

### 2-3. Seller Flow E2Eが既存アカウント状態に依存して恒常的に不安定

- 深刻度: **Medium**
- 種別: **Test**
- 発生箇所:
  - `tests/e2e/seller-flow.spec.ts`
  - `src/pages/seller/OnboardingProfile.tsx`
- 再現手順:
  1. `runTests` で `seller-flow.spec.ts` 実行
  2. 既にonboardedなsellerアカウントを利用
  3. `/seller/onboarding/profile` からdashboardへリダイレクトされ、placeholder操作でTimeout
- 実際の結果: テスト失敗（再実行でも再現）
- 期待結果: テスト前提状態が固定され、常に同一フローを検証できる
- 根拠ファイル/ログ:
  - `tests/e2e/seller-flow.spec.ts` (`loginAsSeller(page)` 後に profile placeholder を前提操作)
  - `src/pages/seller/OnboardingProfile.tsx` (`isOnboarded` なら dashboard に `Navigate`)
  - `runTests` 実行結果: 該当specでTimeout失敗
- 原因の仮説: 共有テストアカウントの進捗状態が固定されていない
- 修正方針の概要（コードは書かない）: テストデータ初期化または使い捨てアカウント化

### 2-4. テストコードに固定資格情報が平文で含まれる

- 深刻度: **High**
- 種別: **Security / Test**
- 発生箇所:
  - `tests/e2e/fixtures/auth.fixture.ts`
  - `tests/e2e/edge-function-integration.spec.ts`
  - `tests/e2e/security-tests.spec.ts`
- 再現手順:
  1. リポジトリ内テストコードを確認
  2. 固定メール/パスワードが平文記載されていることを確認
- 実際の結果: 認証情報が直接記載されている
- 期待結果: 認証情報はSecret管理し、リポジトリ平文保持しない
- 根拠ファイル/ログ:
  - `tests/e2e/fixtures/auth.fixture.ts` (`SELLER_EMAIL`, `BUYER_EMAIL`, `TEST_PASSWORD`)
  - `tests/e2e/edge-function-integration.spec.ts`（固定資格情報でトークン取得）
  - `tests/e2e/security-tests.spec.ts`（固定資格情報使用）
- 原因の仮説: テスト簡略化優先で機密管理ポリシー未適用
- 修正方針の概要（コードは書かない）: CI Secret注入、権限最小化、定期ローテーション

---

## 3. 高確度のバグ候補

### 3-1. seller向けWebhook閲覧RLSが部分一致検索で越境閲覧を誘発し得る

- 深刻度: **High**
- 種別: **Permissions / Data**
- 発生箇所: `supabase/migrations/20260303100000_bugfix_rls_and_memberships.sql`
- 再現手順:
  1. payloadに他seller UUID文字列を含むイベントを作成
  2. sellerでWebhook一覧を取得
- 実際の結果: `payload::text LIKE '%<uid>%` 判定で厳密なテナント紐付けでない
- 期待結果: seller_idの構造化キーによる厳密一致
- 根拠ファイル/ログ:
  - `supabase/migrations/20260303100000_bugfix_rls_and_memberships.sql` (`payload::text LIKE ...`)
  - `src/services/api/supabase/seller.ts` (`stripe_webhook_events` を直接参照)
- 原因の仮説: 暫定対応として文字列検索ポリシーを採用
- 修正方針の概要（コードは書かない）: 正規化カラム（seller_id）導入＋厳密RLS

### 3-2. migrationチェーン内に現行スキーマ非互換SQLが残存

- 深刻度: **High**
- 種別: **Data / Config**
- 発生箇所:
  - `supabase/migrations/20260303000001_public_buyer_policies.sql`
  - `supabase/migrations/20260303100000_bugfix_rls_and_memberships.sql`
  - `src/integrations/supabase/types.ts`
- 再現手順:
  1. 先頭からmigration適用
  2. `plans.status` 参照ポリシー適用時の整合を確認
- 実際の結果: 先行migrationに `status = 'published'` が残存、後続で修正前提
- 期待結果: クリーン適用時にも常に整合
- 根拠ファイル/ログ:
  - `20260303000001_public_buyer_policies.sql`（`status = 'published'`）
  - `20260303100000_bugfix_rls_and_memberships.sql`（`is_public`条件へ再作成）
  - `src/integrations/supabase/types.ts`（`plans` に `status` 列なし）
- 原因の仮説: 後続修正前提のマイグレーションが残存
- 修正方針の概要（コードは書かない）: migration順序/内容の再整理とクリーン環境再適用検証

### 3-3. リリース準備ドキュメントと実テスト結果に乖離

- 深刻度: **Medium**
- 種別: **Test / Process**
- 発生箇所:
  - `docs/production-readiness-tests.md`
  - `docs/qa/release-readiness.md`
- 再現手順:
  1. ドキュメントの「PASS/READY」表記を確認
  2. 現行コードでrunTests実行
- 実際の結果: 直近実行では失敗が再現
- 期待結果: リリース判断文書は最新実行結果と一致
- 根拠ファイル/ログ:
  - `docs/production-readiness-tests.md`（145件ALL PASS前提）
  - `docs/qa/release-readiness.md`（READY表記）
  - runTests結果（seller-flow失敗再現）
- 原因の仮説: 手動更新運用で同期が崩れている
- 修正方針の概要（コードは書かない）: CI結果自動取り込みでreadiness文書を同期

---

## 4. 未確認だが要調査の論点

### 4-1. Edge Functions全体で `verify_jwt = false` 運用

- 何が怪しいか: すべて手動認証実装依存
- なぜ怪しいか: 将来の分岐漏れで認証バイパス化リスク
- 何を追加検証すべきか: 未認証/不正Bearerの網羅テストを全アクション分岐で実施
- 参考: `supabase/config.toml`

### 4-2. Discord role付与先guildのフォールバック選択

- 何が怪しいか: plan紐付けguild欠損時にseller最新guildへフォールバック
- なぜ怪しいか: 誤サーバー付与/剥奪の可能性
- 何を追加検証すべきか: `plan.discord_server_id` 欠損ケースの付与先妥当性
- 参考: `supabase/functions/discord-bot/index.ts`

### 4-3. Webhook冪等性の競合時挙動

- 何が怪しいか: 事前SELECT→INSERTの2段制御
- なぜ怪しいか: 同時到達で片系が失敗遷移する可能性
- 何を追加検証すべきか: 同一event_idの同時投下負荷試験と `processing_status` 一貫性確認
- 参考: `supabase/functions/stripe-webhook/index.ts`

---

## 5. テストの穴

### 未カバー領域

- RLS攻撃視点検証（seller越権UPDATE、Webhook越境閲覧）
- Stripe Webhook同時実行/再送競合
- Discord連携の誤guildフォールバック
- Hosted構成でのPlatform API接続健全性

### 追加すべきテスト観点

- seller JWTで `memberships.status/risk_flag/dispute_status` を更新できないこと
- `stripe_webhook_events` を seller間で相互不可視にできること
- `VITE_API_URL` 未設定時に起動失敗（fail-fast）すること
- E2Eをデータ初期化付きで実行し、状態依存フレークを排除すること
- ルート存在確認中心テストを、実データ整合確認まで拡張すること

---

## 6. 優先順位つき一覧

### P0

1. sellerのmemberships過剰UPDATE権限（越権）
2. Hostedでlocalhost依存となるAPI接続設定
3. テスト資格情報の平文管理

### P1

1. seller向けWebhook閲覧RLSの部分一致判定
2. migrationチェーンの非互換SQL残存
3. リリース判定文書と実テスト結果の同期不全

### P2

1. seller-flow E2Eの状態依存フレーク
2. `verify_jwt = false` 運用の分岐漏れ耐性
3. Discord guildフォールバック誤付与リスク

---

## 補足

- 本調査ではファイル編集・コミット・PR作成は行っていない（本レポート作成のみ）。
- 実施した検証は静的読解と既存テスト実行（runTests/lint）に限定。