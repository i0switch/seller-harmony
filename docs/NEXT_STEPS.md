# 今後の開発ステップ (Next Actions)

要件定義書（`要件定義.txt`, `要件定義_ai_optimized.md`）と現在のソースコード（MockベースのFrontend / FastAPI初期バックエンド）の差分を分析し、完全なSaaS運用へと移行するためのシステム実装ロードマップを作成しました。

現在のコードベースはフロントエンドでのエラー（TypeScriptのany等）、依存関係、テストを完了し「Phase 1: UIとモックデータによる検証・正常動作テスト」が完璧に終わっている段階にあります。（いただいた修正である import パスや必須プロパティの補完、ビルドエラー８件の解消についても、すべて `npm run lint`, `npm run build`, `npm run test` でPASSすることを確認いたしました）。

今後は以下の順序でバックエンドとインフラの本格実装へ進みます。

---

## 🚀 フェーズ 1: データベースと認証基盤の構築 (Supabase)

1. **DBスキーマ設計とマイグレーション機能構築**
   - 要件定義に準拠したテーブル群の設計とスキーマ適用 (`users`, `seller_profiles`, `stripe_connected_accounts`, `discord_servers`, `plans`, `memberships`, `role_assignments`, `stripe_webhook_events`, `system_announcements`, `audit_logs`)。
   - SupabaseにおけるRow Level Security (RLS)の設計。
2. **認証フローの実装 (Supabase Auth)**
   - フロントエンドのダミー認証 (`useSellerAuth`, `usePlatformAuth`等) をSupabase Authへ置き換え。
   - バックエンド (FastAPI) でJWTを検証し認可コンテキストを発行するMiddlewareの実装。

## 🚀 フェーズ 2: コア外部APIとの連携（Stripe & Discord / FastAPI）

1. **Stripe Connect & Checkout API**
   - `POST /api/sellers/onboarding-link`: Stripe Expressオンボーディング用リンクの生成と口座メタデータの管理。
   - プラン作成完了時のStripe Product/Price同期。
   - `POST /api/plans/{id}/checkout-session`: Checkoutセッション（メタデータにuser/planを含める）の生成。
2. **Discord OAuth2 & Bot API権限マネージャー**
   - `GET /api/discord/oauth/start` & `callback`: エンド会員のOAuth同期（CSRF防止用の`state`検証含む）。
   - Discord Botを用いたGuild Role取得、および自身（Bot）と対象Roleの相対階層の検証アルゴリズムの実装（`bot_permission_status: ok | insufficient` の判定）。

## 🚀 フェーズ 3: 非同期キューと状態遷移の構築（Webhook Worker）

1. **非同期Worker / ジョブキューの導入**
   - Celery / Dramatiq / ARQのいずれかと Redis を利用したバックグラウンド処理用ワーカーの設定。
   - 重いAPI呼び出し（Discordロール付与等）やWebhook処理をキューイング。
2. **Stripe Webhookハンドラーと「Fail Closed」な署名検証**
   - `POST /webhooks/stripe` の実装。未署名での実行をを即時破棄する厳格なペイロード検証。
   - イベントをキューへ投入し、同一イベントIDによる冪等性（二重処理防止）を実装。
3. **Membership ステートマシンの実装（要件 4.1）**
   - 猶予期間（`grace_period`）、予約解約（`cancel_scheduled`）、即時解約等の複雑なビジネスロジックをカプセル化するドメインサービス構築。

## 🚀 フェーズ 4: 実APIの統合と例外リカバリー機能・バッチ処理

1. **フロントエンド実APIへの全面切り替え**
   - `src/services/api/http/*.ts` 内にある未実装エンドポイントを呼び出しへ入れ替え。
   - `import.meta.env.VITE_USE_MOCK_API` フラグを解除し、実働環境での動作テスト。
2. **テナント向け手動介入・管理機能APIの実装**
   - 例外対応（ロール強制維持 `オーバーライド` 等）およびダッシュボード上でのタイムライン統合履歴取得エンドポイントとエラーハンドリング実装。
3. **日次番人バッチ (Reconciliation Daily Job)**
   - 毎日特定時刻に自動起動し、DB上の `memberships(active/grace_period)` と Discord 上の実Role、および Stripe 上の Subscription を三次元で突合する監査ロジックの開発。

---

### 🔥 次のアクションに対するご提案
これらの作業を行う上で、**SaaSデータベース設計モデルとなる「Supabaseデータベース構築とスキーマ定義」**から着手することを推奨します。

準備が整っていれば、`Supabaseのプロジェクト作成またはSQLマイグレーション定義` を自動で進行してよろしいでしょうか？
