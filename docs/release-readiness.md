# Release Readiness Report

## 現在の品質状況 (Quality Status)

| Check | Status | CLI Output / Notes |
|-------|--------|---------------------|
| Build | ✅ Pass | `npm run build` completed successfully without fatal errors. |
| Test (Frontend) | ✅ Pass | `npm run test` (Vitest) passed 47 tests across 14 test suites covering UI states, route guards, and functional logic. |
| Lint  | ✅ Pass | `npm run lint` completed successfully after fixing `any` typescript errors. (Only warnings remain as permitted by Vite default React rules). |
| Test (Backend) | ✅ Pass | `pytest` passed successfully, covering health checks, pagination logic, and validation error responses. |
| Type Check | ✅ Pass | No critical TypeScript errors; strict validations satisfied. |

## 主要フローの確認結果 (Core Flows Validation)

1. **Seller Onboarding & Auth**: 
   - Route guards are actively verified. Unauthenticated users are redirected to login. Authenticated but non-onboarded users are held at the onboarding sequence (`profile` -> `stripe` -> `discord`).
   - `OnboardingDiscord` UI tests confirm error/success state handling is fully functional.

2. **Seller Plans & Dashboard**:
   - `SellerPlans`, `SellerPlanDetail`, and `SellerDashboard` are covered by tests.
   - Destroy/Change actions correctly require destructive confirmation (`ConfirmDialog`).

3. **Seller Crosscheck & Members**:
   - Functional filters/labels logic and divergent timeline views are implemented and covered.

4. **Buyer Checkout**: 
   - Validated access components leading post-checkout towards the `MemberMe` screen.

5. **Platform Admin**:
   - Tenants list, webhooks logic, retry queues, and system announcements rendering function normally. 

## 既知の制限（未実装/モックの範囲） (Known Limitations & Mocks)

- **モックAPI依存**: 現段階では、実際のバックエンド機能ではなく主にモックデータやモジュールを使ってテストを回しています (`mockApi.ts` などのモッククライアント)。
- **認証の永続性**: 実際の Supabase Auth セッションは未稼働であり、テスト環境やローカル環境としてのフックベースのモック認証を使用しているに留まります。
- **Stripe / Discord 連携**: `stripe-checkout` エッジファンクションや `discord-bot` へのリクエストは検証・テストが通っていますが、実際にStripe API/Discord APIに対してリクエストを投げるには環境変数の本番設定と本稼働連携が必要です。
- **Webhook署名検証**: 現状、 fail-closed 原則に則って無効化していません。実際のWebhookが来ないとローカルテストでの通過は難しい場合があります。

## 次フェーズ（実API接続: Supabase/Stripe/Discord）への手順 (Next Steps for Integration)

現在のUI層とモック基盤間の整合性は完璧であり、テストカバレッジによる回帰防止網も張られています。続いて以下に着手してください:

1. **Supabase Database & Edge Functions デプロイ**:
   - スキーマ (`schema.sql` または migration) を本番環境（またはStaging）のデータベースに適用してください。
   - `stripe-onboarding`, `stripe-checkout`, `discord-bot` などの Edge Functions をデプロイしてください。

2. **環境変数のアタッチ**:
   - 必要な各種シークレット (`STRIPE_SECRET_KEY`, `DISCORD_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` など) を Edge Functions や環境に設定します。

3. **Stripe CLI を用いた Webhook 疎通確認**:
   - `npm run stripe:listen` を用いて、ローカルにWebhookイベントをフォワードし、実際の購入イベント (`checkout.session.completed` 等) によってDBが正しく更新され、Discordのロール非同期操作がキューに載るか統合テストを実行します。

4. **API クライアントの差し替え**:
   - 準備が完了次第、フロントエンド側で `mockApi` ベースに依存しているプロバイダーやAPI呼び出しを、`Supabase JS Client` や本番用の `fetch` レイヤーへ段階的に切り替えていきます。
