# seller-harmony 読み取り専用バグ監査

## 1. 調査概要

**調査日**: 2026-03-03  
**対象リポジトリ**: `i0switch/seller-harmony`  
**調査範囲**:
- フロントエンド（React + TypeScript + Vite）: `src/` 全体
- バックエンド（FastAPI）: `backend/`
- Supabase Edge Functions: `supabase/functions/`
- Supabase マイグレーション: `supabase/migrations/`
- E2Eテスト: `tests/e2e/`
- ユニットテスト: `src/**/__tests__/`
- 設定ファイル: `playwright.config.ts`, `vitest.config.ts`, `supabase/config.toml`
- テスト計画: `seller-harmony-test-plan.md`

**調査方法**:
1. コードベースの全体構造を把握
2. `npm run lint` 実行 → **23個のESLintエラー確認**
3. `npm run test` 実行 → **4テスト失敗 / 43テスト成功**
4. `npx tsc --noEmit` 実行 → **TypeScriptコンパイルエラー無し**
5. 全Edge Function、RLSポリシー、認証フロー、ルーティングのコードレビュー

---

## 2. 確認済みバグ

### BUG-A01: OnboardingDiscord / OnboardingProfile で useState が条件分岐後に呼ばれている（React Hooks違反）

| 項目 | 内容 |
|---|---|
| **タイトル** | React Hooks Rules of Hooks 違反（条件分岐後の useState 呼び出し） |
| **深刻度** | 🔴 高 |
| **種別** | ランタイムエラー |
| **関連ファイル** | `src/pages/seller/OnboardingProfile.tsx:19-23`, `src/pages/seller/OnboardingDiscord.tsx:42-44` |
| **根拠** | ESLint `react-hooks/rules-of-hooks` エラーが8件検出。両コンポーネントで `if (isOnboarded) return <Navigate ...>` の後に `useState` が呼ばれている。 |
| **再現手順** | 1. Sellerとしてオンボーディング完了済みの状態でページに遷移 2. コンポーネントが再レンダリングされるタイミングでHooks呼び出し順序が変化 |
| **実際の挙動** | Reactが「Rendered more hooks than during the previous render」エラーを投げる可能性がある。特に再レンダリング間で `isOnboarded` の値が変化した場合に発生。 |
| **期待挙動** | 全ての `useState` 呼び出しが条件分岐より前に配置されるべき。 |
| **想定原因** | 早期リターンパターンがHooksの前に配置されてしまっている。 |
| **追加で確認すべきこと** | `isOnboarded` が `false` → `true` に変化するレンダリングシナリオで実際にクラッシュするか確認。 |
| **修正方針の概要** | `useState` 呼び出しを全てコンポーネントの先頭（早期リターンより前）に移動する。 |

---

### BUG-A02: OnboardingDiscord テストが全件失敗（AuthProvider 未ラップ）

| 項目 | 内容 |
|---|---|
| **タイトル** | OnboardingDiscord テストで AuthProvider 未提供によるクラッシュ |
| **深刻度** | 🟡 中 |
| **種別** | テスト不具合 |
| **関連ファイル** | `src/pages/seller/__tests__/OnboardingDiscord.test.tsx` |
| **根拠** | `npm run test` 実行で4テスト全失敗。エラー: `Error: useAuth must be used within an AuthProvider` |
| **再現手順** | `npm run test` を実行する |
| **実際の挙動** | `OnboardingDiscord` コンポーネントが `useSellerAuth` → `useAuth` を呼び出すが、テストのレンダラーに `AuthProvider` がラップされていない |
| **期待挙動** | テストが正常にパスすること |
| **想定原因** | テスト内の `renderComponent` に `AuthProvider` またはそのモックが含まれていない。他のテスト（例: `SellerLayout.test.tsx`）は `useSellerAuth` をモックしているが、このテストはモック対象が `supabase.functions.invoke` のみ。 |
| **追加で確認すべきこと** | なし（原因は明白） |
| **修正方針の概要** | テスト内で `useSellerAuth` をモックするか、`AuthProvider` でラップする。 |

---

### BUG-A03: CheckoutSuccess ページが stripe_checkout_session_id で検索するが、Webhook が当該カラムを設定していない

| 項目 | 内容 |
|---|---|
| **タイトル** | 購入完了ページのデータ取得が常に失敗する（stripe_checkout_session_id 未設定） |
| **深刻度** | 🔴 高 |
| **種別** | データフロー不整合 |
| **関連ファイル** | `src/pages/buyer/CheckoutSuccess.tsx:43`, `supabase/functions/stripe-webhook/index.ts:238-249` |
| **根拠** | `CheckoutSuccess.tsx` (L43) は `.eq("stripe_checkout_session_id", sessionId)` で membership を取得する。しかし `stripe-webhook` の `checkout.session.completed` ハンドラ (L238-249) は `memberships` テーブルに `stripe_checkout_session_id` を書き込んでいない。upsert の対象カラムに含まれていない。 |
| **再現手順** | 1. Buyerがプランを購入 2. Stripe Checkoutから `/checkout/success?session_id=xxx` にリダイレクトされる 3. CheckoutSuccess ページが表示される |
| **実際の挙動** | membership が見つからず「購入情報の反映待ちのため、標準表示でご案内しています。」という警告が永続的に表示される。購入内容の詳細が表示されない。 |
| **期待挙動** | 購入完了情報（プラン名、価格、販売者名等）が正常に表示される |
| **想定原因** | Webhook ハンドラの upsert に `stripe_checkout_session_id` カラムが追加されていない |
| **追加で確認すべきこと** | マイグレーションで `stripe_checkout_session_id` カラムが memberships テーブルに存在するか確認（types.ts では定義あり） |
| **修正方針の概要** | Webhook の `checkout.session.completed` ハンドラで `session.id` を `stripe_checkout_session_id` として memberships に保存する。 |

---

### BUG-A04: BuyerLogin の returnTo パラメータによるオープンリダイレクト脆弱性

| 項目 | 内容 |
|---|---|
| **タイトル** | BuyerLogin の returnTo クエリパラメータのバリデーション欠如 |
| **深刻度** | 🟡 中 |
| **種別** | セキュリティ（オープンリダイレクト） |
| **関連ファイル** | `src/pages/buyer/BuyerLogin.tsx:11,37` |
| **根拠** | L11: `const returnTo = searchParams.get("returnTo") \|\| "/member/me"` で外部URLも受け入れ可能。L37: `navigate(returnTo)` で無制限にリダイレクト。React Router の `navigate()` は外部URLへのリダイレクトを行わないが、`//evil.com` のようなプロトコル相対URLは通る可能性がある。 |
| **再現手順** | `/buyer/login?returnTo=//evil.com` にアクセスし、ログイン成功後の遷移先を確認 |
| **実際の挙動** | React Router の `navigate` が相対URLとして処理するため、外部サイトへの直接リダイレクトは発生しないが、フィッシング用の内部パスは設定可能 |
| **期待挙動** | `returnTo` が内部パス（`/` 始まり、ドメイン無し）であることを検証する |
| **想定原因** | 入力値のサニタイズが不足している |
| **追加で確認すべきこと** | React Router v6 の `navigate()` がプロトコル相対URLをどう処理するか実地検証 |
| **修正方針の概要** | `returnTo` が `/` で始まり `//` で始まらないことを確認するバリデーションを追加。 |

---

## 3. 高確度の不具合候補

### BUG-B01: PlatformLayout に isLoading 待機がなく、認証初期化前にリダイレクトが発生する

| 項目 | 内容 |
|---|---|
| **タイトル** | PlatformLayout で認証ロード中にログインページへ誤リダイレクト |
| **深刻度** | 🟠 高 |
| **種別** | レースコンディション / UX不具合 |
| **関連ファイル** | `src/layouts/PlatformLayout.tsx:29-31`, `src/hooks/useRouteGuard.ts:7` |
| **根拠** | `PlatformLayout` は `isLoading` を考慮せず `!isLoggedIn` だけでリダイレクト判定する。`usePlatformAuth` の `isLoggedIn` は `!!session && role === "platform_admin"` で、`AuthContext` の初期化完了前は `session=null, role=null` → `isLoggedIn=false` となる。SellerLayout は `isLoading` を正しくチェックしている (L29-35) が、PlatformLayout にはこのチェックがない。 |
| **再現手順** | 1. Platform Admin でログイン済み 2. ブラウザをリロードまたは `/platform/dashboard` に直接アクセス |
| **実際の挙動** | Supabase セッション復元前に `!isLoggedIn` が `true` と評価され、`/platform/login` にリダイレクトされてしまう |
| **期待挙動** | 認証初期化完了まではローディング表示し、完了後に適切にリダイレクトまたは内容を表示 |
| **想定原因** | `usePlatformAuth` が `isLoading` を返却しているが、PlatformLayout がそれを使用していない |
| **追加で確認すべきこと** | `usePlatformAuth` はすでに `isLoading` を返しているため、それを PlatformLayout 側で使えば解決するか確認 |
| **修正方針の概要** | `PlatformLayout` に `if (isLoading) return <LoadingSpinner />` を追加する。 |

---

### BUG-B02: Discord OAuth コールバック（DiscordResult）でコードを2回使用している

| 項目 | 内容 |
|---|---|
| **タイトル** | Discord OAuth 認可コードの二重使用（Exchange失敗の可能性） |
| **深刻度** | 🟠 高 |
| **種別** | ロジック不具合 |
| **関連ファイル** | `src/pages/buyer/DiscordResult.tsx:47-68,74-93` |
| **根拠** | DiscordResult は2段階フロー: (1) `useEffect` で `save: false` を指定してコードを交換しユーザー情報取得 (L50-51)、(2) `handleFinalize` で同じコードを `save: true` で再度交換 (L78-79)。しかし Discord の認可コードは**一度しか使用できない**。2回目の使用時にDiscordが `invalid_grant` エラーを返す。 |
| **再現手順** | 1. Discord OAuth フローを完了 2. DiscordResult ページに遷移 3. ユーザー情報確認後「このアカウントで連携を完了する」をクリック |
| **実際の挙動** | 2回目のコード交換が `invalid_grant` で失敗し、「連携の最終処理に失敗しました。」エラーが表示される |
| **期待挙動** | 1回のコード交換でトークンを取得し、フロントエンド側で一時的に保持してから保存確認する |
| **想定原因** | フロントエンドの確認UIを実装する際に、バックエンド側でトークンを一時保存せず毎回コード交換を行うアーキテクチャになっている |
| **追加で確認すべきこと** | `discord-oauth` Edge Function 側で1回目のコード交換時にトークンをDB等にキャッシュしているか確認 → 確認済み: キャッシュしていない |
| **修正方針の概要** | 1回目の呼び出し(`save: false`)でバックエンド側にトークンを一時保存し、2回目は保存済みトークンを使用する。またはフロントエンド側で確認UIを省略し、1回のコード交換で保存まで完了する。 |

---

### BUG-B03: Stripe Webhook で stripeAccount パラメータが Connect アカウント取得時に不足

| 項目 | 内容 |
|---|---|
| **タイトル** | checkout.session.completed のサブスクリプション取得で Connect Account 指定が不安定 |
| **深刻度** | 🟠 高 |
| **種別** | 外部API呼び出しの不備 |
| **関連ファイル** | `supabase/functions/stripe-webhook/index.ts:224-231,275` |
| **根拠** | L224-231: `stripe.subscriptions.retrieve()` に `stripeAccount: session.metadata?.stripe_account_id` を指定しているが、checkout session の metadata に `stripe_account_id` は設定されていない（L146-149 参照: metadata には `buyer_id`, `plan_id`, `seller_id` のみ）。一方 L275 の `invoice.payment_succeeded` では `stripeAccount` を一切指定していない。Stripe Connect では、Connect アカウントで作成されたサブスクリプションを Platform アカウントから取得するには `stripeAccount` パラメータが必須。 |
| **再現手順** | 1. Buyer がプランを購入 2. `checkout.session.completed` webhook が発火 3. サブスクリプション情報の取得が試みられる |
| **実際の挙動** | `stripe_account_id` が metadata にないため `undefined` が渡され、Platform アカウントでの取得を試みる → サブスクリプションが見つからないか、誤ったデータが返る |
| **期待挙動** | Connect アカウントのサブスクリプションが正しく取得され、`current_period_end` が正しく設定される |
| **想定原因** | checkout session 作成時に metadata に `stripe_account_id` を含めていないが、webhook 側ではそれを参照している不整合 |
| **追加で確認すべきこと** | Stripe Connect の event 構造で `account` フィールドが含まれるか確認 |
| **修正方針の概要** | `stripe-checkout` Edge Function の metadata に `stripe_account_id` を追加するか、webhook 側で `event.account` フィールドを使用する。 |

---

### BUG-B04: Edge Functions の全 verify_jwt = false で認証バイパスが可能

| 項目 | 内容 |
|---|---|
| **タイトル** | Supabase Edge Functions で JWT 検証が無効化されている |
| **深刻度** | 🟡 中（各Function内で独自チェック実施のため軽減） |
| **種別** | セキュリティ設定 |
| **関連ファイル** | `supabase/config.toml:3-15` |
| **根拠** | 全5つのEdge Function（stripe-onboarding, stripe-checkout, discord-oauth, discord-bot, stripe-webhook）で `verify_jwt = false` が設定されている。各Function内で独自にAuthorizationヘッダを検証しているが、Supabase のゲートウェイレベルでの保護がない。`stripe-webhook` は署名検証があるため問題ないが、他の4つは不正なJWTが渡された場合に `supabaseClient.auth.getUser()` が失敗するまで処理が進む。 |
| **再現手順** | 認証なしで `stripe-checkout` GET エンドポイントにアクセスし、公開されたプラン情報を取得 |
| **実際の挙動** | GET エンドポイント（プラン詳細取得）は認証チェックなしでアクセス可能（L32-62: 意図的にpublicだが、admin client を使用している） |
| **期待挙動** | `stripe-webhook` 以外は `verify_jwt = true` にし、追加の認証チェックは defense-in-depth として残す |
| **想定原因** | 開発初期に全て `false` に設定し、個別の修正が漏れている |
| **追加で確認すべきこと** | `stripe-checkout` の GET エンドポイント（プラン取得）は意図的にパブリックか確認 |
| **修正方針の概要** | `stripe-webhook` 以外の Function で `verify_jwt = true` に変更。`stripe-checkout` の GET はパブリックアクセスが必要なら別 Function に分離。 |

---

### BUG-B05: BuyerLayout に認証ガードがなく、全 Buyer ページが未認証でアクセス可能

| 項目 | 内容 |
|---|---|
| **タイトル** | BuyerLayout に認証チェックが一切ない |
| **深刻度** | 🟡 中 |
| **種別** | アクセス制御不備 |
| **関連ファイル** | `src/layouts/BuyerLayout.tsx`, `src/pages/buyer/MemberMe.tsx`, `src/pages/buyer/DiscordConfirm.tsx`, `src/pages/buyer/DiscordResult.tsx` |
| **根拠** | `BuyerLayout` は `SellerLayout` や `PlatformLayout` と異なり認証チェックを一切行わない。`MemberMe`（マイページ）、`DiscordConfirm`、`DiscordResult` は認証済みユーザーのみがアクセスすべきだが、レイアウトレベルのガードがない。各ページ内で `supabase.auth.getUser()` を呼んでいるが、未認証時にリダイレクトせず空のUIを表示する。 |
| **再現手順** | 1. ログアウト状態で `/member/me` にアクセス |
| **実際の挙動** | ページが表示されるが、データが空。ユーザーにはログインが必要であることが伝わらない |
| **期待挙動** | 未認証ユーザーは `/buyer/login` にリダイレクトされる |
| **想定原因** | `Purchase` ページ（`/p/:id`）はゲストにも見せたいため、Layout レベルの認証を省略した結果、他のページも保護されなくなった |
| **追加で確認すべきこと** | `/checkout/success` はセッション ID さえあれば認証不要でよいか確認 |
| **修正方針の概要** | BuyerLayout に認証ガードを追加するか、認証が必要なルートを別のレイアウトでラップする。 |

---

### BUG-B06: Buyer アカウント削除でサブスクリプションがキャンセルされない

| 項目 | 内容 |
|---|---|
| **タイトル** | アカウント削除時に Stripe サブスクリプション・Discord ロールがそのまま残る |
| **深刻度** | 🟠 高 |
| **種別** | ビジネスロジック不備 |
| **関連ファイル** | `src/pages/buyer/MemberMe.tsx:254-277` |
| **根拠** | アカウント削除処理 (L260-265) は memberships の status を `canceled` に更新し、discord_identities を削除してサインアウトするが、Stripe のサブスクリプションキャンセルを行っていない。これにより Stripe 側で課金が継続し、webhook で status が再度 `active` に戻る可能性がある。また Discord ロールの剥奪も行われていない。 |
| **再現手順** | 1. アクティブなサブスクリプションを持つ Buyer でログイン 2. マイページから「アカウント削除」を実行 |
| **実際の挙動** | DB 上は `canceled` だが Stripe サブスクリプションは継続 → 次の webhook で再度 active に更新される |
| **期待挙動** | Stripe サブスクリプションのキャンセル API を呼び出し、Discord ロールを剥奪した後にアカウントを削除する |
| **想定原因** | アカウント削除フローにバックエンド連携が組み込まれていない |
| **追加で確認すべきこと** | Stripe Customer Portal を使用している場合の影響 |
| **修正方針の概要** | Edge Function を用いて Stripe サブスクリプションキャンセルと Discord ロール剥奪を行った後に DB 更新する。 |

---

### BUG-B07: CORS ヘッダに Access-Control-Allow-Methods が欠落

| 項目 | 内容 |
|---|---|
| **タイトル** | Edge Functions の CORS 設定に Allow-Methods ヘッダがない |
| **深刻度** | 🟢 低 |
| **種別** | 構成不備 |
| **関連ファイル** | 全 `supabase/functions/*/index.ts` の `corsHeaders` 定義 |
| **根拠** | 全 Edge Function の CORS ヘッダに `Access-Control-Allow-Methods` が含まれていない。ブラウザによってはプリフライトリクエスト時に `POST` メソッドが許可されない場合がある。 |
| **再現手順** | 特定のブラウザ（特にFirefox等）から Edge Function に POST リクエストを送信 |
| **実際の挙動** | ブラウザのCORSプリフライトが失敗する可能性がある |
| **期待挙動** | `Access-Control-Allow-Methods: GET, POST, OPTIONS` が含まれる |
| **想定原因** | CORS設定のテンプレートから漏れている |
| **追加で確認すべきこと** | 現在のデプロイ環境で実際にCORSエラーが発生しているか確認 |
| **修正方針の概要** | 全 Edge Function の `corsHeaders` に `'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'` を追加。 |

---

## 4. 未確認の要調査事項

### BUG-C01: Seller の Webhook 一覧がRLSなしで全テナントの Webhook を取得している可能性

| 項目 | 内容 |
|---|---|
| **タイトル** | stripe_webhook_events の RLS ポリシーが platform_admin のみ SELECT 許可 |
| **深刻度** | 🟡 中（未確認） |
| **種別** | データアクセス制御 |
| **関連ファイル** | `src/services/api/supabase/seller.ts:565-601`, `supabase/migrations/20260227000001_security_fixes.sql:19-27` |
| **根拠** | `seller.ts` の `getWebhooks` は `supabase.from("stripe_webhook_events").select("*")` でデータ取得後にクライアント側で `seller_id` フィルタリングしている (L576-581)。しかし RLS ポリシーは platform_admin のみが SELECT 可能。Seller ロールでこのクエリを実行すると、RLS により空配列が返る可能性がある。 |
| **再現手順** | Seller でログインし、Webhook 一覧ページにアクセス |
| **実際の挙動** | RLS により空のリストが返される可能性が高い |
| **期待挙動** | Seller は自身に関連する Webhook イベントのみ閲覧できる |
| **想定原因** | RLS ポリシーに Seller 向けの SELECT ポリシーが追加されていない |
| **追加で確認すべきこと** | Supabase 側の実際の RLS ポリシーの状態を確認 |
| **修正方針の概要** | Seller が payload 内の seller_id と一致する webhook events を閲覧できる RLS ポリシーを追加するか、Service Role Key を使用するEdge Functionで取得する。 |

---

### BUG-C02: Platform Admin API が全てモック（ハードコード値）で実装されている

| 項目 | 内容 |
|---|---|
| **タイトル** | FastAPI バックエンドの Platform API が全てモックデータを返却 |
| **深刻度** | 🟡 中（意図的かもしれないが機能未実装） |
| **種別** | 機能未実装 |
| **関連ファイル** | `backend/app/api/endpoints/platform.py`, `backend/app/api/endpoints/seller.py`, `backend/app/api/endpoints/buyer.py` |
| **根拠** | FastAPI の全エンドポイントがハードコードされたモックデータを返す。Platform Admin のダッシュボードは `platformApi` (HTTP client) 経由でこの FastAPI に接続するため、実データが一切表示されない。 |
| **再現手順** | Platform Admin でログインし、ダッシュボードを表示 |
| **実際の挙動** | 固定のモックデータ（activeTenants: 10, totalMembers: 1000 等）が表示される |
| **期待挙動** | Supabase の実データが表示される |
| **想定原因** | Seller/Buyer API は Supabase 直接実装に移行済みだが、Platform API は未移行 |
| **追加で確認すべきこと** | Platform API の Supabase 移行が計画されているか確認 |
| **修正方針の概要** | Platform API も Supabase 直接実装に移行する。 |

---

### BUG-C03: PlatformTenants のテナント停止/再開が実際にはAPIを呼ばず toast のみ表示

| 項目 | 内容 |
|---|---|
| **タイトル** | テナント停止/再開ボタンがトースト表示のみで実処理を行わない |
| **深刻度** | 🟡 中 |
| **種別** | 機能未実装 |
| **関連ファイル** | `src/pages/platform/PlatformTenants.tsx:36-42` |
| **根拠** | `handleSuspend` と `handleResume` は `platformApi.suspendTenant()` / `resumeTenant()` を呼ばず、toast メッセージ（「モック」と明記）のみ表示。 |
| **再現手順** | Platform Admin → テナント管理 → テナント停止/再開をクリック |
| **実際の挙動** | 「テナント停止しました（モック）」のトーストのみ |
| **期待挙動** | 実際にテナントのステータスが変更される |
| **想定原因** | 未実装 |
| **追加で確認すべきこと** | なし |
| **修正方針の概要** | `handleSuspend` / `handleResume` 内で `platformApi.suspendTenant(t.id)` / `resumeTenant(t.id)` を呼び出し、成功後にリストを再取得する。 |

---

### BUG-C04: Buyer の nextBillingDate がハードコード（現在日+30日）

| 項目 | 内容 |
|---|---|
| **タイトル** | 次回請求日が Stripe の実データでなくハードコード値 |
| **深刻度** | 🟡 中 |
| **種別** | データ不整合 |
| **関連ファイル** | `src/services/api/supabase/buyer.ts:91-93`, `src/pages/buyer/CheckoutSuccess.tsx:79-80` |
| **根拠** | `buyer.ts` L91-93: `nextBillingDate` が `new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)` で固定計算されている。Stripe の `current_period_end` を使用していない。年額プランでも30日後が表示される。 |
| **再現手順** | 年額プランを購入してマイページで確認 |
| **実際の挙動** | 年額プランでも「次回請求日: 30日後」が表示される |
| **期待挙動** | 実際の `current_period_end` に基づいた次回請求日が表示される |
| **想定原因** | memberships テーブルの `current_period_end` を参照するロジックが未実装 |
| **追加で確認すべきこと** | memberships テーブルに `current_period_end` が正しく記録されているか |
| **修正方針の概要** | `buyer.ts` で `memberships.current_period_end` を使用して `nextBillingDate` を返却する。 |

---

### BUG-C05: BuyerSignup で role が buyer として明示的に設定されない

| 項目 | 内容 |
|---|---|
| **タイトル** | Buyer 新規登録時に role: buyer が metadata に含まれない |
| **深刻度** | 🟢 低（デフォルトでbuyerになるため問題ないが一貫性に欠ける） |
| **種別** | 一貫性の欠如 |
| **関連ファイル** | `src/pages/buyer/BuyerLogin.tsx:29` |
| **根拠** | `BuyerLogin.tsx` の signUp は metadata なしで `supabase.auth.signUp({ email, password })` を呼ぶ。一方 `AuthContext.tsx` の `sellerSignup` は `options: { data: { role: "seller" } }` を明示的に設定している。`handle_new_user` トリガーでデフォルトが `buyer` なので動作はするが、意図が不明確。 |
| **再現手順** | `/buyer/login` から新規登録を行う |
| **実際の挙動** | DB トリガーで `buyer` ロールが設定される（問題なし） |
| **期待挙動** | `options: { data: { role: "buyer" } }` を明示的に指定する |
| **想定原因** | 見落とし |
| **追加で確認すべきこと** | なし |
| **修正方針の概要** | Buyer signup 時に `data: { role: "buyer" }` を metadata に含める。 |

---

### BUG-C06: Stripe Checkout 作成時に Connect アカウント上のサブスクリプションに stripe_account_id metadata が未設定

| 項目 | 内容 |
|---|---|
| **タイトル** | checkout session の metadata に stripe_account_id が含まれない |
| **深刻度** | 🟡 中 |
| **種別** | データフロー不整合 |
| **関連ファイル** | `supabase/functions/stripe-checkout/index.ts:146-149` |
| **根拠** | metadata に `buyer_id`, `plan_id`, `seller_id` の3つしか含まれていない。Webhook 側では `session.metadata?.stripe_account_id` を参照するコードがある (L228)。 |
| **再現手順** | プラン購入フローを実行 |
| **実際の挙動** | `stripe_account_id` が undefined になる |
| **期待挙動** | metadata に `stripe_account_id: accountData.stripe_account_id` が含まれる |
| **想定原因** | metadata 定義の不足 |
| **追加で確認すべきこと** | なし |
| **修正方針の概要** | checkout session 作成時の metadata に `stripe_account_id` を追加する。 |

---

## 5. テスト不足・観測不足

### TEST-01: E2E テストが一切存在しない

| 項目 | 内容 |
|---|---|
| **タイトル** | Playwright E2E テストファイルが0件 |
| **深刻度** | 🔴 高 |
| **種別** | テストカバレッジ不足 |
| **関連ファイル** | `tests/e2e/`, `playwright.config.ts`, `playwright.hosted.config.ts`, `seller-harmony-test-plan.md` |
| **根拠** | `tests/e2e/` ディレクトリにテストファイルが存在しない。`package.json` で参照されているスクリプト（`tests/e2e/scripts/capture-hosted-storage.mjs`, `tests/e2e/scripts/run-vscode-auto.mjs`）も存在しない。テスト計画書には200以上のテストシナリオが記載されているが、実装は0件。 |
| **追加で確認すべきこと** | テスト計画のフェーズ1（ランディング・ルーティング）から段階的に実装が必要 |

---

### TEST-02: ユニットテストが1つの dummy テスト + 13ファイルのみで重要ロジックのカバレッジがゼロ

| 項目 | 内容 |
|---|---|
| **タイトル** | ビジネスロジックのユニットテストが皆無 |
| **深刻度** | 🟠 高 |
| **種別** | テストカバレッジ不足 |
| **関連ファイル** | `src/test/example.test.ts`, `src/**/__tests__/` |
| **根拠** | `example.test.ts` は `expect(true).toBe(true)` のみ。`__tests__/` 内の13ファイルは基本的なUI描画テストのみ。以下の重要ロジックがテストされていない: AuthContext のセッション管理、useSellerAuth のオンボーディングステップ解決、API レイヤー（Supabase クエリロジック）、型変換ヘルパー関数 |

---

### TEST-03: Stripe Webhook ハンドラのテストが皆無

| 項目 | 内容 |
|---|---|
| **タイトル** | Edge Function（特に stripe-webhook）の自動テストが存在しない |
| **深刻度** | 🔴 高 |
| **種別** | テストカバレッジ不足（課金フロー） |
| **関連ファイル** | `supabase/functions/stripe-webhook/index.ts` |
| **根拠** | 500行の webhook ハンドラが無テスト。9種類のイベント処理（checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, invoice.voided, customer.subscription.updated, customer.subscription.deleted, charge.refunded, charge.dispute.created）のいずれもテストされていない。 |

---

### TEST-04: Discord ロール付与/剥奪のテストが皆無

| 項目 | 内容 |
|---|---|
| **タイトル** | Discord Bot Edge Function のテストが存在しない |
| **深刻度** | 🟠 高 |
| **種別** | テストカバレッジ不足 |
| **関連ファイル** | `supabase/functions/discord-bot/index.ts` |
| **根拠** | ロール付与（grant_role）、権限検証（validate_bot_permission）のロジックが一切テストされていない。 |

---

### TEST-05: RLS ポリシーの検証テストが存在しない

| 項目 | 内容 |
|---|---|
| **タイトル** | Supabase RLS ポリシーのセキュリティテストが皆無 |
| **深刻度** | 🟠 高 |
| **種別** | セキュリティテスト不足 |
| **関連ファイル** | `supabase/migrations/` |
| **根拠** | 異なるロール（buyer/seller/platform_admin）間でのデータアクセス分離がテストされていない。例: Seller A が Seller B の plans を閲覧できないことの検証等。 |

---

## 6. 優先度順の一覧

| 優先度 | ID | タイトル | 深刻度 | 種別 | 状態 |
|---|---|---|---|---|---|
| 1 | BUG-A03 | CheckoutSuccess の stripe_checkout_session_id 未設定 | 🔴 高 | データフロー不整合 | 確認済み |
| 2 | BUG-A01 | React Hooks Rules 違反（条件分岐後の useState） | 🔴 高 | ランタイムエラー | 確認済み |
| 3 | BUG-B02 | Discord OAuth コード二重使用 | 🟠 高 | ロジック不具合 | 高確度 |
| 4 | BUG-B01 | PlatformLayout の isLoading 未チェック | 🟠 高 | レースコンディション | 高確度 |
| 5 | BUG-B03 | Stripe Webhook の Connect Account パラメータ不足 | 🟠 高 | 外部API不備 | 高確度 |
| 6 | BUG-B06 | Buyer アカウント削除で Stripe 未キャンセル | 🟠 高 | ビジネスロジック不備 | 高確度 |
| 7 | TEST-01 | E2E テストが一切存在しない | 🔴 高 | テスト不足 | 確認済み |
| 8 | TEST-03 | Stripe Webhook テスト皆無 | 🔴 高 | テスト不足 | 確認済み |
| 9 | BUG-A02 | OnboardingDiscord テスト全件失敗 | 🟡 中 | テスト不具合 | 確認済み |
| 10 | BUG-A04 | BuyerLogin オープンリダイレクト | 🟡 中 | セキュリティ | 確認済み |
| 11 | BUG-B04 | Edge Functions verify_jwt = false | 🟡 中 | セキュリティ設定 | 高確度 |
| 12 | BUG-B05 | BuyerLayout 認証ガード欠如 | 🟡 中 | アクセス制御 | 高確度 |
| 13 | BUG-C01 | Seller Webhook RLS 不足 | 🟡 中 | データアクセス | 未確認 |
| 14 | BUG-C02 | Platform API 全モック | 🟡 中 | 機能未実装 | 未確認 |
| 15 | BUG-C03 | テナント停止/再開がモック | 🟡 中 | 機能未実装 | 未確認 |
| 16 | BUG-C04 | nextBillingDate ハードコード | 🟡 中 | データ不整合 | 未確認 |
| 17 | BUG-C06 | metadata に stripe_account_id 未設定 | 🟡 中 | データフロー不整合 | 未確認 |
| 18 | TEST-02 | ユニットテスト不足 | 🟠 高 | テスト不足 | 確認済み |
| 19 | TEST-04 | Discord Bot テスト皆無 | 🟠 高 | テスト不足 | 確認済み |
| 20 | TEST-05 | RLS テスト皆無 | 🟠 高 | テスト不足 | 確認済み |
| 21 | BUG-B07 | CORS Allow-Methods 欠落 | 🟢 低 | 構成不備 | 高確度 |
| 22 | BUG-C05 | Buyer signup の role 明示不足 | 🟢 低 | 一貫性 | 未確認 |

---

## 補足: ESLint エラー一覧（参考）

```
OnboardingProfile.tsx:19-23  - useState 条件呼び出し (5件)
OnboardingDiscord.tsx:42-44  - useState 条件呼び出し (3件)
BuyerLogin.tsx:38             - any 型使用
CheckoutSuccess.tsx:49        - any 型使用
Purchase.tsx:28,57,80         - any 型使用 (3件)
SellerDiscordSettings.tsx:50  - any 型使用
SellerMemberDetail.tsx:77     - any 型使用
buyer.ts:31,59                - any 型使用 (2件)
seller.ts:77,186,409,463,576,588 - any 型使用 (6件)
合計: 23 errors, 0 warnings
```

---

**以上、読み取り専用バグ監査レポート完了。**  
**コード変更、コミット、PRの作成は行っていません。**
