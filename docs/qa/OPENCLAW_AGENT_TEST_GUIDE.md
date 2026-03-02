# OpenClaw / Claw-Empire エージェント向け テスト実行ガイド

> **リポジトリ**: https://github.com/i0switch/seller-harmony  
> **プロジェクト**: seller-harmony — ファンクラブ自動運用インフラ SaaS  
> **作成日**: 2026-03-02  
> **対象エージェント**: OpenClaw / Claw-Empire

---

## 1. プロジェクト概要（エージェントへの共通コンテキスト）

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: Vite + React 18 + TypeScript + Tailwind + shadcn/ui  │
│  Hosted: https://preview--member-bridge-flow.lovable.app/       │
├─────────────────────────────────────────────────────────────────┤
│  Backend: Supabase (Auth + DB + Edge Functions)                  │
│  Supabase Project: xaqzuevdmeqxntvhamce                         │
├─────────────────────────────────────────────────────────────────┤
│  Payment: Stripe (Test Mode)                                     │
│  Discord: OAuth + Bot (role sync)                                │
└─────────────────────────────────────────────────────────────────┘
```

### 3つのロール（絶対に混同しない）

| ロール | URL prefix | 説明 |
|--------|-----------|------|
| **Platform Admin** | `/platform/...` | SaaS運営者（全テナント管理） |
| **Seller（Tenant Admin）** | `/seller/...` | ファンクラブ運営者 |
| **Buyer（Member）** | `/checkout/...`, `/mypage/...` | ファンクラブ会員 |

### Edge Functions（Supabase）

| Function名 | 役割 |
|------------|------|
| `stripe-webhook` | Stripe Webhook受信・処理 |
| `stripe-checkout` | Checkout Session 作成 |
| `stripe-onboarding` | Stripe Connect オンボーディング |
| `discord-oauth` | Discord OAuth 認証 |
| `discord-bot` | ロール付与/剥奪 |

---

## 2. テスト環境セットアップ

### 2-1. ローカル開発環境

```bash
# Clone & Install
git clone https://github.com/i0switch/seller-harmony
cd seller-harmony
npm install

# 環境変数の設定（.env.local を作成）
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://xaqzuevdmeqxntvhamce.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase_anon_key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_<your_stripe_test_key>
VITE_USE_MOCK_API=false   # 実機テスト時は false
EOF

# 起動
npm run dev        # http://localhost:5173

# 型チェック
npx tsc --noEmit

# Lint
npm run lint

# Unit Tests (Vitest)
npm test

# E2E Tests (Playwright / ローカル)
npm run e2e

# E2E Tests (Hosted / Lovable本番プレビュー)
npm run e2e:hosted
```

### 2-2. Stripe テスト環境セットアップ ⚡ 重要

```bash
# 1. Stripe CLI インストール
# Windows (Scoop)
scoop install stripe
# Mac
brew install stripe/stripe-cli/stripe
# または https://docs.stripe.com/stripe-cli からバイナリDL

# 2. Stripe アカウントにログイン（テストモードで）
stripe login

# 3. Webhook を Supabase Edge Function に転送（ローカルテスト用）
stripe listen --forward-to https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook

# ⚠️ 上記コマンド実行後に表示される whsec_XXXXXXX をメモする
# この値を Supabase の STRIPE_WEBHOOK_SECRET に設定する
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXXXX

# 4. npm スクリプトで起動
npm run stripe:listen   # PowerShell 用ラッパー
npm run stripe:trigger  # テストイベント発火
```

### 2-3. Stripe テストカード番号（必携）

| カード番号 | 挙動 |
|-----------|------|
| `4242 4242 4242 4242` | 決済成功 |
| `4000 0025 0000 3155` | 3DS認証要求 |
| `4000 0000 0000 9995` | 残高不足（失敗） |
| `4000 0000 0000 0002` | カード拒否 |
| `4000 0082 6000 3178` | 日本カード決済成功 |

> 有効期限: 未来日付ならOK（例: 12/29）, CVC: 任意の3桁

---

## 3. テスト実行フェーズ（推奨順序）

```
Phase 1: Unit / Component Tests    │ 即時実行可
Phase 2: E2E UI Tests (Mock API)   │ localhost 起動不要（Hosted URL使用）
Phase 3: Stripe Checkout 結合テスト│ Stripe CLI + テストキー必要
Phase 4: Webhook / Edge Function   │ Stripe CLI + Supabase デプロイ済み必要
Phase 5: セキュリティ・RLS 監査    │ Supabase SQL Editor 使用
Phase 6: 全体フロー 回帰テスト     │ 全環境
```

---

## 4. Phase 1: Unit Tests（Vitest）

### エージェントへの指示

```
npm run test を実行し、全 Vitest ユニットテストが pass することを確認してください。
失敗があれば原因を特定し修正案を提示してください。
テストファイルは src/test/ 配下にあります。
```

### チェックリスト

- [ ] `npm test` がエラーなし
- [ ] TypeScript コンパイルエラーなし（`npx tsc --noEmit`）
- [ ] ESLint エラー 0 件（`npm run lint`）

---

## 5. Phase 2: E2E UI Tests（Playwright × Hosted）

### 実行コマンド

```bash
# 認証状態キャプチャ（初回のみ）
npm run e2e:hosted:auth

# Hosted E2E 実行
npm run e2e:hosted

# VS Code QA Auto
npm run qa:vscode:auto

# ドライラン（テスト一覧確認のみ）
npm run qa:vscode:auto:dry
```

### テストファイル一覧（tests/e2e/*.spec.ts）

| ファイル | 内容 | 優先度 |
|---------|------|--------|
| `tc01-landing-routing.spec.ts` | ランディング・404 | P1 |
| `tc02-seller-auth.spec.ts` | Seller 認証 | P0 |
| `tc03-seller-onboarding.spec.ts` | Seller オンボーディング | P0 |
| `tc04-seller-dashboard.spec.ts` | ダッシュボード | P1 |
| `tc05-seller-plans.spec.ts` | プラン管理 CRUD | P0 |
| `tc06-seller-members.spec.ts` | 会員管理 | P1 |
| `tc07-09-seller-tools.spec.ts` | Crosscheck / Webhook / Discord設定 | P1 |
| `tc17-buyer-checkout.spec.ts` | Buyer 決済完了 | P0 |
| `tc17-buyer-checkout.spec.ts` | Buyer マイページ | P1 |
| `buyer-flow.spec.ts` | Buyer 統合フロー | P0 |
| `seller-flow.spec.ts` | Seller 統合フロー | P0 |
| `edge-cases.spec.ts` | エッジケース | P1 |

### AIエージェントへの共通プロンプト

```
あなたはQAテストエンジニアです。
テスト環境URL: https://preview--member-bridge-flow.lovable.app/
以下のPlaywrightテストを実行・分析してください:

npm run e2e:hosted

各テストケースの結果を「✅ PASS」「❌ FAIL」「⚠️ WARN」で記録し、
FAIL の場合は期待値 vs 実際の動作・修正案を提示してください。
```

---

## 6. Phase 3: Stripe 決済フロー テスト（実機）

### 6-1. Checkout Session 作成テスト

```
テスト環境: Stripe テストモード
対象 Edge Function: stripe-checkout

手順:
1. Seller がプランを公開状態にする（/seller/plans）
2. Buyer が購入ページ（/form/{planSlug}）にアクセス
3. 「購入する」ボタン → Stripe Checkout にリダイレクト
4. テストカード 4242 4242 4242 4242 で決済
5. /checkout/success?session_id=XXX にリダイレクトされることを確認
6. Supabase の subscriptions テーブルにレコードが作成されることを確認

確認クエリ:
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;
```

### 6-2. Webhook イベント テスト

```bash
# stripe-webhook Edge Function への転送
stripe listen --forward-to https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook

# 各イベントをトリガー
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
stripe trigger customer.subscription.updated
```

### 6-3. Stripe Webhook テストシナリオ

```
以下のシナリオを Stripe CLI で実施し、各 Webhook イベント後の
Supabase DB 状態を確認してください。

シナリオ1: 新規サブスクリプション開始
  trigger: checkout.session.completed
  期待DB: memberships.status = 'active'
          subscriptions に新規レコード追加

シナリオ2: 月次請求成功
  trigger: invoice.payment_succeeded
  期待DB: subscriptions.current_period_end が更新される

シナリオ3: 支払い失敗 → 猶予期間
  trigger: invoice.payment_failed (1回目)
  期待DB: memberships.status = 'grace_period'
          grace_period_end が設定される

シナリオ4: 猶予期間後キャンセル
  trigger: invoice.payment_failed (grace_period後)
  期待DB: memberships.status = 'cancelled'

シナリオ5: サブスク手動キャンセル
  trigger: customer.subscription.deleted
  期待DB: memberships.status = 'cancelled'
          Discord ロール剥奪がスケジュールされる

シナリオ6: 署名検証失敗（Fail-Closed）
  手順: 不正な Webhook-Signature ヘッダで POST
  期待: HTTP 400 / 401 を返す（処理しない）

シナリオ7: 冪等性テスト
  手順: 同じ stripe_event_id で Webhook を2回送信
  期待: 2回目は処理をスキップ（409 or 200 + "already processed"）
```

### 6-4. Stripe Connect オンボーディング テスト

```
Seller が Stripe Connect でオンボーディングを完了するフローをテスト:

1. /seller/onboarding にアクセス（Step 3: Stripe アカウント連携）
2. 「Stripe に接続する」→ Stripe Connect オンボーディングへリダイレクト
3. Stripe テスト環境でオンボーディング完了（テスト用情報入力）
4. /seller/onboarding?step=4 にリダイレクトされることを確認
5. stripe_account_id が Supabase の sellers テーブルに保存されることを確認

確認クエリ:
SELECT id, stripe_account_id, onboarding_completed_at FROM sellers ORDER BY created_at DESC LIMIT 3;
```

---

## 7. Phase 4: Supabase RLS セキュリティ テスト

```
以下のクエリを Supabase SQL エディタで実行し、
テナント間データ分離（Row Level Security）が正しく動作することを確認してください。

テスト1: Seller A は Seller B のデータを読めない
  SET local role anon;
  SET "request.jwt.claims" TO '{"sub": "<seller_a_user_id>", "role": "authenticated"}';
  SELECT * FROM plans WHERE seller_id = '<seller_b_id>';
  期待: 0件返る（RLS で遮断）

テスト2: 未認証ユーザーは plans を読めない
  SET local role anon;
  SELECT * FROM plans;
  期待: 0件 or エラー

テスト3: Buyer は自分の memberships のみ閲覧可
  SET local role authenticated;
  SET "request.jwt.claims" TO '{"sub": "<buyer_user_id>"}';
  SELECT * FROM memberships;
  期待: 自分のレコードのみ

テスト4: Platform Admin は全テナントを閲覧可
  SET local role authenticated;
  SET "request.jwt.claims" TO '{"sub": "<platform_admin_id>", "role": "platform_admin"}';
  SELECT * FROM sellers;
  期待: 全Sellerが見える
```

---

## 8. Phase 5: Discord 連携テスト

```
注意: Discord Bot の本番テストには Discord サーバーと Bot Token が必要です。
テスト環境ではモックを使用し、Edge Function 単体テストを推奨します。

テスト1: Discord OAuth フロー
  URL: /checkout/discord?session_id=XXX
  手順:
    1. Discord OAuth 承認
    2. コールバック URL にリダイレクト
    3. guild_member レコードが Supabase に作成されることを確認

テスト2: ロール付与
  Webhook: membership が active になったとき
  確認: discord_bot Edge Function が呼ばれ、指定 role が付与される

テスト3: ロール剥奪
  Webhook: membership が cancelled になったとき
  確認: discord_bot Edge Function が role を剥奪する

テスト4: Bot 権限エラーハンドリング
  条件: Bot の階層が対象ロールより低い場合
  期待: 適切なエラーメッセージをユーザーに表示
```

---

## 9. Phase 6: 全体フロー 回帰テスト

```
以下の E2E シナリオを一連の流れで実施してください:

【シナリオ A: Seller + Buyer 完全フロー】

Step 1 (Seller):
  - /seller/signup で新規 Seller 登録
  - オンボーディング 4ステップを完了（Stripe Connect テスト接続含む）
  - プランを1つ作成・公開（月額プラン: ¥1,000）

Step 2 (Buyer):
  - Seller の公開ページ /form/{planSlug} にアクセス
  - Stripe テストカード（4242...）で購入
  - /checkout/success で購入完了を確認
  - Discord 連携 CTA を確認

Step 3 (Seller Dashboard):
  - /seller/members で Buyer が会員として表示されることを確認
  - /seller/dashboard で売上が反映されることを確認

Step 4 (Stripe Webhook):
  - invoice.payment_failed を発火して猶予期間に遷移
  - customer.subscription.deleted を発火してキャンセル
  - Seller の会員一覧でステータスが更新されることを確認

Step 5 (Platform Admin):
  - /platform/login で Platform Admin ログイン
  - /platform/tenants で Seller テナントが一覧に表示されることを確認
  - 必要に応じてテナントを停止/再開テスト
```

---

## 10. エージェント設定テンプレート

### OpenClaw / Claw-Empire に渡すシステムプロンプト

```
# Context
You are a QA engineer and full-stack developer working on "seller-harmony", 
a multi-tenant SaaS for fan club automation.

Repository: https://github.com/i0switch/seller-harmony
Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui (frontend)
       Supabase (Auth + PostgreSQL + Edge Functions with Deno)
       Stripe (payments, Connect, webhooks)
       Discord (OAuth + Bot for role management)

# Role Separation Rules (CRITICAL - never mix)
- Platform Admin: /platform/* routes
- Seller (Tenant Admin): /seller/* routes  
- Buyer (Member): /checkout/*, /mypage/* routes

# Test Environment
- Hosted App URL: https://preview--member-bridge-flow.lovable.app/
- Supabase Project: xaqzuevdmeqxntvhamce
- Stripe: TEST MODE only (use test card 4242 4242 4242 4242)
- STRIPE_WEBHOOK_SECRET: Use whsec_ from `stripe listen` output

# Development Rules
1. Preserve role separation and route boundaries
2. Keep TypeScript strict (no `any`)
3. For Stripe webhook: fail closed on signature verification
4. Use incremental, reversible changes
5. Respond in Japanese

# Current Task
[タスクを記述する場所]
```

---

## 11. トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| Webhook が 400 エラー | STRIPE_WEBHOOK_SECRET が不一致 | `stripe listen` の whsec_ を再設定 |
| E2E テストが認証エラー | storage state が期限切れ | `npm run e2e:hosted:auth` を再実行 |
| Supabase RLS で自分のデータも見えない | JWT claims の role が不正 | Supabase Auth の user role を確認 |
| Discord ロール付与失敗 | Bot の権限/階層問題 | Bot を対象ロールより上位に配置 |
| Stripe Connect リダイレクト失敗 | return_url の設定ミス | stripe-onboarding Edge Function の return_url を確認 |

---

## 12. テスト優先度マトリクス

```
P0 Critical（必ず pass させる）:
  ✓ Stripe サブスクリプション購入フロー
  ✓ Webhook 署名検証（Fail-Closed）
  ✓ RLS テナント間データ分離
  ✓ Seller 認証・オンボーディング
  ✓ Buyer Checkout フロー

P1 High（バグがあれば修正）:
  ✓ Webhook 冪等性（重複処理防止）
  ✓ 猶予期間ロジック
  ✓ Discord ロール付与/剥奪
  ✓ Platform Admin テナント管理

P2 Medium（改善推奨）:
  ✓ レスポンシブ UI
  ✓ エラーハンドリング表示
  ✓ アクセシビリティ
```

---

## 参考リンク

- [テストプロンプト集インデックス](./test-prompts/00_INDEX.md)
- [テスト26: Stripe Webhook 結合テスト](./test-prompts/26_STRIPE_WEBHOOK_FAIL_CLOSED_AND_IDEMPOTENCY.md)
- [テスト25: Supabase RLS 監査](./test-prompts/25_SUPABASE_RLS_EDGE_AUDIT.md)
- [テスト27: Discord 連携テスト](./test-prompts/27_DISCORD_INTEGRATION_TEST.md)
- [AGENTS.md](../../chatgpt/AGENTS.md)
- [GEMINI.md](../../GEMINI.md)
