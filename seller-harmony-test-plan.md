# seller-harmony テスト計画書

**作成日**: 2026-03-02  
**対象リポジトリ**: https://github.com/i0switch/seller-harmony  
**ホスト環境**: https://preview--member-bridge-flow.lovable.app/  
**担当**: Claw-Empire エージェント群

---

## 1. 環境情報

### テストアカウント

| 役割 | メールアドレス | パスワード |
|------|--------------|-----------|
| プラットフォーム管理者 | i0switch.g@gmail.com | pasowota427314s |
| テスト販売者（セラー） | i0switch.g+test01@gmail.com | pasowota427314s |
| テスト購入者（バイヤー） | 都度新規作成 または ゲスト |

### 外部サービス

| サービス | URL / 識別子 |
|---------|------------|
| Supabase プロジェクト | https://supabase.com/dashboard/org/qlzawfnpwymbqimgneoz / `xaqzuevdmeqxntvhamce` |
| Stripe ダッシュボード（テスト） | https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/dashboard |
| Lovable プレビュー | https://preview--member-bridge-flow.lovable.app/ |

### Supabase Edge Functions 一覧

| 関数名 | 機能 | 主要エンドポイント |
|--------|------|------------------|
| `stripe-checkout` | Checkout Session 作成 | POST `/stripe-checkout` |
| `stripe-webhook` | Webhook イベント処理（7イベント対応） | POST `/stripe-webhook` |
| `stripe-onboarding` | Stripe Connect オンボーディングリンク生成 | POST `/stripe-onboarding` |
| `discord-oauth` | Discord OAuth コールバック処理 | GET/POST `/discord-oauth` |
| `discord-bot` | Bot 権限検証・ロール操作 | POST `/discord-bot` |

### Discord テスト環境

| 項目 | 値 | 備考 |
|------|---|------|
| テスト用 Discord サーバー名 | （要記入） | テスト専用サーバーを推奨 |
| Guild ID | （要記入） | サーバー設定 → ウィジェットから取得 |
| テスト用 Role ID | （要記入） | サーバー設定 → ロール → 開発者モードでコピー |
| Bot アプリケーション ID | （要記入） | Discord Developer Portal |
| Bot Token Secret 名 | `DISCORD_BOT_TOKEN` | Supabase Edge Function Secrets に設定 |
| テスト用 Discord アカウント | （要記入） | バイヤー役として OAuth 承認に使用 |
| Bot 招待URL | `https://discord.com/oauth2/authorize?client_id=<BOT_ID>&permissions=268435456&scope=bot` | `MANAGE_ROLES` 権限 |

> **セットアップ手順**: Bot をテストサーバーに招待 → Bot のロール順位をテスト用ロールより上に設定 → Guild ID / Role ID を `.env` に記入

### 技術スタック

- **フロント**: Vite + React + TypeScript + shadcn/ui + Tailwind CSS
- **バックエンド**: Supabase Edge Functions（Deno）
- **認証**: Supabase Auth
- **決済**: Stripe Connect Express（プラットフォームモデル）
- **Discord連携**: Discord Bot API（ロール付与・剥奪）
- **テストフレームワーク**: Vitest（ユニット）/ Playwright（E2E）

### Stripe Connect アーキテクチャ

```
プラットフォーム（seller-harmony）  ← Stripe Secret Key: sk_test_...
  │
  ├─ Connected Account（Express）    ← セラーごとに 1 アカウント
  │    ├─ capabilities: card_payments ✔ / transfers ✔
  │    ├─ charges_enabled: true（審査完了後）
  │    └─ payouts_enabled: true（審査完了後）
  │
  ├─ Checkout Session
  │    ├─ mode: 'subscription' | 'payment'（one_time）
  │    ├─ stripeAccount: <connected_account_id>  ← セラーの Connected Account 上で作成
  │    ├─ payment_intent_data.application_fee_amount（一回払い）
  │    └─ subscription_data.application_fee_percent（サブスク）
  │
  └─ Webhook
       └─ エンドポイント: stripe-webhook Edge Function
           ├─ 署名検証 → fail-closed
           └─ 冪等性保証（stripe_event_id 重複チェック）
```

#### Stripe Connect フロー詳細

| ステップ | 処理 | Edge Function | DB テーブル |
|---------|------|---------------|------------|
| 1. アカウント作成 | `stripe.accounts.create({ type: 'express' })` | `stripe-onboarding` | `stripe_connected_accounts` |
| 2. オンボーディング | `stripe.accountLinks.create()` → Stripe Express フォーム | `stripe-onboarding` | — |
| 3. 審査完了 | Stripe 側で KYC 完了 → `charges_enabled = true` | — | `stripe_connected_accounts` |
| 4. Checkout 作成 | `stripe.checkout.sessions.create({ stripeAccount })` | `stripe-checkout` | — |
| 5. 決済完了 | `checkout.session.completed` Webhook | `stripe-webhook` | `memberships`, `stripe_webhook_events` |
| 6. 手数料徴収 | `application_fee_amount` / `application_fee_percent` | `stripe-checkout` | — |

#### Connected Account ステータス遷移（UI 表示）

```
not_started → pending → verified
                 ↓
             restricted（追加書類要求時）
```

| `stripe_connected_accounts` カラム | UI ステータス | 条件 |
|-----------------------------------|-------------|------|
| `charges_enabled && payouts_enabled` | ✅ 有効（verified） | KYC + 口座登録完了 |
| `details_submitted && !charges_enabled` | ⏳ 審査中（pending） | フォーム送信済み・審査待ち |
| `!details_submitted` | 未開始（not_started） | オンボーディング未着手 |
| `requirements_due IS NOT NULL` | ⚠️ 制限あり（restricted） | Stripe が追加情報を要求 |

#### 手数料計算ロジック

```typescript
// one_time（一回払い）の場合
application_fee_amount = Math.round(plan.price * fee_rate_bps / 10000)
// → 例: ¥300 × 1000bps / 10000 = ¥30

// subscription（月額・年額）の場合
application_fee_percent = fee_rate_bps / 100
// → 例: 1000bps / 100 = 10%

// fee_rate_bps のデフォルト: 1000（= 10%）
// seller_profiles.platform_fee_rate_bps で上書き可能
```

---

## 2. テスト実行方法の種別

### 方法 A: Playwright 自動E2E（ローカル）

```bash
# E2Eテスト全件実行
npm run e2e

# ホスト環境（Lovable）向け
npm run e2e:hosted

# 認証状態キャプチャ（初回のみ）
npm run e2e:hosted:auth
```

**適用範囲**: UIの表示・遷移・フォームバリデーション・認証フロー

---

### 方法 B: Playwright 自動E2E（Lovable ホスト環境）

`playwright.hosted.config.ts` を使用。  
ベースURL: `https://preview--member-bridge-flow.lovable.app`  
認証状態: `.auth/lovable-hosted-state.json`（`e2e:hosted:auth` で事前取得）

**適用範囲**: 実際のSupabase/Stripe接続を伴うフル統合テスト

---

### 方法 C: Stripe CLI（Webhook イベントトリガー）

```bash
# Webhookフォワード開始（ローカル開発時）
npm run stripe:listen
# = stripe listen --forward-to <Supabase Edge Function URL>

# 本番（Lovable + Supabase）向けWebhookテスト
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
stripe trigger charge.refunded
stripe trigger charge.dispute.created
```

**適用範囲**: Supabase Edge Function `stripe-webhook` の動作検証

---

### 方法 D: Antigravity + Stripe MCP（API レベル）

Stripe MCP 接続済みの Antigravity を使い、Stripe ダッシュボードの操作・データ確認を自動化。

**適用範囲**:
- テスト用 Stripe Connected Account の作成・確認
- 決済レコード・Subscription の状態確認
- 手数料（application_fee）の確認

---

### 方法 E: 実ブラウザ手動操作

実際のブラウザ（Chrome）で Lovable プレビュー環境を操作し、ユーザー目線での動作を確認。  
スクリーンショット・動画を記録。

**適用範囲**:
- Stripe Checkout の実画面（カード入力 → 決済）
- Discord OAuth フロー（実ブラウザでの OAuth リダイレクト）
- Stripe Connect オンボーディング（外部 Stripe フォーム）
- エラー画面・エッジケースの目視確認

---

### 方法 F: Claw-Empire エージェント タスク実行

Claw-Empire API 経由でエージェントにタスクを投入し、コード修正・テスト実行・レポート生成を自動化。

| エージェント | 担当 |
|-------------|------|
| ヒナタ 🗂️ | 全体統制・進捗管理・レポート集約 |
| ハヤト 🛠️ | ユニットテスト・APIテスト実装・修正 |
| タケル 🧠 | テスト設計・統合テスト・コードレビュー |
| リン ✅ | E2Eテスト実行・受け入れテスト |
| ソラ 📊 | テスト計画・優先度・カバレッジ分析 |
| ミク 🎨 | UIビジュアル確認・レスポンシブテスト |
| カイト 🛡️ | セキュリティテスト・Webhook 署名検証 |
| アキラ 🔍 | 回帰テスト・バグ再現・デバッグ |

---

## 3. テスト項目一覧

### フェーズ 1: 認証基盤の確立（前提条件）

#### F1-01: Lovable ホスト環境の認証状態キャプチャ

- **方法**: 方法B（Playwright `e2e:hosted:auth`）
- **担当**: タケル
- **手順**:
  1. `npm run e2e:hosted:auth` を実行
  2. 開いたブラウザで `i0switch.g+test01@gmail.com` でログイン
  3. `.auth/lovable-hosted-state.json` に保存されたことを確認
- **確認**: 以降の `e2e:hosted` がログイン済み状態で動作する

#### F1-02: 既存アカウントでのログイン動作確認（手動）

- **方法**: 方法E（実ブラウザ手動）
- **担当**: リン
- **手順**:
  1. https://preview--member-bridge-flow.lovable.app/seller/login を開く
  2. `i0switch.g+test01@gmail.com` / `pasowota427314s` でログイン
  3. ダッシュボードへリダイレクトされることを確認
  4. セッション保持確認（リロード後も維持）
- **確認**: ログイン成功 / ダッシュボード表示 / セッション維持

---

### フェーズ 2: セラーオンボーディング（Stripe Connect 含む実動作）

#### F2-01: セラープロフィール設定・保存

- **方法**: 方法B（Playwright ホスト） + 方法E（実ブラウザ確認）
- **担当**: ハヤト
- **手順**:
  1. ログイン済みセラーで `/seller/onboarding/profile` にアクセス
  2. 表示名・サービス名・メールを入力して「保存して次へ」
  3. Supabase `seller_profiles` テーブルにレコードが作成されたことを確認
- **確認**: DBレコード作成 / 次ステップへ遷移

#### F2-02: Stripe Connect Express オンボーディング（実動作）

- **方法**: 方法E（実ブラウザ手動）+ 方法D（Stripe MCP 確認）
- **担当**: カイト + （Stripe MCP）
- **前提**: Stripe テストモードで Connected Account の自動承認が有効（Stripe ダッシュボード → Settings → Connect → Express → 自動承認）
- **手順**:
  1. `i0switch.g+test01@gmail.com` でログイン
  2. `/seller/onboarding/stripe` を開く
  3. ステータスバッジが「未開始」であることを確認
  4. 「Stripeオンボーディングを開始」をクリック
  5. Edge Function `stripe-onboarding` が呼ばれ、以下が実行されることを確認：
     - `stripe.accounts.create({ type: 'express', capabilities: { card_payments, transfers } })`
     - `stripe_connected_accounts` テーブルに `account_type = 'express'` で INSERT
     - `stripe.accountLinks.create()` で生成された URL にリダイレクト
  6. **Stripe Express フォーム**で以下を入力（テストモード）：
     - 事業形態: 個人事業主
     - 国: 日本（JP）
     - テスト用電話番号: `000-0000-0000`
     - テスト用銀行口座: ルーティング `1100-000`、口座 `0001234`
  7. フォーム完了後 `/seller/onboarding/discord`（return_url）にリダイレクトされることを確認
  8. Supabase `stripe_connected_accounts` テーブルを確認：
     - `stripe_account_id` が `acct_` で始まること
     - `charges_enabled = true`
     - `payouts_enabled = true`
     - `details_submitted = true`
  9. Stripe ダッシュボードで Connected Account の状態を確認（`active`）
  10. `/seller/dashboard` に戻り、Stripe Connect ステータスバッジが「有効」に変わっていることを確認
- **確認**:
  - Express アカウント作成 / DB レコード作成
  - Stripe Express フォーム完走
  - return_url (`/seller/onboarding/discord`) へのリダイレクト
  - Dashboard ステータス「有効」表示

#### F2-02a: Stripe Connect オンボーディング中断 → 再開

- **方法**: 方法E（実ブラウザ手動）
- **担当**: カイト
- **手順**:
  1. F2-02 の手順 4 まで実行（Stripe Express フォームが開く）
  2. フォームを**完了せずにブラウザバック** or タブを閉じる
  3. 再度 `/seller/onboarding/stripe` を開く
  4. 「Stripeオンボーディングを再開」ボタンが表示されることを確認
  5. クリック → 既存の `stripe_account_id` に対して新しい `accountLinks.create()` が呼ばれること
  6. 新しい Stripe Express フォーム URL にリダイレクトされること
  7. フォームを完了できること
- **確認**: 中断後も同一 Connected Account で再開可能 / 新規アカウントが**二重作成されない**

#### F2-02b: Stripe Connect 審査状態の UI 反映

- **方法**: 方法E（実ブラウザ手動）+ Supabase SQL
- **担当**: ハヤト
- **手順**:
  1. `stripe_connected_accounts` の `charges_enabled` / `payouts_enabled` / `details_submitted` をSQL で手動変更し、各ステータスのUI表示を確認：
     - `details_submitted = false` → 「未開始」バッジ
     - `details_submitted = true, charges_enabled = false` → 「審査中」バッジ
     - `charges_enabled = true, payouts_enabled = true` → 「有効」バッジ
  2. ダッシュボード `/seller/dashboard` の Stripe Connect ステータスカードが正しく更新されることを確認
- **確認**: 4 つの UI ステータス（not_started / pending / verified / restricted）が正しくマッピングされる

#### F2-02c: Stripe Connect — capabilities 確認

- **方法**: 方法D（Stripe MCP / Stripe CLI）
- **担当**: カイト
- **手順**:
  ```bash
  # Connected Account の capabilities を確認
  stripe accounts retrieve <acct_id> --stripe-account=<acct_id> \
    | jq '.capabilities'
  ```
- **確認**:
  - `card_payments: 'active'`
  - `transfers: 'active'`
  - capabilities が `inactive` / `pending` の場合、Checkout Session 作成が失敗することを確認

#### [x] F2-03: Discord サーバー設定（UIテスト）

- **方法**: 方法A（Playwright ローカル）
- **担当**: ハヤト
- **手順**:
  1. `/seller/onboarding/discord` にアクセス
  2. テスト用 Guild ID・Role ID を入力して検証
  3. 検証結果バッジ（OK/NG）の表示確認
- **確認**: 検証ロジックが呼ばれ結果が表示される

---

### フェーズ 3: プラン作成 → 公開

#### [x] F3-01: プラン作成（月額・年額・一回払い）

- **方法**: 方法B（Playwright ホスト）+ 方法E（実ブラウザ確認）
- **担当**: ハヤト
- **テストデータ**:

| プラン名 | 種別 | 金額 | Discord ロールID |
|---------|------|------|-----------------|
| ベーシックプラン | 月額 | ¥500 | （任意） |
| プレミアムプラン | 月額 | ¥1,000 | （テスト用ロールID） |
| 年間プラン | 年額 | ¥9,800 | （任意） |
| 単品コンテンツ | 一回払い | ¥300 | なし |

- **手順**:
  1. `/seller/plans/new` でプランを各種作成
  2. 作成後、`plans` テーブルに正しくレコードが入ることを確認
  3. プランを「公開」状態にする
- **確認**: 各種別のプラン作成 / DB 反映 / 公開状態

#### F3-02: バイヤー向け購入URL 生成・アクセス

- **方法**: 方法E（実ブラウザ手動）
- **担当**: リン
- **手順**:
  1. 作成済みプランの購入リンクを取得
  2. 別ブラウザ（シークレットモード）でリンクにアクセス
  3. 購入ページが表示されることを確認
- **確認**: 未ログイン状態でプラン詳細が表示される

---

### フェーズ 4: 購入フロー E2E（メインテスト）

#### F4-01: 正常決済フル E2E（月額サブスクリプション）

- **方法**: 方法E（実ブラウザ手動）+ 方法D（Stripe MCP 確認）+ Supabase ダッシュボード確認
- **担当**: リン（ブラウザ操作）+ カイト（DB確認）
- **手順**:
  1. シークレットモードで購入リンクにアクセス（本アプリにはバイヤー専用サインアップ画面は存在しない。購入フローはゲスト購入 or Stripe Checkout 内でメール入力）
  2. テスト販売者 `i0switch.g+test01@gmail.com` のプラン購入ページを開く
  3. 「購入する」をクリック → Stripe Checkout にリダイレクト
  4. テストカード `4242 4242 4242 4242` / 有効期限 `12/28` / CVC `424` で決済
  5. `/checkout/success` に遷移することを確認
  6. Supabase `memberships` テーブル: `status = 'active'` を確認
  7. Supabase `stripe_webhook_events` テーブル: `checkout.session.completed` が `processed` を確認
  8. Stripe ダッシュボードで Subscription が `active` 状態を確認
- **確認**: 決済成功 / membership 作成 / Webhook 処理完了

#### F4-02: 正常決済（一回払い）

- **方法**: 方法E（実ブラウザ手動）
- **担当**: リン
- **手順**: F4-01 と同様。一回払いプランで実施
- **確認**: `payment` モードで Checkout が動作 / `memberships` に `status = 'active'`

#### F4-03: 残高不足カードによる決済失敗

- **方法**: 方法E（実ブラウザ手動）
- **担当**: アキラ
- **使用カード**: `4000 0000 0000 9995`（残高不足）
- **手順**:
  1. Stripe Checkout でカード `4000000000009995` を入力
  2. 決済失敗の Stripe エラーが表示されることを確認
  3. ページが `/checkout/success` に遷移しないことを確認
  4. `memberships` テーブルにレコードが作成されないことを確認
- **確認**: Stripe エラー表示 / トランザクション未作成

#### F4-04: 3D セキュア認証フロー

- **方法**: 方法E（実ブラウザ手動）
- **担当**: アキラ
- **使用カード**: `4000 0027 6000 3184`（3D セキュア必須）
- **手順**:
  1. Stripe Checkout でカードを入力
  2. 3D セキュア認証モーダルが表示されることを確認
  3. 「Authorize Test Payment」で認証
  4. `/checkout/success` に遷移することを確認
- **確認**: 3DS フロー完走 / 決済成功

#### F4-05: カード拒否

- **方法**: 方法E（実ブラウザ手動）
- **担当**: アキラ
- **使用カード**: `4000 0000 0000 0002`（拒否）
- **確認**: 決済失敗エラー表示 / データ未作成

---

### フェーズ 5: Stripe Webhook イベントテスト

> **実行方法**: Stripe CLI でイベントを直接 Supabase Edge Function に送信し、DB の状態変化を確認する

#### W-01: `checkout.session.completed` → membership 作成

- **方法**: 方法C（Stripe CLI トリガー）+ Supabase ダッシュボード確認
- **担当**: カイト
- **手順**:
  ```bash
  stripe trigger checkout.session.completed \
    --add checkout_session:metadata.buyer_id=<テストUserID> \
    --add checkout_session:metadata.plan_id=<テストPlanID> \
    --add checkout_session:metadata.seller_id=<テストSellerID>
  ```
- **確認**:
  - `memberships.status = 'active'`（Discord連携済みユーザーの場合）
  - `memberships.status = 'pending_discord'`（Discord未連携の場合）
  - `stripe_webhook_events.processing_status = 'processed'`
  - `audit_logs` にレコード追加

#### W-02: `invoice.payment_failed` → grace_period 遷移

- **方法**: 方法C（Stripe CLI）
- **担当**: カイト
- **手順**:
  ```bash
  stripe trigger invoice.payment_failed
  ```
- **確認**:
  - `memberships.status = 'grace_period'`
  - `grace_period_started_at` に現在時刻
  - `grace_period_ends_at` に現在 + 3日

#### W-03: `invoice.payment_succeeded`（grace_period 中の回復）

- **方法**: 方法C（Stripe CLI）
- **担当**: カイト
- **前提**: W-02 実行後（grace_period 状態のメンバーシップが存在）
- **手順**:
  ```bash
  stripe trigger invoice.payment_succeeded
  ```
- **確認**:
  - `memberships.status = 'active'` に回復
  - `grace_period_started_at = null`
  - `grace_period_ends_at = null`

#### W-04: `customer.subscription.updated`（キャンセル予約）

- **方法**: 方法C（Stripe CLI）
- **担当**: カイト
- **手順**:
  ```bash
  stripe trigger customer.subscription.updated \
    --add subscription:cancel_at_period_end=true
  ```
- **確認**:
  - `memberships.status = 'cancel_scheduled'`
  - `revoke_scheduled_at = current_period_end`

#### W-05: `customer.subscription.deleted` → キャンセル + Discordロール剥奪

- **方法**: 方法C（Stripe CLI）
- **担当**: カイト
- **手順**:
  ```bash
  stripe trigger customer.subscription.deleted
  ```
- **確認**:
  - `memberships.status = 'canceled'`
  - `entitlement_ends_at` に現在時刻
  - Discord でロールが剥奪されることを確認（方法E: Discord サーバーで目視）
  - `manual_override = true` の場合はロール剥奪されないこと

#### W-06: `charge.refunded` → 返金処理

- **方法**: 方法C（Stripe CLI）
- **担当**: カイト
- **手順**:
  ```bash
  stripe trigger charge.refunded
  ```
- **確認**:
  - `memberships.status = 'refunded'`
  - Discord ロール剥奪

#### W-07: `charge.dispute.created` → リスクフラグ

- **方法**: 方法C（Stripe CLI）
- **担当**: カイト
- **手順**:
  ```bash
  stripe trigger charge.dispute.created
  ```
- **確認**:
  - `memberships.risk_flag = true`
  - `memberships.dispute_status = 'needs_response'`
  - `audit_logs` にレコード追加

#### W-08: 冪等性テスト（同一 stripe_event_id の重複送信）

- **方法**: 方法C（Stripe CLI）+ カスタムスクリプト
- **担当**: カイト
- **手順**:
  1. 任意のイベントを送信して `stripe_event_id` を取得
  2. 同一 `stripe_event_id` で Edge Function に再度リクエストを送信（`curl` で直接）
  3. レスポンスが `{ received: true, duplicate: true }` であることを確認
  4. DB のレコードが1件のままであることを確認
- **確認**: 重複処理防止ロジックが動作する

#### W-09: Webhook 署名改ざんテスト（セキュリティ）

- **方法**: 方法D（Antigravity / curl 直接）
- **担当**: カイト
- **手順**:
  ```bash
  curl -X POST <Edge Function URL>/stripe-webhook \
    -H "Content-Type: application/json" \
    -H "Stripe-Signature: t=invalid,v1=tampered" \
    -d '{"type":"checkout.session.completed"}'
  ```
- **確認**: レスポンス `400` が返ること（fail-closed 動作）

#### W-10: `Stripe-Signature` ヘッダーなしリクエスト

- **方法**: 方法D（curl 直接）
- **担当**: カイト
- **手順**:
  ```bash
  curl -X POST <Edge Function URL>/stripe-webhook \
    -H "Content-Type: application/json" \
    -d '{"type":"checkout.session.completed"}'
  ```
- **確認**: レスポンス `400 Missing Stripe-Signature header`

---

### フェーズ 6: Discord ロール付与 / 剥奪テスト

#### D-01: 購入完了後 Discord OAuth 連携 → ロール付与

- **方法**: 方法E（実ブラウザ手動）
- **担当**: リン（ブラウザ操作）+ カイト（Discord確認）
- **前提**: F4-01 で購入済みのバイヤーアカウントが存在
- **手順**:
  1. `/checkout/success` で「Discordを連携する」をクリック
  2. Discord OAuth フローを実行（テスト用 Discord アカウントで承認）
  3. `/buyer/discord/confirm` でアカウント確認
  4. 「このアカウントで連携する」をクリック
  5. 連携完了 → `discord_identities` テーブルにレコード確認
  6. Discord サーバーで該当ユーザーにロールが付与されていることを目視確認
- **確認**: Discord ロール付与 / DB レコード作成 / `memberships.status = 'active'` に更新

#### D-02: `pending_discord` 状態 → 後からDiscord連携でロール付与

- **方法**: 方法E（実ブラウザ手動）
- **担当**: リン
- **前提**: Discord 未連携で購入完了（`memberships.status = 'pending_discord'`）
- **手順**:
  1. マイページから Discord 連携を後から実施
  2. 連携後に `assignDiscordRole` が呼ばれるか確認
- **確認**: 遅延連携でもロールが付与される

#### D-03: サブスク解約 → Discord ロール剥奪

- **方法**: 方法C（Stripe CLI、W-05 と連動）+ 方法E（Discord目視）
- **担当**: カイト
- **確認**: Discord サーバーでロールが削除されていることを目視確認

#### D-04: Conflict Check（同一ロール付与の複数プランが存在する場合の剥奪スキップ）

- **方法**: 方法C（Stripe CLI）+ Supabase SQL
- **担当**: タケル
- **手順**:
  1. 同じ `discord_role_id` を持つプランAとプランBを作成
  2. バイヤーが両方を購入（A と B が `active`）
  3. プランAのサブスクを削除（W-05 トリガー）
  4. プランB がまだ `active` → ロール剥奪されないことを確認
  5. プランBのサブスクも削除
  6. ロールが剥奪されることを確認
- **確認**: Conflict Check ロジックが正しく動作する

#### D-05: Discord 未連携 Webhook 処理（エラーをキャッチして 200 返却）

- **方法**: 方法C（Stripe CLI、Discord 設定なし環境で）
- **担当**: カイト
- **確認**: `assignDiscordRole` でエラーが発生しても Webhook 全体は `200` を返す

---

### フェーズ 7: プラットフォーム手数料テスト（Stripe Connect）

#### P-01: 一回払いの `application_fee_amount` 検証

- **方法**: 方法D（Stripe MCP / Stripe ダッシュボード確認）
- **担当**: カイト
- **前提**: F4-02（一回払い ¥300）が完了済み
- **手順**:
  1. F4-02 で実施した決済の Stripe Payment をダッシュボードで開く
  2. `application_fee_amount` が `price * fee_rate_bps / 10000` と一致することを確認
     - 例: ¥300 × 1000bps / 10000 = **¥30**
  3. セラーの Connected Account に `¥300 - ¥30 = ¥270` が分配されていることを確認
  4. プラットフォーム側に `¥30` が手数料として記録されていることを確認
  ```bash
  # Stripe MCP or CLI で確認
  stripe payments list --stripe-account=<connected_account_id> --limit=1
  stripe application_fees list --limit=1
  ```
- **確認**: `application_fee_amount = Math.round(price * fee_rate_bps / 10000)`

#### P-02: サブスクリプションの `application_fee_percent` 検証

- **方法**: 方法D（Stripe MCP）
- **担当**: カイト
- **前提**: F4-01（月額 ¥500 サブスク）が完了済み
- **手順**:
  1. Stripe Subscription オブジェクトの `application_fee_percent` を確認
  2. `fee_rate_bps / 100` と一致することを確認（デフォルト: 1000bps → **10%**）
  3. 毎月の invoice 決済時に正しいパーセンテージが適用されていることを確認
  ```bash
  # Subscription の手数料率を確認
  stripe subscriptions list --stripe-account=<connected_account_id> --limit=1 \
    | jq '.[0].application_fee_percent'
  # → 10.0 が返ること
  ```
- **確認**: `subscription_data.application_fee_percent = fee_rate_bps / 100`

#### P-03: seller_profiles.platform_fee_rate_bps カスタム手数料率

- **方法**: 方法D（Supabase SQL + Stripe MCP）
- **担当**: カイト + ソラ
- **手順**:
  1. `seller_profiles` の `platform_fee_rate_bps` を `500`（5%）に変更
  2. 新しい Checkout Session を作成
  3. `application_fee_percent = 5.0`（サブスク）or `application_fee_amount = price * 500 / 10000`（一回払い）になることを確認
  4. テスト後、`platform_fee_rate_bps` を元の `1000` に戻す
- **確認**: セラーごとの手数料率カスタマイズが機能する

#### P-04: Connected Account 上での Checkout Session 作成確認

- **方法**: 方法D（Stripe MCP / curl）
- **担当**: カイト
- **手順**:
  1. `stripe-checkout` Edge Function を呼び出し
  2. 返された Checkout Session URL が `checkout.stripe.com` のドメインであること
  3. Session オブジェクトの `stripeAccount` がセラーの Connected Account ID と一致すること
  ```bash
  # Checkout Session がセラーのアカウント上に作成されていることを確認
  stripe checkout sessions list --stripe-account=<connected_account_id> --limit=1
  ```
- **確認**: Checkout Session がプラットフォームではなく Connected Account 上に作成されている

#### P-05: Connected Account 未登録セラーでの Checkout 拒否

- **方法**: 方法D（curl 直接）
- **担当**: カイト
- **手順**:
  1. `stripe_connected_accounts` にレコードがないセラーのプランIDで Checkout を試行
  ```bash
  curl -X POST <Edge Function URL>/stripe-checkout \
    -H 'Authorization: Bearer <buyer_token>' \
    -H 'Content-Type: application/json' \
    -d '{"plan_id":"<plan_without_connect>"}'
  ```
  2. レスポンスが `400 Seller has no Stripe account` であることを確認
- **確認**: Connected Account なしではチェックアウトできない（安全な fail-closed）

---

### フェーズ 8: プラットフォーム管理者機能テスト

#### A-01: 管理者ログイン・全セラー一覧表示

- **方法**: 方法E（実ブラウザ手動）
- **担当**: ソラ
- **手順**:
  1. `i0switch.g@gmail.com` で `/platform/login` からログイン
  2. 管理者ダッシュボード `/platform/dashboard` にアクセス
  3. `/platform/tenants` でセラー一覧が表示されることを確認
  4. `/platform/tenants/:id` でセラー詳細・メンバーシップ一覧が表示されることを確認
  5. `/platform/webhooks` で Webhook イベント履歴が表示されることを確認
  6. `/platform/retry-queue` でリトライキューが表示されることを確認
  7. `/platform/announcements` でお知らせ管理ができることを確認
  8. `/platform/system-control` でシステム制御画面が表示されることを確認
- **確認**: 管理者権限でのアクセス / 全 7 サブページの表示 / データ表示

#### A-02: `manual_override` フラグの有効化（ロール剥奪スキップ設定）

- **方法**: 方法E（実ブラウザ手動）+ Supabase ダッシュボード確認
- **担当**: ソラ
- **手順**:
  1. 対象メンバーシップの `manual_override` を管理画面から `true` に設定
  2. W-05（`customer.subscription.deleted`）を実行
  3. Discord ロールが剥奪されないことを確認
- **確認**: `manual_override` が正しく機能する

#### A-03: `audit_logs` の確認

- **方法**: 方法E（実ブラウザ手動）+ Supabase ダッシュボード
- **担当**: ソラ
- **確認**: 各操作（create/update/cancel/revoke_role/refund/dispute）のログが記録されている

---

### フェーズ 9: セキュリティテスト

#### S-01: 未認証での保護ルートへのアクセス

- **方法**: 方法A（Playwright）
- **担当**: カイト
- **テスト対象**:
  - `/seller/dashboard` → `/seller/login` へリダイレクト
  - `/seller/plans` → `/seller/login` へリダイレクト
  - `/platform/dashboard` → `/platform/login` へリダイレクト
  - `/platform/tenants` → `/platform/login` へリダイレクト
  - `/platform/webhooks` → `/platform/login` へリダイレクト
  - `/member/me` → 認証エラーまたはリダイレクト
- **確認**: 認証ガードが全ルートで機能している

#### S-02: 認証なしでの Checkout Edge Function 呼び出し

- **方法**: 方法D（curl 直接）
- **担当**: カイト
- **手順**:
  ```bash
  curl -X POST <Edge Function URL>/stripe-checkout \
    -H "Content-Type: application/json" \
    -d '{"plan_id":"some-id"}'
  ```
- **確認**: `401 Unauthorized` が返ること

#### S-03: 存在しない `plan_id` でのチェックアウト

- **方法**: 方法D（curl）
- **担当**: カイト
- **確認**: `400 Plan not found` が返ること

#### S-04: `.env` の機密情報がフロントエンドに露出していないか確認

- **方法**: 方法E（ブラウザ DevTools）
- **担当**: カイト
- **手順**:
  1. Lovable プレビュー URL を開く
  2. DevTools → Sources → JS バンドルを確認
  3. `sk_test_` や `whsec_` 等のシークレットが含まれていないことを確認
- **確認**: `VITE_` プレフィックスのパブリックキーのみ公開

---

### フェーズ 10: UI / 品質テスト

#### Q-01: 既存 Playwright テスト全件実行（ホスト環境）

- **方法**: 方法B
- **担当**: リン
- **手順**:
  ```bash
  npm run e2e:hosted
  ```
- **確認**: TC-01〜TC-23 の全テストがパス

#### Q-02: レスポンシブ確認（モバイル・タブレット）

- **方法**: 方法B（Playwright、複数デバイス）+ 方法E（実機またはChrome DevTools）
- **担当**: ミク
- **確認**: TC-20 のレスポンシブテスト + 実際のモバイル表示確認

#### Q-03: パフォーマンス・アクセシビリティ

- **方法**: 方法A（Playwright + lighthouse）
- **担当**: ミク
- **確認**: TC-21〜22 のテストがパス

---

## 4. テストカード一覧

| カード番号 | シナリオ | 期待結果 |
|-----------|---------|---------|
| `4242 4242 4242 4242` | 正常決済 | 成功 |
| `4000 0000 0000 9995` | 残高不足 | 失敗（payment_failed） |
| `4000 0027 6000 3184` | 3D セキュア必須 | 認証モーダル表示 |
| `4000 0000 0000 0002` | カード拒否 | 拒否エラー |
| `4000 0000 0000 0341` | CVC チェック失敗 | 拒否エラー |
| `4000 0000 0000 3220` | 3DS2 認証（テスト） | 3DS モーダル → 成功 |
| `4000 0000 0000 0069` | 期限切れカード | 拒否エラー |
| `4000 0000 0000 0127` | 不正な CVC | 拒否エラー |
| `4000 0025 0000 3155` | SCA 必須（Strong Customer Authentication）| 3DS 認証 → 成功 |

> 有効期限: `12/28`（未来の日付ならOK） / CVC: `424` / 郵便番号: `42424`
>
> **参考**: [Stripe テストカード一覧](https://docs.stripe.com/testing#cards)

---

## 5. テスト実行順序と依存関係

```
F1（認証基盤）
  └→ F2（セラーオンボーディング）
       └→ F3（プラン作成）
            └→ F4（購入フロー E2E）
                 ├→ W（Webhook テスト）
                 ├→ D（Discord テスト）
                 └→ P（手数料テスト）
F1 ─→ A（管理者テスト）
F4 ─→ S（セキュリティテスト）※一部は独立して実行可
Q（UI品質）は独立して実行可能
R（回帰テスト）は全フェーズ完了後に実行
```

### テスト方法×フェーズ マトリクス

| フェーズ | A (Playwright local) | B (Playwright hosted) | C (Stripe CLI) | D (MCP/curl) | E (実ブラウザ) | F (エージェント) |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| F1 認証基盤 | - | ◎ | - | - | ◎ | - |
| F2 オンボーディング | ○ | ◎ | - | ◎ | ◎ | - |
| F3 プラン作成 | - | ◎ | - | - | ◎ | - |
| F4 購入フロー | - | - | - | ◎ | ◎ | - |
| W Webhook | - | - | ◎ | ◎ | - | ◎ |
| D Discord | - | - | ◎ | - | ◎ | - |
| P 手数料 | - | - | - | ◎ | - | ◎ |
| A 管理者 | - | - | - | - | ◎ | - |
| S セキュリティ | ◎ | - | - | ◎ | ◎ | ◎ |
| Q UI品質 | ◎ | ◎ | - | - | ◎ | ◎ |

---

## 6. テスト環境セットアップチェックリスト

### 事前確認

#### Supabase
- [ ] Edge Functions 5つすべてがデプロイ済み（`stripe-checkout` / `stripe-webhook` / `stripe-onboarding` / `discord-oauth` / `discord-bot`）
- [ ] Edge Functions の環境変数（Secrets）が設定済み：
  - `STRIPE_SECRET_KEY`（`sk_test_...`）
  - `STRIPE_WEBHOOK_SECRET`（`whsec_...`）
  - `DISCORD_BOT_TOKEN`
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] RLS ポリシーが有効化されている（テナント分離確認）

#### Stripe
- [ ] Stripe ダッシュボードで Webhook エンドポイントが設定済み
  - URL: `https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook`
  - イベント: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`
- [ ] Stripe テストモードで Connected Account 自動承認が有効
- [ ] Stripe CLI がインストール済み（`stripe --version`）
- [ ] Stripe CLI でログイン済み（`stripe login`）

#### Discord
- [ ] テスト用 Discord サーバーが作成済み
- [ ] Bot がサーバーに招待済み（`MANAGE_ROLES` 権限付き）
- [ ] Bot のロール順位 > テスト用ロール（ロール階層の設定）
- [ ] Guild ID / Role ID が控えてある

#### ローカル開発環境
- [ ] `npm install` 完了
- [ ] `.auth/lovable-hosted-state.json` が存在する（`npm run e2e:hosted:auth` 実行済み）
- [ ] `npx playwright install` でブラウザがインストール済み

#### AI エージェント
- [ ] Antigravity に Stripe MCP が接続済み
- [ ] Claw-Empire エージェント群がタスク受付可能

---

## 7. 成果物・レポート形式

### 各テスト完了時にヒナタへ報告する内容

```
テスト名: <テストID>
実行方法: <A/B/C/D/E/F>
担当: <エージェント名>
ステータス: ✅ PASS / ❌ FAIL / ⚠️ 部分PASS / ⏭️ スキップ
確認事項: <何を確認したか>
問題点: <FAILの場合の詳細>
スクリーンショット/ログ: <添付 or 参照先>
```

### テスト結果の保存先

| 種別 | 保存先 | 形式 |
|------|--------|------|
| Playwright レポート | `playwright-report/` | HTML |
| Playwright スクリーンショット | `test-results/` | PNG |
| 手動テストスクリーンショット | `docs/qa/reports/manual/` | PNG/MP4 |
| Webhook テストログ | `docs/qa/reports/webhook/` | JSON/TXT |
| セキュリティテスト結果 | `docs/qa/reports/security/` | MD |
| 最終レポート | `docs/qa/reports/FINAL_REPORT.md` | MD |
| Stripe CLI ログ | `docs/qa/reports/stripe-cli/` | TXT |

### 最終レポート項目

- テスト総数 / PASS数 / FAIL数 / スキップ数
- カバレッジ（未テスト機能リスト）
- 発見されたバグ一覧（優先度付き）
- 修正推奨事項
- テスト実行時間（各フェーズ）
- 環境情報スナップショット（Node.js / npm / Playwright / Stripe CLI バージョン）

---

## 8. 優先度マトリクス

| 優先度 | テスト | 理由 |
|--------|--------|------|
| 🔴 最優先 | F4-01（正常決済）, W-01（Webhook checkout）, D-01（Discord付与） | コア機能 |
| 🔴 最優先 | W-09/W-10（セキュリティ）, S-01/S-02 | セキュリティ上クリティカル |
| 🟠 高優先 | W-02〜W-07（Webhook全般）, D-03/D-04（Conflict Check） | ビジネスロジック |
| 🟠 高優先 | F2-02/F2-02a/F2-02b/F2-02c（Stripe Connect Express）, P-01〜P-05（手数料・Connect検証）| 収益フロー |
| 🟡 中優先 | F4-02〜F4-05（カード異常系）, A-01〜A-03（管理者機能） | 品質・運用 |
| 🟢 低優先 | Q-01〜Q-03（UI品質）, F1〜F3（既存テストで概ねカバー済み） | |

---

## 9. タイムアウト・リトライ・時間依存テスト

### 重要な時間パラメータ

| パラメータ | デフォルト値 | テストへの影響 |
|-----------|------------|-------------|
| Stripe Checkout セッション有効期限 | 24時間（デフォルト） | F4-xx: セッション作成後すぐに決済すること |
| `grace_period` 日数 | 3日 | W-02: `grace_period_ends_at` = 現在 + 3日 を確認 |
| Webhook リトライ間隔（Stripe 側） | 最大72時間 | W系: CLI トリガーなら即時だが、Stripe ダッシュボードからのリトライは遅延あり |
| Supabase Edge Function タイムアウト | 150秒 | 全 Webhook テスト: 複雑な処理でもタイムアウトしないこと |
| Discord API レート制限 | 50 req/sec | D系: 連続テスト時は 1秒間隔を空ける |
| Playwright テストタイムアウト | 30秒（デフォルト） | E2E: Stripe Checkout リダイレクトは最大 60秒に延長推奨 |

### リトライポリシー

```
Playwright E2E テスト:
  - retries: 1（CI）/ 0（ローカル）
  - タイムアウト: 30秒（通常） / 60秒（Stripe Checkout 含むテスト）

Stripe CLI Webhook テスト:
  - 各イベント送信後、DB 反映まで最大 5秒待機
  - DB 未反映の場合、3回まで 2秒間隔でポーリング

curl 直接テスト:
  - タイムアウト: 30秒
  - リトライ: なし（即時成否判定）
```

---

## 10. テストデータ管理・クリーンアップ手順

### テスト前：データ準備

```sql
-- テスト用プランが既に存在するか確認
SELECT id, name, interval, price FROM plans 
WHERE seller_id = '<テストセラーID>' 
ORDER BY created_at DESC;

-- テスト用メンバーシップをリセット（必要に応じて）
UPDATE memberships SET status = 'canceled', entitlement_ends_at = now()
WHERE plan_id IN (SELECT id FROM plans WHERE seller_id = '<テストセラーID>')
AND status != 'canceled';
```

### テスト後：クリーンアップ

```sql
-- 1. テストで作成されたメンバーシップを特定
SELECT m.id, m.status, m.stripe_subscription_id, p.name
FROM memberships m JOIN plans p ON m.plan_id = p.id
WHERE m.created_at > '<テスト開始時刻>';

-- 2. Stripe 側のテストサブスクリプションをキャンセル
-- stripe subscriptions cancel <sub_id> --stripe-account=<connected_account_id>

-- 3. テストで作成された Webhook イベントログを確認（削除は不要・監査用に保持）
SELECT * FROM stripe_webhook_events 
WHERE created_at > '<テスト開始時刻>' 
ORDER BY created_at DESC;

-- 4. audit_logs はテスト後も保持（削除禁止）
```

### Stripe テストデータリセット

```bash
# Stripe ダッシュボード → テストモード → 開発者 → 「テストデータを削除」
# ⚠️ 注意: Connected Account のデータも含めて全削除される
# テスト間のクリーンアップには使わず、全テスト完了後の最終クリーンアップにのみ使用
```

### Discord ロールクリーンアップ

```
1. Discord サーバー → メンバー一覧
2. テスト用アカウントからテスト用ロールを手動削除
3. Bot のログでロール操作履歴を確認
```

---

## 11. 全ルート一覧と認証要件

### プラットフォーム管理者（`/platform/*`）— 要: platform_admin ロール

| ルート | コンポーネント | テスト対象 |
|--------|-------------|----------|
| `/platform/login` | PlatformLogin | F1, A-01 |
| `/platform/dashboard` | PlatformDashboard | A-01 |
| `/platform/tenants` | PlatformTenants | A-01 |
| `/platform/tenants/:id` | PlatformTenantDetail | A-01 |
| `/platform/webhooks` | PlatformWebhooks | A-01 |
| `/platform/retry-queue` | PlatformRetryQueue | A-01 |
| `/platform/announcements` | PlatformAnnouncements | A-01 |
| `/platform/system-control` | PlatformSystemControl | A-01 |

### セラー（`/seller/*`）— 要: seller ロール（一部は未認証可）

| ルート | コンポーネント | テスト対象 |
|--------|-------------|----------|
| `/seller/signup` | SellerSignup | F1 |
| `/seller/login` | SellerLogin | F1-02 |
| `/seller/onboarding/profile` | OnboardingProfile | F2-01 |
| `/seller/onboarding/stripe` | OnboardingStripe | F2-02 |
| `/seller/onboarding/discord` | OnboardingDiscord | F2-03 |
| `/seller/onboarding/complete` | OnboardingComplete | F2 |
| `/seller/dashboard` | SellerDashboard | F2, S-01 |
| `/seller/plans` | SellerPlans | F3-01, S-01 |
| `/seller/plans/new` | SellerPlanDetail | F3-01 |
| `/seller/plans/:id` | SellerPlanDetail | F3-01 |
| `/seller/members` | SellerMembers | D |
| `/seller/members/:id` | SellerMemberDetail | D |
| `/seller/crosscheck` | SellerCrosscheck | A |
| `/seller/webhooks` | SellerWebhooks | W |
| `/seller/settings/discord` | SellerDiscordSettings | D |

### バイヤー（認証状態混在）

| ルート | コンポーネント | テスト対象 |
|--------|-------------|----------|
| `/checkout/success` | CheckoutSuccess | F4-01, D-01 |
| `/buyer/discord/confirm` | DiscordConfirm | D-01 |
| `/buyer/discord/result` | DiscordResult | D-01 |
| `/member/me` | MemberMe | D-02, S-01 |

### その他

| ルート | コンポーネント | テスト対象 |
|--------|-------------|----------|
| `/` | Index | ランディング |
| `*` | NotFound | 404 |

---

## 12. Antigravity Awesome Skills 活用ガイド

> **参照**: https://github.com/sickn33/antigravity-awesome-skills (968+ スキル)
>
> 以下は seller-harmony のテスト・開発に特に有効なスキルを選定したもの。
> Antigravity IDE では `@skill-name` で呼び出し可能。

### 🔴 最重要スキル（必ず使う）

| スキル名 | カテゴリ | seller-harmony での用途 |
|---------|---------|---------------------|
| `@stripe-integration` | security | Stripe Connect / Checkout / Webhook 実装のベストプラクティス。PCI準拠フロー設計 |
| `@payment-integration` | security | 決済フロー全般（checkout, subscriptions, webhooks, PCI compliance） |
| `@stripe-automation` | workflow | Stripe MCP 経由でのテストデータ操作自動化（customers, charges, subscriptions, refunds） |
| `@playwright-skill` | testing | Playwright によるブラウザ自動化。E2E テストスクリプト生成 |
| `@e2e-testing-patterns` | infrastructure | Playwright + Cypress のベストプラクティス。テストスイート設計 |
| `@discord-bot-architect` | development | Discord.js / Pycord Bot 開発。ロール管理・Slash Commands・Gateway Intents |
| `@discord-automation` | workflow | Discord MCP 経由でのロール・チャンネル・Webhook 操作自動化 |

### 🟠 高優先スキル

| スキル名 | カテゴリ | seller-harmony での用途 |
|---------|---------|---------------------|
| `@postgres-best-practices` | data-ai | Supabase PostgreSQL のクエリ最適化・スキーマ設計・RLS |
| `@auth-implementation-patterns` | security | Supabase Auth + OAuth2 + セッション管理の設計検証 |
| `@pci-compliance` | security | PCI DSS 準拠チェック。決済データの安全な取り扱い |
| `@web-security-testing` | security | OWASP Top 10 脆弱性テスト（XSS, CSRF, injection等） |
| `@security-audit` | security | 包括的セキュリティ監査ワークフロー |
| `@javascript-testing-patterns` | development | Vitest + Testing Library によるユニットテスト戦略 |
| `@react-best-practices` | development | React パフォーマンス最適化（Vercel Engineering 準拠） |
| `@billing-automation` | workflow | サブスクリプションライフサイクル・Dunning 管理の自動化 |

### 🟡 中優先スキル

| スキル名 | カテゴリ | seller-harmony での用途 |
|---------|---------|---------------------|
| `@react-patterns` | development | React Hooks / Composition / TypeScript パターン |
| `@typescript-expert` | development | 型安全性の強化・型レベルプログラミング |
| `@webapp-testing` | development | Playwright でのローカル Web アプリテスト |
| `@browser-automation` | data-ai | ブラウザ自動化全般（テスト・スクレイピング・AI エージェント連携） |
| `@find-bugs` | security | ローカルブランチの変更に対するバグ・脆弱性検出 |
| `@cc-skill-security-review` | security | 認証・入力処理・シークレット管理・API エンドポイント・決済機能のセキュリティレビュー |
| `@varlock-claude-skill` | security | 環境変数の安全管理（シークレットがログ・Git に露出しないことの保証） |
| `@gdpr-data-handling` | security | GDPR 準拠データ処理（同意管理・データ主体の権利） |
| `@systematic-debugging` | testing | バグ・テスト失敗時の体系的デバッグ手法 |
| `@tdd-orchestrator` | testing | TDD（Red-Green-Refactor）ワークフロー |

### 🟢 補助スキル

| スキル名 | カテゴリ | seller-harmony での用途 |
|---------|---------|---------------------|
| `@lint-and-validate` | general | コード変更後の自動品質チェック（ESLint / TypeScript） |
| `@production-code-audit` | architecture | コードベース全体の品質監査 |
| `@vibe-code-auditor` | data-ai | AI 生成コード（Lovable 由来）の構造的欠陥検出 |
| `@powershell-windows` | architecture | Windows PowerShell でのテスト実行・スクリプト作成 |
| `@onboarding-cro` | general | セラーオンボーディング UX の最適化 |
| `@signup-flow-cro` | general | サインアップフロー CRO |
| `@form-cro` | general | チェックアウトフォーム最適化 |
| `@antigravity-workflows` | security | 複数スキルのワークフローオーケストレーション |
| `@test-automator` | infrastructure | AI 駆動テスト自動化フレームワーク |
| `@legal-advisor` | security | プライバシーポリシー・利用規約・特定商取引法表記の起草 |

### スキル活用の具体例

#### 例1: 決済テスト設計時
```
@stripe-integration と @payment-integration を使って、
seller-harmony の stripe-checkout Edge Function の
PCI 準拠性と Webhook 署名検証をレビューして。
```

#### 例2: E2E テストスクリプト生成
```
@playwright-skill と @e2e-testing-patterns を使って、
月額サブスクリプション購入 → Stripe Checkout → /checkout/success
までの E2E テストを書いて。テストカード 4242424242424242 を使用。
```

#### 例3: セキュリティ監査
```
@security-audit と @web-security-testing を使って、
Supabase Edge Functions の全エンドポイントに対する
OWASP Top 10 脆弱性チェックを実施して。
```

#### 例4: Discord Bot ロジック検証
```
@discord-bot-architect を使って、
supabase/functions/discord-bot/index.ts の
ロール階層チェックと Conflict Check ロジックをレビューして。
```

### インストール方法

```bash
# Antigravity グローバル（推奨）
npx antigravity-awesome-skills

# ワークスペース固有（.agent/skills に配置）
npx antigravity-awesome-skills --path .agent/skills

# Windows の場合（symlink 有効化）
git clone -c core.symlinks=true https://github.com/sickn33/antigravity-awesome-skills.git .agent/awesome-skills
```

> **注意**: 既存の `.agent/skills/` にはプロジェクト固有スキル（e2e-payment-test, discord-role-test 等）が配置済み。
> Awesome Skills は `.agent/awesome-skills/` または `~/.gemini/antigravity/skills/` にインストールして共存させること。

---

## 13. DB スキーマ クイックリファレンス

### 主要テーブルとテスト時の確認カラム

| テーブル | テストで確認するカラム | 関連テスト |
|---------|---------------------|----------|
| `users` | `id`, `email`, `role` | F1, S-01 |
| `seller_profiles` | `user_id`, `display_name`, `service_name` | F2-01 |
| `stripe_connected_accounts` | `seller_id`, `stripe_account_id`, `account_type`, `charges_enabled`, `payouts_enabled`, `details_submitted`, `requirements_due` | F2-02, F2-02a〜c, P-04, P-05 |
| `discord_servers` | `seller_id`, `guild_id`, `bot_permission_status` | F2-03, D |
| `plans` | `seller_id`, `name`, `interval`, `price`, `stripe_price_id`, `discord_role_id`, `is_public` | F3 |
| `memberships` | `buyer_id`, `plan_id`, `status`, `stripe_subscription_id`, `grace_period_*`, `manual_override`, `risk_flag`, `dispute_status` | F4, W, D |
| `discord_identities` | `user_id`, `discord_user_id`, `discord_username` | D-01, D-02 |
| `role_assignments` | `membership_id`, `discord_role_id`, `assigned_at`, `revoked_at` | D |
| `stripe_webhook_events` | `stripe_event_id`, `event_type`, `processing_status` | W |
| `audit_logs` | `action`, `entity_type`, `entity_id`, `correlation_id` | A-03, W |
| `system_announcements` | `title`, `body`, `is_published` | A-01 |

### subscription_status enum 値

```
active | past_due | canceled | unpaid | incomplete
| pending_discord | grace_period | cancel_scheduled | expired | refunded
```

### plan_interval enum 値

```
one_time | monthly | yearly
```

---

## 14. 本番リリース向け追加テスト項目（2025-07-16 追加）

> **詳細ドキュメント**: [docs/production-readiness-tests.md](docs/production-readiness-tests.md)  
> 既存 E2E テスト 145 件 ALL PASS を前提に、本番運用に追加で必要なテスト項目を以下にまとめる。

### 14.1 発見済みバグ（BUG-07〜BUG-13）

| バグ ID | 重要度 | 場所 | 概要 |
|---------|--------|------|------|
| BUG-07 | 🔴 Critical | `stripe-checkout` | 削除済み/無効プランで Checkout Session 作成可能 |
| BUG-08 | 🔴 Critical | `stripe-onboarding` | セラーロールチェック未実装（バイヤーが Stripe アカウント作成可能） |
| BUG-09 | 🟠 High | `discord-oauth` | 空文字 `discord_user_id` で UNIQUE 制約違反 |
| BUG-10 | 🟠 High | `stripe-webhook` | `memberships.current_period_end` Webhook 処理時に未設定 |
| BUG-11 | 🟠 High | `system_announcements` | buyer/seller 向け SELECT RLS ポリシー欠落 |
| BUG-12 | 🟡 Medium | cron 未実装 | `grace_period` → `expired` 自動遷移なし |
| BUG-13 | 🟠 High | 全 Edge Functions | `ALLOWED_ORIGIN` 未設定時に CORS `*` フォールバック |

### 14.2 追加テストカテゴリ一覧

| カテゴリ | テスト ID | 件数 | 優先度 |
|---------|----------|------|--------|
| Edge Function 統合テスト | EF-01〜EF-23 | 23 | 🔴 最優先 |
| RLS セキュリティテスト | RLS-01〜RLS-10 | 10 | 🔴 最優先 |
| DB スキーマ整合性テスト | DB-01〜DB-05 | 5 | 🟠 高 |
| セキュリティテスト | SEC-01〜SEC-09 | 9 | 🔴 最優先 |
| 認証済みユーザー UI テスト | UI-01〜UI-16 | 16 | 🟠 高 |
| E2E 統合テスト | E2E-01〜E2E-06 | 6 | 🟠 高 |
| 非機能テスト | NF-01〜NF-08 | 8 | 🟡 中 |
| **合計** | — | **77** | — |

### 14.3 Edge Function 統合テスト（EF-01〜EF-23）

#### stripe-webhook（EF-01〜EF-11）

| ID | テスト名 | 優先度 | 期待結果 |
|----|---------|--------|---------|
| EF-01 | `checkout.session.completed` 正常処理 | 🔴 | `memberships.status='active'` 作成 |
| EF-02 | `customer.subscription.updated` 正常処理 | 🔴 | ステータス同期 |
| EF-03 | `customer.subscription.deleted` 正常処理 | 🔴 | `status='canceled'`, `entitlement_ends_at` 設定 |
| EF-04 | `invoice.payment_failed` 処理 | 🔴 | `status='past_due'`, `grace_period_ends_at` +3日 |
| EF-05 | `invoice.payment_succeeded` 処理 | 🟠 | `status='active'`, `current_period_end` 更新 |
| EF-06 | `charge.dispute.created` 処理 | 🟠 | `dispute_status='open'`, `risk_flag` 設定 |
| EF-07 | `charge.refunded` 処理 | 🟠 | `status='refunded'`, `entitlement_ends_at=now()` |
| EF-08 | Webhook 署名検証失敗 | 🔴 | HTTP 400, DB 記録なし |
| EF-09 | 冪等性テスト（重複イベント） | 🟠 | 2回目は `skipped` |
| EF-10 | `manual_override` 有効時スキップ | 🟡 | ステータス変更なし |
| EF-11 | 削除済みプランのイベント処理 | 🟠 | エラーなし、ログ出力 |

#### stripe-checkout（EF-12〜EF-15）

| ID | テスト名 | 優先度 | 期待結果 |
|----|---------|--------|---------|
| EF-12 | Checkout Session 正常作成 | 🔴 | HTTP 200, Stripe Checkout URL 返却 |
| EF-13 | 削除済みプラン拒否（BUG-07 修正確認） | 🔴 | HTTP 400/404 |
| EF-14 | 未認証リクエスト拒否 | 🔴 | HTTP 401 |
| EF-15 | Stripe アカウント未設定エラー | 🟠 | HTTP 400 + エラーメッセージ |

#### stripe-onboarding（EF-16〜EF-17）

| ID | テスト名 | 優先度 | 期待結果 |
|----|---------|--------|---------|
| EF-16 | オンボーディングリンク正常生成 | 🟠 | HTTP 200, AccountLink URL |
| EF-17 | バイヤーロール拒否（BUG-08 修正確認） | 🔴 | HTTP 403 |

#### discord-oauth（EF-18〜EF-21）

| ID | テスト名 | 優先度 | 期待結果 |
|----|---------|--------|---------|
| EF-18 | OAuth 認可 URL 生成 | 🟠 | Discord OAuth URL リダイレクト |
| EF-19 | OAuth コード交換フロー | 🟠 | `discord_identities` にレコード作成 |
| EF-20 | state パラメータ CSRF 検証 | 🔴 | 不正 state で HTTP 400/403 |
| EF-21 | リダイレクト URI ホワイトリスト検証 | 🟠 | 許可外 URI でエラー |

#### discord-bot（EF-22〜EF-23）

| ID | テスト名 | 優先度 | 期待結果 |
|----|---------|--------|---------|
| EF-22 | Bot 権限検証 | 🟠 | `has_permission: true/false` |
| EF-23 | 非セラーロール拒否 | 🔴 | HTTP 403 |

### 14.4 RLS セキュリティテスト（RLS-01〜RLS-10）

| ID | テスト名 | 優先度 | 期待結果 |
|----|---------|--------|---------|
| RLS-01 | セラー A → セラー B の plans 読取不可 | 🔴 | 0 行返却 |
| RLS-02 | セラー A → セラー B の memberships 読取不可 | 🔴 | 0 行返却 |
| RLS-03 | バイヤー → plans INSERT 不可 | 🔴 | policy violation |
| RLS-04 | バイヤー A → バイヤー B の memberships 読取不可 | 🔴 | 自分の分のみ |
| RLS-05 | セラー A → セラー B の stripe_connected_accounts 読取不可 | 🔴 | 0 行返却 |
| RLS-06 | discord_identities token 保護 | 🔴 | 他ユーザーのトークン不可視 |
| RLS-07 | system_announcements buyer/seller SELECT（BUG-11） | 🟠 | `is_published=true` のみ |
| RLS-08 | stripe_webhook_events セラー直接読取不可 | 🟠 | 0 行返却 |
| RLS-09 | audit_logs 自分のログのみ | 🟡 | 自分関連のみ |
| RLS-10 | role_assignments 直接操作不可 | 🟠 | INSERT エラー |

### 14.5 DB スキーマ整合性テスト（DB-01〜DB-05）

| ID | テスト名 | 優先度 |
|----|---------|--------|
| DB-01 | `memberships.current_period_end` NULL 許容確認 | 🟠 |
| DB-02 | `discord_identities.discord_user_id` UNIQUE + 空文字チェック | 🟠 |
| DB-03 | `role_assignments` テーブル使用状況 | 🟡 |
| DB-04 | `audit_logs` カラム名整合性 | 🟡 |
| DB-05 | `subscription_status` enum 値網羅性 | 🟠 |

### 14.6 セキュリティテスト（SEC-01〜SEC-09）

| ID | テスト名 | 優先度 |
|----|---------|--------|
| SEC-01 | CORS ワイルドカード排除（BUG-13） | 🔴 |
| SEC-02 | Discord OAuth redirect_uri localhost 排除 | 🔴 |
| SEC-03 | XSS 全パス検証 | 🟠 |
| SEC-04 | Rate Limiting | 🟠 |
| SEC-05 | stripe-onboarding セラーロールチェック（BUG-08） | 🔴 |
| SEC-06 | JWT 有効期限切れ拒否 | 🟠 |
| SEC-07 | Supabase anon key 適切使用 | 🟡 |
| SEC-08 | localStorage 改ざん耐性 | 🟠 |
| SEC-09 | SQL Injection 耐性 | 🔴 |

### 14.7 認証済みユーザー UI テスト（UI-01〜UI-16）

| ID | テスト名 | 優先度 | 対象ルート |
|----|---------|--------|----------|
| UI-01 | プラン作成 | 🟠 | `/seller/plans/new` |
| UI-02 | プラン編集 | 🟠 | `/seller/plans/:id` |
| UI-03 | プラン削除 | 🟠 | `/seller/plans/:id` |
| UI-04 | メンバー一覧 | 🟡 | `/seller/members` |
| UI-05 | メンバー詳細 | 🟡 | `/seller/members/:id` |
| UI-06 | クロスチェック | 🟡 | `/seller/crosscheck` |
| UI-07 | ダッシュボード KPI | 🟡 | `/seller/dashboard` |
| UI-08 | Discord 設定 | 🟡 | `/seller/settings/discord` |
| UI-09 | テナント一覧・詳細 | 🟠 | `/platform/tenants` |
| UI-10 | Webhook イベント一覧 | 🟠 | `/platform/webhooks` |
| UI-11 | リトライキュー管理 | 🟠 | `/platform/retry-queue` |
| UI-12 | お知らせ管理 | 🟡 | `/platform/announcements` |
| UI-13 | システム制御 | 🟡 | `/platform/system-control` |
| UI-14 | プラットフォームダッシュボード | 🟠 | `/platform/dashboard` |
| UI-15 | バイヤーマイページ | 🟠 | `/member/me` |
| UI-16 | Discord 連携確認 | 🟠 | `/buyer/discord/confirm` |

### 14.8 E2E 統合テスト（E2E-01〜E2E-06）

| ID | テスト名 | 優先度 | フロー |
|----|---------|--------|--------|
| E2E-01 | フル購入フロー（サブスク） | 🔴 | プラン作成→Checkout→Webhook→membership active |
| E2E-02 | フル購入+Discord ロール付与 | 🔴 | E2E-01 + Discord OAuth + ロール付与 |
| E2E-03 | キャンセルフロー | 🟠 | subscription.deleted→canceled→ロール剥奪 |
| E2E-04 | 決済失敗→リカバリ | 🟠 | payment_failed→grace_period→recovery |
| E2E-05 | 返金フロー | 🟠 | charge.refunded→refunded→ロール剥奪 |
| E2E-06 | チャージバック | 🟡 | dispute.created→dispute_status='open' |

### 14.9 非機能テスト（NF-01〜NF-08）

| ID | テスト名 | 優先度 |
|----|---------|--------|
| NF-01 | grace_period 期限切れ自動遷移 | 🟠 |
| NF-02 | Webhook 失敗リトライ | 🟠 |
| NF-03 | FastAPI 認証ミドルウェア | 🟡 |
| NF-04 | 環境変数完全性チェック | 🟠 |
| NF-05 | Edge Function タイムアウト耐性 | 🟡 |
| NF-06 | DB インデックス最適性 | 🟡 |
| NF-07 | Stripe API バージョン互換性 | 🟡 |
| NF-08 | エラーログ・監視設定 | 🟡 |
