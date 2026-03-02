# seller-harmony 本番リリース向け追加テスト項目一覧

**作成日**: 2025-07-16  
**対象リポジトリ**: https://github.com/i0switch/seller-harmony  
**ステータス**: 🔴 未実施 → テスト・修正完了後に更新  
**前提**: 既存 E2E テスト 145件 ALL PASS（17 spec ファイル）

---

## 目次

1. [概要](#概要)
2. [発見済みバグ一覧（BUG-07〜BUG-13）](#発見済みバグ一覧)
3. [カテゴリ1: Edge Function 統合テスト（EF-01〜EF-23）](#カテゴリ1-edge-function-統合テスト)
4. [カテゴリ2: RLS セキュリティテスト（RLS-01〜RLS-10）](#カテゴリ2-rls-セキュリティテスト)
5. [カテゴリ3: DB スキーマ整合性テスト（DB-01〜DB-05）](#カテゴリ3-db-スキーマ整合性テスト)
6. [カテゴリ4: セキュリティテスト（SEC-01〜SEC-09）](#カテゴリ4-セキュリティテスト)
7. [カテゴリ5: 認証済みユーザー UI テスト（UI-01〜UI-16）](#カテゴリ5-認証済みユーザー-ui-テスト)
8. [カテゴリ6: End-to-End 統合テスト（E2E-01〜E2E-06）](#カテゴリ6-end-to-end-統合テスト)
9. [カテゴリ7: 非機能テスト（NF-01〜NF-08）](#カテゴリ7-非機能テスト)
10. [優先度サマリ](#優先度サマリ)
11. [テスト実行方法](#テスト実行方法)

---

## 概要

### 背景

seller-harmony の既存 E2E テスト（145件）はすべて PASS しているが、本番運用に必要な以下の観点が未カバー：

- Edge Function への実リクエスト統合テスト（現テストはすべて API モック）
- Row Level Security（RLS）ポリシーの検証
- DB スキーマ制約の整合性
- CORS / 認証 / 入力バリデーション等のセキュリティ
- 認証済みユーザーによる実操作 UI テスト
- 決済→Webhook→メンバーシップ→Discord ロール付与の完全 E2E フロー
- 非機能要件（cron ジョブ、リトライ、パフォーマンス）

### テスト項目数

| カテゴリ | 件数 | 優先度 |
|---------|------|--------|
| Edge Function 統合テスト | 23 | 🔴 最優先 |
| RLS セキュリティテスト | 10 | 🔴 最優先 |
| DB スキーマ整合性テスト | 5 | 🟠 高 |
| セキュリティテスト | 9 | 🔴 最優先 |
| 認証済みユーザー UI テスト | 16 | 🟠 高 |
| End-to-End 統合テスト | 6 | 🟠 高 |
| 非機能テスト | 8 | 🟡 中 |
| **合計** | **77** | — |

### 発見済みバグ

| バグ ID | 件数 |
|---------|------|
| BUG-07〜BUG-13 | 7 件 |

---

## 発見済みバグ一覧

> これらは本番リリース **前** に必ず修正が必要なバグです。

| バグ ID | 重要度 | 場所 | 概要 | 詳細 |
|---------|--------|------|------|------|
| **BUG-07** | 🔴 Critical | `stripe-checkout/index.ts` | 削除済み/無効プランで決済可能 | `deleted_at IS NOT NULL` または `is_active = false` のプランに対して Checkout Session が作成できてしまう。`plans` テーブルから取得する際に `deleted_at IS NULL AND is_active = true` の条件が欠落。 |
| **BUG-08** | 🔴 Critical | `stripe-onboarding/index.ts` | バイヤーが Stripe アカウントを作成可能 | セラーロールチェックが実装されていない。`role_assignments` や `users.role` を参照せず、認証済みであれば誰でも Stripe Express アカウントのオンボーディングリンクを生成できる。 |
| **BUG-09** | 🟠 High | `discord-oauth/index.ts` | 空文字 `discord_user_id` による UNIQUE 制約違反 | Discord API から `discord_user_id` が空文字で返った場合、`discord_identities` テーブルへの UPSERT で 2人目以降のユーザーが `UNIQUE` 制約に抵触してエラーになる。空文字チェックが未実装。 |
| **BUG-10** | 🟠 High | `stripe-webhook/index.ts` | `memberships.current_period_end` 未設定 | `checkout.session.completed` イベント処理時に `current_period_end` カラムに値を設定していないが、DB スキーマでは `NOT NULL` 制約の可能性がある。サブスクリプション作成時に Stripe API から取得して設定する必要がある。 |
| **BUG-11** | 🟠 High | `system_announcements` テーブル | バイヤー/セラー向け SELECT ポリシー欠落 | `system_announcements` テーブルに `is_published = true` のレコードを一般ユーザー（buyer/seller）が読み取るための RLS SELECT ポリシーが存在しない。管理者のみアクセス可能になっている。 |
| **BUG-12** | 🟡 Medium | Webhook / cron | `grace_period` → `expired` 遷移 cron 未実装 | `grace_period_ends_at` を過ぎたメンバーシップを自動的に `expired` に遷移させる cron ジョブまたは DB トリガーが未実装。手動でのみステータス変更可能。 |
| **BUG-13** | 🟠 High | 全 Edge Functions | CORS `*` フォールバック | 5つすべての Edge Function で `ALLOWED_ORIGIN` 環境変数が未設定の場合に `Access-Control-Allow-Origin: *` にフォールバックする実装になっている。本番環境でワイルドカード CORS は重大なセキュリティリスク。 |

### バグ修正の優先順位

```
1. BUG-07 (stripe-checkout: 削除済みプラン) ← 金銭的損害に直結
2. BUG-08 (stripe-onboarding: ロールチェック) ← 権限昇格
3. BUG-13 (CORS ワイルドカード) ← セキュリティ基本
4. BUG-10 (current_period_end 未設定) ← データ整合性
5. BUG-09 (discord_user_id 空文字) ← エラー回避
6. BUG-11 (system_announcements RLS) ← 機能不全
7. BUG-12 (grace_period cron) ← 運用時に発覚
```

---

## カテゴリ1: Edge Function 統合テスト

> **目的**: Supabase Edge Functions への実 HTTP リクエストで正常系・異常系の動作を検証  
> **実行方法**: curl / Supabase MCP / Playwright（認証トークン付き）  
> **前提**: Supabase プロジェクト `xaqzuevdmeqxntvhamce` にデプロイ済み

### 1.1 stripe-webhook（EF-01〜EF-11）

| テスト ID | テスト名 | 優先度 | 概要 | 入力 | 期待結果 | 前提条件 |
|-----------|---------|--------|------|------|---------|---------|
| **EF-01** | checkout.session.completed 正常処理 | 🔴 | 正常な Checkout 完了イベントを送信し、メンバーシップが作成される | Stripe CLI: `stripe trigger checkout.session.completed` | `memberships` に `status='active'` のレコード作成、`stripe_webhook_events` に `processing_status='processed'` | テスト用プランが存在すること |
| **EF-02** | customer.subscription.updated 正常処理 | 🔴 | サブスクリプション更新イベント送信 | Stripe CLI トリガー | `memberships.status` が Stripe 側のステータスに同期 | アクティブなメンバーシップが存在すること |
| **EF-03** | customer.subscription.deleted 正常処理 | 🔴 | サブスクリプション削除イベント | Stripe CLI トリガー | `memberships.status = 'canceled'`、`entitlement_ends_at` 設定 | アクティブなメンバーシップが存在すること |
| **EF-04** | invoice.payment_failed 処理 | 🔴 | 決済失敗イベント | Stripe CLI トリガー | `memberships.status = 'past_due'`、`grace_period_ends_at` 設定（+3日） | アクティブなメンバーシップが存在すること |
| **EF-05** | invoice.payment_succeeded 処理 | 🟠 | 決済成功（更新請求） | Stripe CLI トリガー | `memberships.status = 'active'`、`current_period_end` 更新 | `past_due` メンバーシップが存在すること |
| **EF-06** | charge.dispute.created 処理 | 🟠 | チャージバック発生イベント | Stripe CLI トリガー | `memberships.dispute_status = 'open'`、`risk_flag` 設定 | アクティブなメンバーシップが存在すること |
| **EF-07** | charge.refunded 処理 | 🟠 | 返金イベント | Stripe CLI トリガー | `memberships.status = 'refunded'`、`entitlement_ends_at = now()` | アクティブなメンバーシップが存在すること |
| **EF-08** | Webhook 署名検証失敗 | 🔴 | 不正な署名ヘッダーでリクエスト | curl: `Stripe-Signature: invalid` | HTTP 400、`stripe_webhook_events` に記録なし | — |
| **EF-09** | 冪等性テスト（重複イベント） | 🟠 | 同一 `stripe_event_id` を2回送信 | 同一イベントを2回トリガー | 2回目は `processing_status='skipped'`、DB 変更なし | EF-01 実行済み |
| **EF-10** | manual_override 有効時のスキップ | 🟡 | `manual_override = true` のメンバーシップに対するイベント | 事前に `manual_override=true` 設定後、Webhook トリガー | Webhook 処理がスキップされ、ステータス変更なし | メンバーシップに `manual_override=true` |
| **EF-11** | 削除済みプランのイベント処理 | 🟠 | `deleted_at IS NOT NULL` のプランに対する Webhook | プラン削除後に Webhook トリガー | エラーにならず、適切にログ出力。メンバーシップはそのまま | プランが論理削除済み |

### 1.2 stripe-checkout（EF-12〜EF-15）

| テスト ID | テスト名 | 優先度 | 概要 | 入力 | 期待結果 | 前提条件 |
|-----------|---------|--------|------|------|---------|---------|
| **EF-12** | Checkout Session 正常作成 | 🔴 | 有効なプランIDで Checkout Session 作成 | POST `/stripe-checkout` + JWT + `plan_id` | HTTP 200、`url` フィールドに Stripe Checkout URL | セラーの Stripe アカウントが `charges_enabled=true` |
| **EF-13** | 削除済みプラン拒否（BUG-07 修正確認） | 🔴 | `deleted_at IS NOT NULL` のプランで Checkout 試行 | POST `/stripe-checkout` + 削除済み `plan_id` | HTTP 400/404、Session 作成されない | BUG-07 修正済み |
| **EF-14** | 未認証リクエスト拒否 | 🔴 | JWT なしで Checkout 試行 | POST `/stripe-checkout` ヘッダーなし | HTTP 401 Unauthorized | — |
| **EF-15** | Stripe アカウント未設定エラー | 🟠 | セラーの Stripe アカウントが存在しない場合 | POST `/stripe-checkout` + 未設定セラーの `plan_id` | HTTP 400、エラーメッセージ「Stripe アカウントが設定されていません」 | セラーが Stripe 未接続 |

### 1.3 stripe-onboarding（EF-16〜EF-17）

| テスト ID | テスト名 | 優先度 | 概要 | 入力 | 期待結果 | 前提条件 |
|-----------|---------|--------|------|------|---------|---------|
| **EF-16** | オンボーディングリンク正常生成 | 🟠 | セラーが Stripe Connect Express オンボーディング開始 | POST `/stripe-onboarding` + セラー JWT | HTTP 200、`url` に AccountLink URL | セラーロールのユーザー |
| **EF-17** | バイヤーロール拒否（BUG-08 修正確認） | 🔴 | バイヤーがオンボーディング試行 | POST `/stripe-onboarding` + バイヤー JWT | HTTP 403 Forbidden | BUG-08 修正済み |

### 1.4 discord-oauth（EF-18〜EF-21）

| テスト ID | テスト名 | 優先度 | 概要 | 入力 | 期待結果 | 前提条件 |
|-----------|---------|--------|------|------|---------|---------|
| **EF-18** | OAuth 認可 URL 生成 | 🟠 | Discord OAuth 認可リダイレクト URL の生成 | GET `/discord-oauth?action=authorize` | HTTP 302、Discord OAuth URL へリダイレクト | `DISCORD_CLIENT_ID` 設定済み |
| **EF-19** | OAuth コード交換フロー | 🟠 | Discord から返された認可コードでトークン交換 | GET `/discord-oauth?code=xxx&state=yyy` | `discord_identities` にレコード作成、リダイレクト | Discord テストアカウントで事前認可 |
| **EF-20** | state パラメータ CSRF 検証 | 🔴 | 不正な state で OAuth コールバック | GET `/discord-oauth?code=xxx&state=invalid` | HTTP 400/403、トークン交換されない | — |
| **EF-21** | リダイレクト URI ホワイトリスト検証 | 🟠 | 許可外のリダイレクト URI でのコールバック | 不正な `redirect_uri` でリクエスト | エラー返却、ログ記録 | — |

### 1.5 discord-bot（EF-22〜EF-23）

| テスト ID | テスト名 | 優先度 | 概要 | 入力 | 期待結果 | 前提条件 |
|-----------|---------|--------|------|------|---------|---------|
| **EF-22** | Bot 権限検証（validate_bot_permission） | 🟠 | Bot がサーバーで適切な権限を持っているか検証 | POST `/discord-bot` + `action=validate_bot_permission` + `guild_id` | HTTP 200、`has_permission: true/false` | Bot がテストサーバーに参加済み |
| **EF-23** | 非セラーロール拒否 | 🔴 | バイヤーが Bot 操作を試行 | POST `/discord-bot` + バイヤー JWT | HTTP 403 Forbidden | — |

---

## カテゴリ2: RLS セキュリティテスト

> **目的**: Row Level Security ポリシーが正しく機能し、テナント分離・ロール分離が保たれていることを検証  
> **実行方法**: Supabase SQL Editor / `mcp_com_supabase__execute_sql`  
> **検証方法**: 異なるロールのユーザーJWTで `set_config('request.jwt.claims', ...)` してクエリ実行

| テスト ID | テスト名 | 優先度 | 概要 | 検証内容 | 期待結果 |
|-----------|---------|--------|------|---------|---------|
| **RLS-01** | セラー A がセラー B のプランを読めない | 🔴 | テナント分離（plans テーブル） | セラー A の JWT でセラー B の `plans` を SELECT | 0 行返却 |
| **RLS-02** | セラー A がセラー B のメンバーを読めない | 🔴 | テナント分離（memberships テーブル） | セラー A の JWT でセラー B の `memberships` を SELECT via plan join | 0 行返却 |
| **RLS-03** | バイヤーがプランを INSERT できない | 🔴 | ロール制限（plans テーブル） | バイヤー JWT で `plans` に INSERT | エラー（policy violation） |
| **RLS-04** | バイヤーが他人のメンバーシップを読めない | 🔴 | テナント分離（memberships テーブル） | バイヤー A の JWT でバイヤー B の `memberships` を SELECT | 0 行返却（自分の分のみ） |
| **RLS-05** | セラーが他セラーの `stripe_connected_accounts` を読めない | 🔴 | テナント分離 | セラー A の JWT でセラー B の接続アカウントを SELECT | 0 行返却 |
| **RLS-06** | `discord_identities` の token/refresh_token が保護されている | 🔴 | 機密データ保護 | バイヤー A の JWT でバイヤー B の `discord_identities` を SELECT | 0 行返却 or `access_token`/`refresh_token` 列が非表示 |
| **RLS-07** | `system_announcements` のバイヤー/セラー SELECT（BUG-11 修正確認） | 🟠 | 公開アナウンスの閲覧 | バイヤー JWT で `is_published = true` のレコードを SELECT | `is_published = true` のレコードのみ返却 |
| **RLS-08** | `stripe_webhook_events` はセラーが直接読めない | 🟠 | 内部データ保護 | セラー JWT で `stripe_webhook_events` を SELECT | 0 行返却（service_role のみアクセス可） |
| **RLS-09** | `audit_logs` はセラーが自分のログのみ読める | 🟡 | 監査ログの保護 | セラー A の JWT で全 `audit_logs` を SELECT | 自分関連のログのみ返却 |
| **RLS-10** | `role_assignments` の直接操作不可 | 🟠 | ロール管理保護 | セラー JWT で `role_assignments` に INSERT | エラー（service_role のみ操作可） |

---

## カテゴリ3: DB スキーマ整合性テスト

> **目的**: テーブル定義、制約、enum 値が期待通りであることを検証  
> **実行方法**: SQL クエリ / Supabase MCP

| テスト ID | テスト名 | 優先度 | 概要 | 検証 SQL | 期待結果 |
|-----------|---------|--------|------|---------|---------|
| **DB-01** | `memberships.current_period_end` 制約確認（BUG-10 関連） | 🟠 | NOT NULL 制約の有無を確認 | `SELECT is_nullable FROM information_schema.columns WHERE table_name='memberships' AND column_name='current_period_end'` | NULL 許可、または NOT NULL の場合は stripe-webhook で必ず値設定 |
| **DB-02** | `discord_identities.discord_user_id` UNIQUE + 空文字チェック（BUG-09 関連） | 🟠 | 空文字列が UNIQUE 制約に違反する問題 | 空文字で2レコード INSERT テスト | CHECK 制約で空文字を拒否、または空文字を NULL に変換 |
| **DB-03** | `role_assignments` テーブルの使用状況 | 🟡 | テーブルが実際に使用されているか | `SELECT count(*) FROM role_assignments` + Edge Function コード内検索 | 使用されていない場合は DROP または使用開始 |
| **DB-04** | `audit_logs` カラム名の整合性 | 🟡 | Edge Function の INSERT 文と実テーブルのカラム名一致 | `SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs'` | Edge Function で指定するカラム名がすべて存在 |
| **DB-05** | `subscription_status` enum 値の網羅性 | 🟠 | enum に必要な値がすべて含まれているか | `SELECT enum_range(NULL::subscription_status)` | `active, past_due, canceled, unpaid, incomplete, pending_discord, grace_period, cancel_scheduled, expired, refunded` |

---

## カテゴリ4: セキュリティテスト

> **目的**: OWASP Top 10 準拠のセキュリティ検証  
> **実行方法**: curl / Playwright / コードレビュー

| テスト ID | テスト名 | 優先度 | 概要 | 検証方法 | 期待結果 |
|-----------|---------|--------|------|---------|---------|
| **SEC-01** | CORS ワイルドカード排除（BUG-13 修正確認） | 🔴 | 全 Edge Functions で `*` CORS を排除 | 各 Edge Function のソースコードレビュー + `Origin: https://evil.com` でリクエスト | `Access-Control-Allow-Origin` がホワイトリスト外のオリジンを拒否 |
| **SEC-02** | Discord OAuth `redirect_uri` から localhost 排除 | 🔴 | 本番で localhost リダイレクトを許可しない | `discord-oauth` ソースコードの `redirect_uri` 設定確認 | 環境変数で制御、本番では localhost 不可 |
| **SEC-03** | XSS 全パス検証 | 🟠 | 全入力フィールドで XSS スクリプトが無害化される | `<script>alert(1)</script>` を各フォームフィールドに入力 | スクリプト実行されない、エスケープされて表示 |
| **SEC-04** | Rate Limiting（Edge Functions） | 🟠 | 大量リクエストに対する保護 | 同一 IP から 100 req/sec で Edge Function に送信 | 429 Too Many Requests 返却 or Supabase 側で保護 |
| **SEC-05** | `stripe-onboarding` セラーロールチェック（BUG-08 修正確認） | 🔴 | バイヤーが Stripe アカウント作成を試行 | バイヤー JWT で `/stripe-onboarding` にリクエスト | HTTP 403 返却 |
| **SEC-06** | JWT 有効期限切れトークンの拒否 | 🟠 | 期限切れ JWT で API アクセス | `exp` が過去の JWT で Edge Function にリクエスト | HTTP 401 Unauthorized |
| **SEC-07** | Supabase anon key の適切な使用 | 🟡 | anon key がクライアントサイドで安全に使用されている | ソースコード内の `supabaseKey` 使用箇所をレビュー | RLS に依存、直接 DB 操作に anon key を使用していない |
| **SEC-08** | localStorage `onboarding_state` 改ざん耐性 | 🟠 | localStorage の値を改ざんしてオンボーディングステップをスキップ | DevTools で `localStorage.setItem('onboarding_state', ...)` を実行 | サーバーサイドで再検証、不正なステップ遷移が拒否される |
| **SEC-09** | SQL Injection 耐性（Edge Functions） | 🔴 | Edge Functions のクエリでパラメータ化されていることを確認 | ソースコードレビュー: `supabase.from().select()` vs 生 SQL | すべてのクエリがパラメータ化 or Supabase Client 経由 |

---

## カテゴリ5: 認証済みユーザー UI テスト

> **目的**: 実際のログイン状態での CRUD 操作・画面遷移を検証  
> **実行方法**: Playwright（セッション注入 or 実ログイン）  
> **注意**: 既存 E2E テストは API モックベースのため、ここでは可能な範囲で実 API を使用

### 5.1 セラー操作（UI-01〜UI-08）

| テスト ID | テスト名 | 優先度 | 概要 | 操作 | 期待結果 |
|-----------|---------|--------|------|------|---------|
| **UI-01** | プラン作成（正常系） | 🟠 | セラーが新規プランを作成 | `/seller/plans/new` でフォーム入力 → 保存 | `plans` テーブルにレコード追加、プラン一覧に表示 |
| **UI-02** | プラン編集 | 🟠 | 既存プランの名前・価格を変更 | `/seller/plans/:id` で編集 → 保存 | DB 更新、一覧に反映 |
| **UI-03** | プラン削除（論理削除） | 🟠 | プランを削除 | 削除ボタン → 確認ダイアログ → 実行 | `deleted_at` に日時設定、一覧から非表示 |
| **UI-04** | メンバー一覧表示 | 🟡 | セラーのメンバー一覧 | `/seller/members` アクセス | 自セラーのプランに紐づくメンバーのみ表示 |
| **UI-05** | メンバー詳細表示 | 🟡 | メンバーの詳細情報 | `/seller/members/:id` アクセス | ステータス、Discord 連携状況、決済履歴表示 |
| **UI-06** | クロスチェック画面 | 🟡 | Discord ロールと DB の整合性確認 | `/seller/crosscheck` アクセス | 不整合がある場合にリスト表示 |
| **UI-07** | ダッシュボード KPI 表示 | 🟡 | セラーダッシュボードの KPI 値 | `/seller/dashboard` アクセス | プラン数、メンバー数、MRR 等が正しい値で表示 |
| **UI-08** | Discord 設定画面 | 🟡 | Discord Bot 接続設定 | `/seller/settings/discord` アクセス | Guild ID 入力、Bot 権限検証ボタン |

### 5.2 プラットフォーム管理者操作（UI-09〜UI-14）

| テスト ID | テスト名 | 優先度 | 概要 | 操作 | 期待結果 |
|-----------|---------|--------|------|------|---------|
| **UI-09** | テナント一覧・詳細 | 🟠 | 全セラー一覧と詳細表示 | `/platform/tenants` → テナント選択 | セラー情報、プラン数、メンバー数表示 |
| **UI-10** | Webhook イベント一覧 | 🟠 | Webhook イベントの監視画面 | `/platform/webhooks` アクセス | `stripe_webhook_events` のデータ表示 |
| **UI-11** | リトライキュー管理 | 🟠 | 失敗 Webhook のリトライ管理 | `/platform/retry-queue` アクセス | 失敗イベントのリスト、リトライボタン |
| **UI-12** | お知らせ管理 | 🟡 | システムアナウンスの CRUD | `/platform/announcements` で作成・編集・削除 | `system_announcements` に反映 |
| **UI-13** | システム制御 | 🟡 | メンテナンスモード等の制御 | `/platform/system-control` アクセス | 各種トグルスイッチが機能 |
| **UI-14** | プラットフォームダッシュボード | 🟠 | プラットフォーム全体の KPI | `/platform/dashboard` アクセス | 総セラー数、総メンバー数、プラットフォーム手数料収入等 |

### 5.3 バイヤー操作（UI-15〜UI-16）

| テスト ID | テスト名 | 優先度 | 概要 | 操作 | 期待結果 |
|-----------|---------|--------|------|------|---------|
| **UI-15** | マイページ表示 | 🟠 | バイヤーのメンバーシップ一覧 | `/member/me` アクセス | 加入プラン、ステータス、Discord 連携状況表示 |
| **UI-16** | Discord 連携確認画面 | 🟠 | Discord OAuth 完了後の確認画面 | `/buyer/discord/confirm` → `/buyer/discord/result` | 連携成功/失敗の表示 |

---

## カテゴリ6: End-to-End 統合テスト

> **目的**: 実際の決済フロー全体を通じた統合検証（最重要）  
> **実行方法**: Playwright + Stripe テストカード + Stripe CLI Webhook  
> **テストカード**: `4242424242424242`（成功） / `4000000000000341`（失敗）

| テスト ID | テスト名 | 優先度 | 概要 | フロー | 期待結果 |
|-----------|---------|--------|------|--------|---------|
| **E2E-01** | フル購入フロー（サブスクリプション） | 🔴 | セラー設定 → バイヤー購入 → Webhook → メンバーシップ有効 | 1. セラーがプラン作成 → 2. バイヤーが Checkout → 3. `4242` で決済 → 4. Webhook 受信 → 5. メンバーシップ `active` | `memberships.status = 'active'`、`stripe_subscription_id` 設定済み |
| **E2E-02** | フル購入フロー + Discord ロール付与 | 🔴 | E2E-01 + Discord OAuth + ロール付与 | E2E-01 完了後 → 6. バイヤーが Discord OAuth → 7. Bot がロール付与 | `discord_identities` にレコード、Discord サーバーでロール付与済み |
| **E2E-03** | サブスクリプションキャンセルフロー | 🟠 | アクティブメンバーシップをキャンセル | 1. Stripe ダッシュボードでキャンセル → 2. `customer.subscription.deleted` Webhook → 3. メンバーシップ `canceled` → 4. Discord ロール剥奪 | `memberships.status = 'canceled'`、Discord ロール削除 |
| **E2E-04** | 決済失敗→リカバリフロー | 🟠 | 決済失敗後の再決済成功 | 1. `4000000000000341` で決済失敗 → 2. `invoice.payment_failed` → 3. `grace_period` 設定 → 4. カード更新 → 5. `invoice.payment_succeeded` → 6. `active` に復帰 | ステータス遷移: `active → past_due → grace_period → active` |
| **E2E-05** | 返金フロー | 🟠 | Stripe ダッシュボードから返金 | 1. Stripe で全額返金 → 2. `charge.refunded` Webhook → 3. メンバーシップ `refunded` → 4. Discord ロール剥奪 | `memberships.status = 'refunded'`、Discord ロール削除 |
| **E2E-06** | チャージバック（Dispute）フロー | 🟡 | バイヤーがチャージバック申請 | 1. Stripe テストモードで Dispute 作成 → 2. `charge.dispute.created` Webhook → 3. `dispute_status = 'open'` | `memberships.dispute_status = 'open'`、`risk_flag` 設定 |

---

## カテゴリ7: 非機能テスト

> **目的**: パフォーマンス、可用性、運用面の検証  
> **実行方法**: SQL / コードレビュー / 負荷テスト

| テスト ID | テスト名 | 優先度 | 概要 | 検証方法 | 期待結果 |
|-----------|---------|--------|------|---------|---------|
| **NF-01** | `grace_period` 期限切れ自動遷移（BUG-12 関連） | 🟠 | `grace_period_ends_at` 超過時の自動 `expired` 遷移 | DB cron / pg_cron / supabase scheduled function 確認 | 期限切れメンバーシップが自動的に `expired` に遷移 |
| **NF-02** | Webhook 失敗リトライメカニズム | 🟠 | Edge Function エラー時のリトライ | `stripe_webhook_events` の `processing_status='failed'` レコード確認 + リトライロジック | 失敗イベントが自動または手動でリトライ可能 |
| **NF-03** | FastAPI バックエンド認証ミドルウェア | 🟡 | FastAPI エンドポイントの認証保護 | `backend/app/main.py` のミドルウェア確認 | 全エンドポイントで認証が適切に実装（現在は全モック） |
| **NF-04** | 環境変数の完全性チェック | 🟠 | 本番で必要な全環境変数が設定されている | チェックリスト作成・確認 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `ALLOWED_ORIGIN` 等 |
| **NF-05** | Edge Function タイムアウト耐性 | 🟡 | 150秒制限内での処理完了 | 複雑な Webhook イベント処理の実行時間計測 | 全処理が 150 秒以内に完了 |
| **NF-06** | DB インデックスの最適性 | 🟡 | 頻出クエリに対するインデックス確認 | `EXPLAIN ANALYZE` で主要クエリの実行計画確認 | Seq Scan が不要な箇所で Index Scan が使用されている |
| **NF-07** | Stripe API バージョン互換性 | 🟡 | 使用している Stripe API バージョンの確認 | Edge Function の `stripe` インポートバージョン確認 | 最新安定版または明示的にバージョン固定 |
| **NF-08** | エラーログ・監視の設定 | 🟡 | 本番でのエラー検知可能性 | Supabase ログバゲーション、Edge Function ログ確認 | エラー時にログが出力され、監視可能 |

---

## 優先度サマリ

### 🔴 最優先（本番ブロッカー）— 27 件

| 区分 | テスト ID |
|------|----------|
| バグ修正 | BUG-07, BUG-08, BUG-13 |
| Edge Function | EF-01, EF-02, EF-03, EF-04, EF-08, EF-12, EF-13, EF-14, EF-17, EF-20, EF-23 |
| RLS | RLS-01, RLS-02, RLS-03, RLS-04, RLS-05, RLS-06 |
| セキュリティ | SEC-01, SEC-02, SEC-05, SEC-09 |
| E2E | E2E-01, E2E-02 |

### 🟠 高優先 — 32 件

| 区分 | テスト ID |
|------|----------|
| バグ修正 | BUG-09, BUG-10, BUG-11 |
| Edge Function | EF-05, EF-06, EF-07, EF-09, EF-11, EF-15, EF-16, EF-18, EF-19, EF-21, EF-22 |
| RLS | RLS-07, RLS-08, RLS-10 |
| DB | DB-01, DB-02, DB-05 |
| セキュリティ | SEC-03, SEC-04, SEC-06, SEC-08 |
| UI | UI-01, UI-02, UI-03, UI-09, UI-10, UI-11, UI-14, UI-15, UI-16 |
| E2E | E2E-03, E2E-04, E2E-05 |
| 非機能 | NF-01, NF-02, NF-04 |

### 🟡 中優先 — 18 件

| 区分 | テスト ID |
|------|----------|
| バグ修正 | BUG-12 |
| Edge Function | EF-10 |
| RLS | RLS-09 |
| DB | DB-03, DB-04 |
| セキュリティ | SEC-07 |
| UI | UI-04, UI-05, UI-06, UI-07, UI-08, UI-12, UI-13 |
| E2E | E2E-06 |
| 非機能 | NF-03, NF-05, NF-06, NF-07, NF-08 |

---

## テスト実行方法

### 既存 E2E テスト

```bash
# 全テスト実行
npx playwright test --config=playwright.hosted.config.ts

# 特定ファイル
npx playwright test tests/e2e/tc01-landing-routing.spec.ts

# UI モード
npx playwright test --ui
```

### Edge Function テスト（curl）

```bash
# Supabase Edge Function URL
BASE_URL="https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1"

# 認証トークン取得
TOKEN=$(curl -s -X POST "$BASE_URL/../auth/v1/token?grant_type=password" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"xxx"}' | jq -r '.access_token')

# stripe-checkout テスト
curl -X POST "$BASE_URL/stripe-checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "<plan-uuid>"}'
```

### RLS テスト（SQL）

```sql
-- テスト用: セラー A のコンテキストでクエリ
SET request.jwt.claims = '{"sub":"<seller-a-uuid>","role":"authenticated"}';
SELECT * FROM plans WHERE seller_id = '<seller-b-uuid>';
-- 期待: 0 行
```

### Stripe CLI Webhook テスト

```bash
# Stripe CLI でローカルに Webhook フォワード
stripe listen --forward-to https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook

# 特定イベントトリガー
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2025-07-16 | 初版作成（82テスト項目 + 7バグ） | GitHub Copilot |
