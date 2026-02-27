# ファンクラブ自動運用インフラ（Stripe Connect版） - AI実装用 要件定義書

このドキュメントは、AIプログラミングエージェント（Antigravity等）がシステムを実装するための構造化された要件定義書です。実装時のアーキテクチャ設計、コンポーネント分割、およびDB設計の基準として用いてください。

---

## 1. サービス概要・コアバリュー

*   **目的**: 運営者（プラットフォーム管理者）の手作業をなくし、販売者（クリエイター）がスマホのみでファンクラブ/有料コミュニティを開設できるインフラの提供。
*   **決済手段**: Stripe Connect (Express) を利用した決済管理および自動分配。
*   **提供価値**: 購入後、Discord OAuth2連携により、限定Discordサーバーのロール（権限）を即時かつ自動で付与。サードパーティの手続きを排除。
*   **自動運用**: 決済成功・失敗・解約などのStripe Webhookイベントをトリガーにした権限の自動付与／自動剥奪。

---

## 2. 登場するアクター（SaaSモデルの3者構造）

1.  **システム (System)**
    *   Stripe Webhook処理、定期ジョブ、自動権限制御を行う。
2.  **プラットフォーム管理者 (Platform Admin / SaaS提供者)**
    *   SaaS全体の管理。SaaS利用者（販売者）のアカウント監視、システムインフラ全体の障害・Webhook監視、システムお知らせの配信を行う。
3.  **SaaS利用者 (Tenant / 販売者)**
    *   プラットフォームを利用し自身のファンクラブを運営する主体（テナント）。Stripe Expressオンボーディング、自サーバーのDiscord設定、プラン作成に加え、**自身の管轄するエンド会員の管理（突合確認、タイムライン追跡、手動例外対応、返金ルール設定）**を行う。
4.  **エンド会員 (End-User / 購入者)**
    *   該当テナント（販売者）の提供するプランを決済し、DiscordのOAuth認可・コミュニティ参加を行う。

---

## 3. システムアーキテクチャ & 技術スタック

*   **フロントエンド**: Next.js, TypeScript, Tailwind CSS
*   **バックエンド API**: FastAPI (Python)
*   **非同期ワーカー**: Celery / RQ / Dramatiq 等 (Redisを利用したJob Queue)
*   **データベース**: PostgreSQL (Supabase想定)
*   **外部API連携**: Stripe API (Checkout, Connect, Billing, Webhooks), Discord API (OAuth2, Bot API)

### 3.1. 主要なマイクロ機能コンポーネント
1.  **Platform Admin APIs**: 全テナント横断の監視、プラットフォーム全体のWebhook再試行キュー管理、お知らせ(`system_announcements`)配信を行うプラットフォーム管理用API。※一覧系APIはすべてページングとソート仕様を追加実装し、レスポンス形式は `{ items, page, page_size, total_count }` 等に統一すること。
2.  **Auth / Tenant APIs**: テナント（SaaS利用者）の登録、Stripeオンボーディング。
3.  **Plan & Member Management APIs (Tenant)**: プラン管理に加え、SaaS利用者自身がエンド会員の状態突合、タイムライン確認、手動介入（オーバーライド）、連携個別リトライを行うテナントスコープのAPI。
4.  **Checkout & Routing**: Stripe Checkout Session の生成 (メタデータによるトラッキング必須)。
5.  **Webhook Handler**: イベント受信と非同期キューへのディスパッチ。署名検証（`STRIPE_WEBHOOK_SECRET`）失敗時は開発環境でも即座に破棄・または保存のみで処理禁止とする。
6.  **Discord Integration**: OAuth2による権限認可コールバック処理とBotを用いた対象Guild/Role管理。OAuth連携時は必ず `state` パラメータ検証等のCSRF対策を実装すること。連携確定前（または完了画面）で取得したDiscord usernameを明示し、誤アカウント連携を防ぐUIフローとすること。

### 3.2. 実装すべき主要API群
*   **プラットフォーム管理者向け**:
    *   `GET /api/admin/tenants` (販売者一覧・状態監視)
    *   `GET /api/admin/system-queues` (全体のWebhook再試行等・システムレベル監視)
    *   `POST /api/admin/announcements` (お知らせ配信管理)
*   **SaaS利用者（テナント/販売者）向け**:
    *   `POST /api/sellers/onboarding-link` (Stripe Express連携)
    *   `POST /api/plans`, `PATCH /api/plans/{id}` (プラン管理、Discord Role/Guild存在・階層制約の事前検証含む)
    *   `POST /api/plans/{id}/checkout-session` (決済URL生成)
    *   `GET /api/sellers/memberships/crosscheck` (自テナントのエンド会員・突合ダッシュボード)
    *   `GET /api/sellers/memberships/{id}/timeline` (自テナントエンド会員の統合タイムライン)
    *   `POST /api/sellers/memberships/{id}/override` (自テナントエンド会員の自動剥奪停止・手動維持)
    *   `POST /api/sellers/memberships/{id}/retry` (権限付与エラー時の個別リトライ)
*   **エンド会員（購入者）向け**:
    *   `GET /api/discord/oauth/start`, `GET /api/discord/oauth/callback` (Discord連携)
    *   `POST /api/discord/relink` (再連携リクエスト)
*   **システム向け**:
    *   `POST /webhooks/stripe` (イベント受信・冪等処理・キュー投入)

---

## 4. データベース設計（主要エンティティ・状態遷移）

### 4.1. `memberships` テーブル (購読状態管理)
*   **目的**: 購入者のプラン継続状態を追跡する。状態は厳格なステートマシンで管理される。
*   **ステータス定義 (`status`)**:
    *   `pending_discord` : 課金済みだがDiscord未連携
    *   `active` : 課金有効
    *   `grace_period` : 請求失敗直後（猶予期間中/デフォルト3日）
    *   `cancel_scheduled` : ユーザーによる解約予約（Stripeのcancel_at_period_end=true時等。期間満了まで権限は維持）
    *   `payment_failed` : 最終的な請求失敗。ロール剥奪対象
    *   `canceled` : 有効期限内のユーザーまたは販売者による即時解約
    *   `expired` : 購読期間終了（cancel_scheduledからの自動移行、または単発プランの期限切れ）
    *   `refunded` : 返金完了

**[重要] 状態遷移（ステートマシン）の規約**:
```text
pending_discord → active
active → grace_period
active → cancel_scheduled
cancel_scheduled → expired (有効期間終了時)
grace_period → active
grace_period → payment_failed
active → canceled (即時解約)
canceled → expired
```

### 4.2. カラム拡張とインデックス要件
`memberships` には猶予期間と手動介入のための追加カラムをはじめ、単発受給期間用カラムなどを実装すること。
*   `grace_period_started_at`, `grace_period_ends_at`, `final_payment_failure_at`, `revoke_scheduled_at`
*   `entitlement_ends_at` (単発プラン等の権限付与期限)
*   フラグ管理: `risk_flag` (boolean), `dispute_status` (text) 等のチャージバック時の状態保持用カラムを追加。
*   DB制約: Stripeサブスクは `stripe_subscription_id` でユニーク制約を付与（NULLを除く）。
*   インデックス: `(seller_id, status)`, `(buyer_id, status)`, `(grace_period_ends_at)` 等の参照頻出カラムに対する複合インデックスを設定すること。

### 4.3. その他の主要テーブル
*   `users`, `seller_profiles`, `buyers`: アクターの基本情報。
*   `stripe_connected_accounts`: Stripe Connect状態。
*   `discord_servers`: Bot権限状態。
*   `discord_identities`: OAuth連携トークン状態。
*   `plans`: プランとDiscord Role/Guild、Stripe Product/Priceの紐付け（`deleted_at` 必須。価格変更時は新プランを作成し旧プランを論理削除とする）。
*   `role_assignments`: Role付与ステータスの実態と履歴（複合インデックス `(discord_user_id, guild_id, actual_state)` を必須で付与し、番人バッチの検索速度を担保すること）。
*   `stripe_webhook_events`: 冪等性制御のためのWebhook受信ログ。
*   `system_announcements`: 運営から販売者へのシステムお知らせ管理（title, body, starts_at, ends_at 等）。
*   `audit_logs`: 管理者・システムによるアクション履歴。

---

## 5. 外部連携仕様とビジネスロジック

### 5.1. Stripe連携とWebhook処理の拡張
*   **Connect分配方式**: Destination Charges または Separate Charges and Transfers。
    *   **実装上の要件**: サブスクリプション決済においては返金・再請求・複数分配を見据え **Separate Charges and Transfers** を第一優先候補として設計・検証すること。
*   **監視対象のWebhook拡張**:
    *   `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`
    *   `customer.subscription.updated` (ここで `cancel_at_period_end=true` なら `cancel_scheduled` 状態へ移行する)
    *   `customer.subscription.deleted`, `charge.refunded`
    *   `charge.dispute.created` / `closed` (チャージバック発生/解決イベントによる `risk_flag` 付与や即時ホールド・通知制御を考慮)

### 5.2. Discord連携仕様・競合の回避
*   **ロール付与**: OAuth2認証完了後、Botが購入者を特定のGuildにJoinさせ、Roleを付与する。(認証時はOAuth2 `state` パラメータによるCSRF防御必須)。
*   **階層制約チェック (必須実装)**: Discordの設定上、Bot自身のRole階層が、付与したい対象Roleより上位にある必要がある。
*   **ロール競合ルールの明文化**: 同一ユーザーが同一サーバー（Guild）内で複数のプランを契約している場合がある。片方のプランが解除されてDiscord Roleの剥奪を命じられた場合でも、**同一Roleを要件とする有効な別のMembershipが存在する場合はRoleの剥奪をブロック（スキップ）する**仕様を実装すること。

### 5.3. 不払い猶予と剥奪ポリシー
*   **猶予期間**: `invoice.payment_failed` 受信時、即座にDiscord Roleを剥奪**しない**。
*   ステータスを `grace_period` に遷移し、設定された日数（初期値3日）を待つ。**システム上の `grace_period_ends_at` は StripeダッシュボードのSmart Retries（自動再試行）の最終完了タイミング、または設定上の失効・`invoice.voided` と必ず同期・連携させ、Stripeがまだ再試行中なのに剥奪してしまうことがないよう実装すること。**
*   期間内に `invoice.paid` になれば `active` に復旧。失敗確定時のみ `payment_failed` とし、非同期でロール剥奪ジョブを積む。
*   **運用ポリシー**: サーバーからの「キック（追放）」はおこなわず、「対象Roleの剥奪のみ」とする。

---

## 6. 管理・運用機能の責務分離（SaaSモデルの3層構造）

安定した稼働とエンドユーザー対応のため、機能のスコープを「プラットフォーム運用」と「SaaSテナント運用」に明確に分割する。

### 6.1. SaaS利用者（販売者/テナント）向け顧客管理機能
SaaS利用者が自身のエンド会員をサポートするための機能。
1.  **エンド会員ダッシュボード (Cross-check)**: 自テナントの販売プランにおける「Stripeの課金状況 vs Discordロール付与状況」の不整合を監視・発見する（自テナント内限定）。
2.  **エンド会員統合タイムライン機能**: エンド会員からの問い合わせ対応用。対象会員に対するStripe決済・Webhook履歴・Discord操作ログを時系列で追跡する。
3.  **手動オーバーライドと再試行（例外対応）**: トラブル時に特定の自会員の自動剥奪ジョブを保留（ロール維持）する機能、および対象会員の失敗したロール付与処理を個別に再試行する機能。
4.  **返金ポリシー設定機能**: 自テナント内の返金時やチャージバック発生時の自動挙動（即時剥奪するか等）のルールを設定する機能。

### 6.2. プラットフォーム管理者向けシステム機能
サービス提供者がSaaSインフラ全体を監視・統制するためのグローバル機能。
1.  **テナント（SaaS利用者）管理**: 登録された販売者のアカウント状態監視、利用停止などの統制機能。
2.  **システム・全体キュー監視 (Global Task Queue)**: テナント単位ではなくシステム全体で発生しているWebhookエラーや、Celery等の非同期キュー全体のデッドレター・再処理管理。
3.  **日次番人バッチ (Reconciliation Daily Job)**: 全体の不整合を自動検出し、修復ジョブをシステムとしてディスパッチする。
4.  **システムお知らせ通知**: テナントのダッシュボードへ向けたシステムアラートやメンテナンスなどの全体連絡（バナー配信）を行う。

## 7. 購入者機能 (Self-Service)
安定稼働とサポートコスト削減のため、購入者向けのマイページを提供する。
*   自分の購入プラン一覧と現在の課金状態の表示
*   Discord連携状態の確認と、失敗時の「再連携（OAuth再接続）」実行UIの提供

---

## 8. AIプログラミングエージェントへの特別指示（実装方針）

この要件を満たすコードを生成する際、以下のポイントを遵守すること。

1.  **Stripe Billingの制約確認**: Checkout + Connect + Subscription における課金方式の利用可能性を実装対象のAPIバージョンに合わせて必ず検証すること。
2.  **冪等性とシグネチャによるFail Closed**: Webhook受信は完全な冪等処理（`stripe_event_id`ベース等）とし、未署名のペイロードは開発環境であっても即座に破棄またはキュー投入禁止とすること。
3.  **非同期とリトライ**: DiscordへのRole操作や重いDB整合処理はブロッキングさせず、非同期タスクキューに投げてバックオフ・リトライを実装すること。
4.  **秘密管理とデータ保護機能**: OAuthトークンやStripe/DiscordのAPIキーは暗号化し平文ロギングを禁止する。保持期間ポリシーに沿って退会時の匿名化・PII削除が可能な設計を持たせること。
5.  **相関IDと監査ログ**: Webhookの `event_id` 起点の `correlation_id` や `job_id` 等を伝搬させ、タイムライン追跡可能にすること。監査ログ(`audit_logs`)の `action` 名は汎用文字列にせず DBの CHECK 制約かアプリ層の ENUM バリデーションを用いて列挙値として管理すること。
6.  **ドメインモデル中心の設計**: Membershipのステート（猶予、予約解約等のステートマシンモデル）移行や、単発プランの期限日(`entitlement_ends_at`)判定・ロール競合制御などをAPI上に散財させず、ドメイン層・サービスクラスに集約すること。

---
[EOF]
