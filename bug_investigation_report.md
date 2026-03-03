# seller-harmony バグ調査レポート

**調査日時**: 2026-03-03  
**対象リポジトリ**: https://github.com/i0switch/seller-harmony  
**調査方法**: 静的コード読解 + 既存テスト実行（vitest）  
**テスト結果**: vitest 14ファイル / 47テスト **全パス** ✅

---

## 1. 全体所見

### リスクの高い領域

| 領域 | リスク | 重点理由 |
|------|--------|----------|
| **RLSポリシー** | **Critical** | 存在しない列を参照するポリシーあり。機能しない or エラーの可能性大 |
| **マルチテナント認可** | **Critical** | `overrideMember` など seller_id チェックが欠如している箇所あり |
| **Webhook イベント閲覧** | **High** | seller向け webhook 一覧が全イベントを取得後にクライアント側フィルタ |
| **Stripe Checkout GET** | **High** | `select(*)` で全カラムを認証なしで返却 |
| **Buyer Layout 認可** | **Medium** | session有無のみチェックし role を検証しない |
| **テストカバレッジ** | **Medium** | Webhook/Discord/RLS/セキュリティ系のテストが皆無 |

---

## 2. 確認済みバグ

### BUG-C01: RLSポリシー `Public can view published plans` が存在しない列 `status` を参照

- **深刻度**: Critical
- **種別**: Permissions / Data
- **発生箇所**: [20260303000001_public_buyer_policies.sql](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/migrations/20260303000001_public_buyer_policies.sql#L2-L4)
- **再現手順**:
  1. マイグレーションを適用する
  2. `plans` テーブルに `status` 列が存在するか確認する
- **実際の結果**: ポリシーが `status = 'published'` を条件にしているが、`plans` テーブルには `status` 列が存在しない。実際のステータス管理は `is_public`（boolean）と `deleted_at`（timestamptz）で行われている
- **期待結果**: ポリシーが `is_public = true AND deleted_at IS NULL` を使用すべき
- **根拠ファイル**:
  - マイグレーション: `20260303000001_public_buyer_policies.sql` L3 → `status = 'published'`
  - savePlan: [seller.ts](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/services/api/supabase/seller.ts#L281) → `is_public: planData.status === "published"`
  - checkout: [stripe-checkout/index.ts](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/functions/stripe-checkout/index.ts#L50-L51) → `.eq('is_public', true).is('deleted_at', null)`
- **原因の仮説**: RLSポリシー作成時にDBスキーマと不整合のまま適用された。Postgresでは存在しない列を参照するとポリシーが常にFALSEを返すか、エラーになる
- **修正方針の概要**: `status = 'published'` を `is_public = true AND deleted_at IS NULL` に変更

---

### BUG-C02: `overrideMember` が seller_id 検証なし — 任意のメンバーシップを手動オーバーライド可能

- **深刻度**: Critical
- **種別**: Permissions / Auth
- **発生箇所**: [seller.ts](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/services/api/supabase/seller.ts#L554-L561)
- **再現手順**:
  1. Seller A としてログイン
  2. Seller B の membership_id を取得（推測 or 漏洩経路で）
  3. `sellerApi.overrideMember(membership_id_of_seller_B)` を呼び出す
- **実際の結果**: `seller_id` チェックなしに `.eq("id", memberId)` のみで `manual_override = true` に更新可能
- **期待結果**: `.eq("seller_id", user.id)` の条件が必須
- **根拠ファイル**: [seller.ts L554-L561](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/services/api/supabase/seller.ts#L554-L561)
- **原因の仮説**: RLSポリシーでmembershipsテーブルの更新がseller_id制約されていればDB側で防止されるが、フロントエンドAPIレベルでの検証が欠落
- **修正方針の概要**: `.eq("seller_id", user.id)` を追加

---

### BUG-C03: Seller Webhook一覧が全イベントをクライアント側でフィルタ — データ露出

- **深刻度**: High
- **種別**: Permissions / Data
- **発生箇所**: [seller.ts L595-L613](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/services/api/supabase/seller.ts#L595-L613)
- **再現手順**:
  1. Seller としてログイン
  2. Webhook一覧ページにアクセス
  3. ネットワークタブで Supabase クエリのレスポンスを確認
- **実際の結果**: `stripe_webhook_events` テーブルから200件をSELECTし、クライアント側JavaScriptで `payload.data.object.metadata.seller_id` をフィルタ。RLSは `platform_admin` のみ SELECT 可能に設定されているため、Sellerはそもそも何も取得できない可能性が高い
- **期待結果**: サーバー側（Edge Function or RLSポリシー）でseller_id制約付きのクエリを実行
- **根拠ファイル**:
  - セキュリティマイグレーション: [20260227000001_security_fixes.sql L19-L27](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/migrations/20260227000001_security_fixes.sql#L19-L27) — `platform_admin` のみ SELECT 許可
  - クライアントフィルタ: [seller.ts L607-L613](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/services/api/supabase/seller.ts#L607-L613)
- **原因の仮説**: 当初はRLSなしで全取得→フィルタしていたが、RLS追加後にクエリ側のロジックを更新し忘れた
- **修正方針の概要**: Seller用のRLSポリシーを追加するか、Edge Function経由でserviceRoleで取得してseller_idフィルタ済みデータを返す

---

### BUG-C04: discord-bot Edge Function のcatchブロックが内部エラーを 400 で返却

- **深刻度**: Medium
- **種別**: Config / Webhook
- **発生箇所**: [discord-bot/index.ts L310-L316](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/functions/discord-bot/index.ts#L310-L316)
- **再現手順**:
  1. discord-bot Edge Function に不正なリクエストを送信して内部エラーを発生させる
- **実際の結果**: catch ブロック内で `status: 400`（クライアントエラー）を返却
- **期待結果**: `status: 500`（サーバーエラー）を返却
- **根拠ファイル**: [discord-bot/index.ts L314](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/functions/discord-bot/index.ts#L314) — `status: 400`
- **原因の仮説**: コピペミスまたは意図的にクライアントエラーとして返していたが、`Internal server error` メッセージと矛盾
- **修正方針の概要**: `status: 400` → `status: 500` に変更

---

### BUG-C05: Stripe Checkout GET エンドポイントが `select(*)` で全カラムを認証なしで返却

- **深刻度**: High
- **種別**: Data / Permissions
- **発生箇所**: [stripe-checkout/index.ts L46-L52](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/functions/stripe-checkout/index.ts#L46-L52)
- **再現手順**:
  1. `GET /stripe-checkout?plan_id={known_plan_id}` を認証なしで実行
- **実際の結果**: `plans` テーブルの全カラム（`seller_id`, `stripe_price_id` 等の内部情報含む）が返却される
- **期待結果**: 公開すべきカラム（`name`, `description`, `price`, `currency`, `interval`）のみに限定すべき
- **根拠ファイル**: [stripe-checkout/index.ts L48](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/functions/stripe-checkout/index.ts#L48) — `.select('*')`
- **原因の仮説**: 開発効率のため `*` を使用したまま本番移行した
- **修正方針の概要**: SELECT を必要最小限のカラムに制限（`name, description, price, currency, interval`）

---

### BUG-C06: BuyerLayout が session の有無のみチェックし role を検証しない

- **深刻度**: Medium
- **種別**: Auth / Permissions
- **発生箇所**: [BuyerLayout.tsx L9, L23](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/layouts/BuyerLayout.tsx#L9)
- **再現手順**:
  1. Seller アカウントでログイン
  2. `/member/me` にアクセス
- **実際の結果**: `session` の有無のみで通過可能。`role` のチェックがない。Seller が Buyer 画面にアクセスできる
- **期待結果**: `role === "buyer"` のチェックを追加するか、ロール不問で問題ないことを明示
- **根拠ファイル**: [BuyerLayout.tsx L9](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/layouts/BuyerLayout.tsx#L9) — `session` のみ使用、`role` 未使用
- **原因の仮説**: Buyer フローはゲスト購入を許容する設計だが、認証済みの他ロールユーザーの制御が不十分
- **修正方針の概要**: 設計意図を明確にし、必要ならロールチェック追加。ゲスト購入対応なら明示的にコメント

---

### BUG-C07: OnboardingStripe で Stripe連携をスキップ可能なのにフロントエンドのみのガード

- **深刻度**: Medium
- **種別**: UI / Auth
- **発生箇所**: [OnboardingStripe.tsx L99-L103](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/pages/seller/OnboardingStripe.tsx#L99-L103)
- **再現手順**:
  1. Seller サインアップ後、Stripeオンボーディングページにアクセス
  2. 「スキップ（あとで設定）」をクリック
  3. Discord設定ページへ遷移可能
- **実際の結果**: Stripe未連携のまま `completeOnboarding` を呼ぶと `seller_profiles.status = 'active'` になり、SellerLayoutのガード（`isOnboarded`）を通過できる
- **期待結果**: Stripeアカウントが有効（`charges_enabled && payouts_enabled`）になるまでダッシュボードにアクセス不可
- **根拠ファイル**:
  - スキップボタン: [OnboardingStripe.tsx L100](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/pages/seller/OnboardingStripe.tsx#L100)
  - `refreshOnboardingStep`: [useSellerAuth.ts L48-L51](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/hooks/useSellerAuth.ts#L48-L51) — profile.status === "active" で即 "complete" に
- **原因の仮説**: `completeOnboarding` が profile のみ更新し、Stripe/Discord の実態を verify しない設計
- **修正方針の概要**: `completeOnboarding` または `SellerLayout` のガードで Stripe 連携状態を確認する

---

## 3. 高確度のバグ候補

### BUG-H01: `retryDiscordRole` で seller_id 検証なし

- **深刻度**: High
- **種別**: Permissions
- **発生箇所**: [seller.ts L563-L581](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/services/api/supabase/seller.ts#L563-L581)
- **何が怪しいか**: `.eq("id", memberId)` で membership を取得し、seller_id の検証なしに discord-bot Edge Function を呼び出す
- **なぜ怪しいか**: `overrideMember`（BUG-C02）と同じパターン。他のSellerのメンバーに対してDiscordロール操作が可能な可能性
- **追加検証**: RLSポリシーで `memberships` テーブルの SELECT が `seller_id = auth.uid()` に制限されているか確認が必要

---

### BUG-H02: Stripe Webhook の dispute 処理でメンバーシップ検索が不確実

- **深刻度**: High
- **種別**: Webhook / Billing
- **発生箇所**: [stripe-webhook/index.ts L528-L581](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/functions/stripe-webhook/index.ts#L528-L581)
- **何が怪しいか**: `charge.dispute.created` ハンドラで `dispute.metadata?.customer` を使ってメンバーシップを検索しているが、dispute の `metadata` に `customer` が含まれる保証がない
- **なぜ怪しいか**: Stripe API の dispute オブジェクトの `charge` フィールドから辿る必要があるが、`metadata` は空の可能性が高い
- **追加検証**: Stripe テスト環境で dispute を発生させ、metadata の中身を確認

---

### BUG-H03: `charge.dispute.closed` で `risk_flag` を持つ最初の1件を使用 — マルチテナント安全性

- **深刻度**: High
- **種別**: Webhook / Data
- **発生箇所**: [stripe-webhook/index.ts L590-L606](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/supabase/functions/stripe-webhook/index.ts#L590-L606)
- **何が怪しいか**: `risk_flag = true` の最初の1件から seller_id を取得して Stripe Connect アカウントを解決している。複数テナントに risk_flag が立っている場合、間違ったテナントの Stripe アカウントで charge を取得しようとする
- **なぜ怪しいか**: マルチテナント環境では risk_flag が複数テナント同時に立つ可能性がある
- **追加検証**: dispute イベントが来た際、正しいテナントの Connect アカウントが使われるかテスト

---

### BUG-H04: `SellerPlans.togglePublish` が "stopped" を設定するが savePlan は "draft" にマッピング

- **深刻度**: Medium
- **種別**: UI / Data
- **発生箇所**: [SellerPlans.tsx L40](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/pages/seller/SellerPlans.tsx#L40), [seller.ts L281](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/services/api/supabase/seller.ts#L281)
- **何が怪しいか**: `togglePublish` で `newStatus = "stopped"` を渡すが、`savePlan` 内の `is_public: planData.status === "published"` は "stopped" も "draft" も `false` にマッピングする。結果的に "停止" にしたプランが "下書き" と区別できない（`deleted_at` は設定されない）
- **なぜ怪しいか**: `toPlanStatus` は `deleted_at` ありで "stopped"、なしで is_public=false は "draft" と判定。つまり「停止→再取得」で "draft" に変わる
- **追加検証**: 実際に公開中のプランを「停止」した後、プラン一覧でステータスが "draft" と表示されるか確認

---

### BUG-H05: Supabase クライアントにハードコードされた anon key

- **深刻度**: Medium
- **種別**: Config / Security
- **発生箇所**: [client.ts L6-L8](file:///c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony/src/integrations/supabase/client.ts#L6-L8)
- **何が怪しいか**: 環境変数がない場合のフォールバックとしてJWTがハードコードされている。anon keyは公開情報だがバージョン管理に含まれることの是非
- **なぜ怪しいか**: anon key自体はRLSで保護されるため直接のセキュリティリスクは低いが、プロジェクトURLとセットで公開リポジトリにあると攻撃対象が明確になる
- **追加検証**: `.gitignore` で `.env.local` が除外されているか確認（除外済みを確認→問題なし）。ただしclient.ts内のハードコードはgit管理下

---

## 4. 未確認だが要調査の論点

### INV-01: memberships テーブルの RLS ポリシーで seller の UPDATE 権限範囲

- **何が怪しいか**: `overrideMember` や他のUPDATE操作がRLSでどこまで制約されているか未確認
- **なぜ怪しいか**: フロントエンドAPIが seller_id チェックを省略している箇所が複数あり、RLSが最後の防壁
- **追加検証**: Supabase ダッシュボードで memberships テーブルの UPDATE ポリシーを確認

### INV-02: `pg_cron` による grace_period 自動遷移が実際に有効化されているか

- **何が怪しいか**: マイグレーションにコメントとして `SELECT cron.schedule(...)` が記載されているが、実行されていない
- **なぜ怪しいか**: `expire_grace_period_memberships()` 関数は存在するが、定期実行されなければ grace_period → expired の遷移がトリガーでしか発火しない（UPDATE 時のみ）
- **追加検証**: Supabase ダッシュボードで pg_cron の有効化状態とジョブ登録状況を確認

### INV-03: discord-oauth の redirect_uri 許可パターンが広すぎる可能性

- **何が怪しいか**: `ALLOWED_REDIRECT_PATTERNS` に `/^https:\/\/.*\.supabase\.co\/.*$/` がある
- **なぜ怪しいか**: 任意の supabase.co サブドメインへのリダイレクトが許可されており、攻撃者が自分のSupabaseプロジェクトを悪用できる可能性
- **追加検証**: 実際にリダイレクトが成功するか、Discordの redirect_uri 登録との整合性を確認

### INV-04: `checkout.session.completed` で `stripe_account_id` を metadata から取得して subscription.retrieve に使用

- **何が怪しいか**: `session.metadata?.stripe_account_id` は checkout 作成時にフロントが設定。改ざん可能性
- **なぜ怪しいか**: metadata はクライアント指定。ただし checkout session 作成は Edge Function 内なので直接改ざんは困難
- **追加検証**: metadata の設定がサーバー側のみで行われていることをフロー全体で確認

### INV-05: バックエンド（FastAPI localhost:8000）が実質的に使われていない

- **何が怪しいか**: `src/services/api/index.ts` で seller と buyer は Supabase-direct に切り替え済み。platform のみ HTTP クライアントを使用
- **なぜ怪しいか**: バックエンドがモック API のままで platform 管理画面がモックデータを返す可能性。real data と mock data の混在
- **追加検証**: platform API エンドポイントの実際の振る舞いを確認

### INV-06: `discord-oauth` の redirect_uri が body からも受け取れる（open redirect リスク）

- **何が怪しいか**: `actualRedirectUri = body.redirect_uri || redirect_uri` で body からの入力を受付
- **なぜ怪しいか**: `ALLOWED_REDIRECT_PATTERNS` で検証はしているが、パターンが広い（INV-03）と組み合わさると問題
- **追加検証**: body.redirect_uri に任意の URL を渡してリダイレクトが成功するかテスト

---

## 5. テストの穴

### 未カバー領域

| 領域 | 既存テスト | 不足 |
|------|-----------|------|
| **Stripe Webhook ハンドラ** | なし | 全イベント種別のハンドラロジック未テスト |
| **Discord Bot Edge Function** | なし | grant_role / validate 処理のユニットテスト未テスト |
| **Discord OAuth Edge Function** | なし | CSRF防止、state検証、code exchange のテスト未テスト |
| **Stripe Checkout Edge Function** | なし | プラン取得/チェックアウトセッション作成のテスト未テスト |
| **RLSポリシー** | なし | 各ロール（Seller/Buyer/Admin）のアクセス制御テスト未テスト |
| **認証フロー（セキュリティ）** | e2e に `security-tests.spec.ts` あり | 内容は限定的。XSS/CSRF/認可バイパスのテスト不足 |
| **バックエンド（FastAPI）** | `backend/tests/` に1ファイルのみ | APIエンドポイントのユニットテスト不足 |
| **マルチテナント分離** | なし | Seller A が Seller B のデータにアクセスできないことのテスト未テスト |

### 追加すべきテスト観点

1. **Webhook 冪等性テスト**: 同一イベントIDの2回送信で処理がスキップされること
2. **Webhook 署名検証テスト**: 不正な署名で400が返ること
3. **RLSバイパステスト**: 各ロールで他テナントのデータにアクセスできないこと
4. **認可エスカレーションテスト**: Buyer→Seller/Admin へのロール昇格が防止されること
5. **Stripe Checkout テスト**: 非公開プランで購入が拒否されること
6. **Discord ロール競合テスト**: 複数プランで同一ロールIDが設定された場合のgrant/revoke
7. **環境変数欠落テスト**: 各Edge Functionで必要な環境変数が未設定の場合の挙動
8. **grace_period → expired 自動遷移テスト**: pg_cron未設定時にトリガーのみで遷移するか

---

## 6. 優先順位つき一覧

### P0（即座に対応が必要）

| ID | タイトル | 種別 |
|----|---------|------|
| BUG-C01 | RLSポリシー `status` 列不在 — plans の公開アクセスが機能しない | Permissions |
| BUG-C02 | `overrideMember` seller_id 検証なし | Permissions |
| BUG-C05 | Checkout GET `select(*)` データ露出 | Data |

### P1（早期対応推奨）

| ID | タイトル | 種別 |
|----|---------|------|
| BUG-C03 | Seller Webhook一覧クライアント側フィルタ / RLS不整合 | Data |
| BUG-H01 | `retryDiscordRole` seller_id 検証なし | Permissions |
| BUG-H02 | dispute 処理の metadata 依存 | Webhook |
| BUG-H03 | dispute.closed の risk_flag 最初の1件依存 | Webhook |
| INV-03 | discord-oauth redirect_uri パターン広すぎ | Auth |
| INV-01 | memberships RLS UPDATE ポリシー確認 | Permissions |

### P2（計画的に対応）

| ID | タイトル | 種別 |
|----|---------|------|
| BUG-C04 | discord-bot 500→400 レスポンス | Config |
| BUG-C06 | BuyerLayout role チェック未実施 | Auth |
| BUG-C07 | OnboardingStripe スキップ可能 | UI |
| BUG-H04 | stopped↔draft マッピング不整合 | UI |
| BUG-H05 | ハードコード anon key | Config |
| INV-02 | pg_cron 未有効化の可能性 | Config |
| INV-05 | FastAPI バックエンドがモック残存 | Config |
| テストの穴全般 | Webhook/Discord/RLS/セキュリティテスト追加 | Test |
