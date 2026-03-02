# Step 14: 最終デプロイメント準備チェックリスト

> **目的**: 本番リリース前の最終確認。全ステップの完了を確認し、残課題を整理する
> **実行環境**: 全サービスのダッシュボード
> **前提**: Step 01〜13 全完了

---

## A. コード品質チェック

### A.1 モックデータの完全除去
- [ ] `CheckoutSuccess.tsx` — mockCheckout 削除済み、Supabase からのリアルデータ取得に置換
- [ ] `DiscordConfirm.tsx` — mockDiscordUser 削除済み
- [ ] `MemberMe.tsx` — ハードコードされたユーザー情報削除済み
- [ ] `SellerDashboard.tsx` — `stripeStatus = "verified"` ハードコード削除済み
- [ ] `SellerDiscordSettings.tsx` — setTimeout 偽検証削除済み、Edge Function 呼び出しに置換
- [ ] `OnboardingStripe.tsx` — 「デモ用: 完了にする」ボタン削除済み

### A.2 FastAPI バックエンド
- [ ] `backend/` は本番では使用しない（Edge Functions に置換）
- [ ] または FastAPI エンドポイントが Supabase にリアルクエリを発行するよう更新済み

### A.3 ビルド
- [ ] TypeScript コンパイルエラー: 0件
- [ ] ESLint エラー: 0件（重大度 error のみ）
- [ ] Lovable ビルド: 成功

---

## B. 外部サービス設定チェック

### B.1 Supabase
- [ ] プロジェクト: `xaqzuevdmeqxntvhamce` — アクティブ
- [ ] Edge Functions: 5個全てデプロイ済み
  - [ ] stripe-onboarding
  - [ ] stripe-checkout
  - [ ] stripe-webhook
  - [ ] discord-oauth
  - [ ] discord-bot
- [ ] Edge Functions Secrets: 全て設定済み
  - [ ] STRIPE_SECRET_KEY
  - [ ] STRIPE_WEBHOOK_SECRET
  - [ ] DISCORD_CLIENT_ID
  - [ ] DISCORD_CLIENT_SECRET
  - [ ] DISCORD_BOT_TOKEN
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] ALLOWED_ORIGIN
- [ ] RLS ポリシー: 全テーブルに適切なポリシー設定済み
- [ ] Auth: Email 確認設定が適切
- [ ] Auth: Allowed Redirect URLs に Lovable URL が含まれる

### B.2 Stripe
- [ ] テストモードで動作確認済み
- [ ] Webhook エンドポイント: Supabase Edge Function URL を指定
- [ ] Webhook イベント: 7種類設定済み
- [ ] Signing secret: Supabase Secrets と一致
- [ ] Connect Express: Seller が作成可能
- [ ] Checkout: Buyer が決済可能
- [ ] テストカード `4242...` で決済成功確認済み

### B.3 Discord
- [ ] アプリ ID: `1476545159297630353`
- [ ] OAuth2 Redirects: Lovable URL 設定済み
- [ ] Bot Token: Supabase Secrets に設定済み
- [ ] Bot Permissions: `Manage Roles` 権限あり
- [ ] Intents: Server Members Intent 有効（必要な場合）

---

## C. 機能テスト結果サマリー

### C.1 認証
| テスト | 結果 |
|---|---|
| Admin ログイン | ⬜ Pass / Fail |
| Seller サインアップ | ⬜ Pass / Fail |
| Seller ログイン | ⬜ Pass / Fail |
| Buyer サインアップ | ⬜ Pass / Fail |
| Buyer ログイン | ⬜ Pass / Fail |
| ログアウト | ⬜ Pass / Fail |
| ルートガード（未認証リダイレクト） | ⬜ Pass / Fail |
| ロールベースアクセス制御 | ⬜ Pass / Fail |

### C.2 Seller フロー
| テスト | 結果 |
|---|---|
| Stripe Connect オンボーディング | ⬜ Pass / Fail |
| プラン作成（月額） | ⬜ Pass / Fail |
| プラン作成（年額） | ⬜ Pass / Fail |
| プラン編集 | ⬜ Pass / Fail |
| Discord Bot 招待 | ⬜ Pass / Fail |
| Discord サーバー設定 | ⬜ Pass / Fail |
| Bot 権限検証 | ⬜ Pass / Fail |
| ダッシュボード表示 | ⬜ Pass / Fail |

### C.3 Buyer フロー
| テスト | 結果 |
|---|---|
| プラン一覧表示 | ⬜ Pass / Fail |
| Stripe Checkout 開始 | ⬜ Pass / Fail |
| テスト決済成功 | ⬜ Pass / Fail |
| 決済成功ページ表示 | ⬜ Pass / Fail |
| マイページ表示 | ⬜ Pass / Fail |
| Discord OAuth 連携 | ⬜ Pass / Fail |
| Discord ロール付与 | ⬜ Pass / Fail |

### C.4 Webhook 処理
| テスト | 結果 |
|---|---|
| checkout.session.completed | ⬜ Pass / Fail |
| invoice.payment_succeeded | ⬜ Pass / Fail |
| invoice.payment_failed | ⬜ Pass / Fail |
| customer.subscription.deleted | ⬜ Pass / Fail |
| account.updated | ⬜ Pass / Fail |
| 冪等性（重複処理防止） | ⬜ Pass / Fail |

### C.5 エッジケース
| テスト | 結果 |
|---|---|
| 決済失敗カード | ⬜ Pass / Fail |
| サブスクキャンセル | ⬜ Pass / Fail |
| 返金 | ⬜ Pass / Fail |
| 3D Secure 認証 | ⬜ Pass / Fail |
| キャンセル後ロール剥奪 | ⬜ Pass / Fail |

### C.6 Admin 管理
| テスト | 結果 |
|---|---|
| ダッシュボード統計 | ⬜ Pass / Fail |
| テナント一覧 | ⬜ Pass / Fail |
| テナント詳細 | ⬜ Pass / Fail |
| データ整合性 | ⬜ Pass / Fail |

---

## D. データベース整合性チェック

### Supabase SQL Editor で実行

```sql
-- ユーザーロール分布
SELECT role, COUNT(*) FROM users GROUP BY role;

-- 全 Seller に seller_profiles が存在するか
SELECT u.id, u.email, sp.user_id IS NOT NULL as has_profile
FROM users u 
LEFT JOIN seller_profiles sp ON u.id = sp.user_id
WHERE u.role = 'seller';

-- 全 membership に有効な plan が紐づいているか  
SELECT m.id, m.status, p.name as plan_name, p.is_active
FROM memberships m
JOIN plans p ON m.plan_id = p.id;

-- orphanedレコードがないか（membership の user_id が存在するか）
SELECT m.id 
FROM memberships m
LEFT JOIN users u ON m.user_id = u.id
WHERE u.id IS NULL;

-- Discord 整合性
SELECT di.discord_username, m.status, ra.assigned
FROM discord_identities di
JOIN memberships m ON di.user_id = m.user_id
LEFT JOIN role_assignments ra ON m.id = ra.membership_id;
```

---

## E. 最終タスク（今回スコープ）

### E.1 Stripe運用モードの最終確認
⚠️ 今回の移行は **Lovable本番環境 + Stripeテストモード運用** が要件。Stripe Liveモード切替は実施しない。

- [ ] Stripeがテストモードであることを確認
- [ ] `STRIPE_SECRET_KEY` が `sk_test_` で始まることを確認
- [ ] Webhookエンドポイントが test/workbench 配下で有効なことを確認
- [ ] テスト決済・Webhook処理が成功していることを確認

### E.2 カスタムドメイン（オプション）
- [ ] Lovable でカスタムドメイン設定
- [ ] ALLOWED_ORIGIN を変更
- [ ] Discord OAuth Redirect URL を更新
- [ ] Supabase Auth Redirect URL を更新

### E.3 セキュリティ
- [ ] RLS ポリシーの最終レビュー
- [ ] API キーがフロントエンドコードに露出していないか確認（anon key は OK）
- [ ] Service Role Key がフロントエンドに含まれていないか確認

### E.4 将来タスク（今回スコープ外）
- [ ] Stripe Liveモードへ移行する場合のみ、本番APIキー/本番Webhookへの切替計画を別途実施

---

## F. 既知の課題・TODO

| # | 課題 | 重要度 | ステータス |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## 最終判定

| 判定基準 | 結果 |
|---|---|
| 全認証テスト Pass | ⬜ |
| 全 Seller フローテスト Pass | ⬜ |
| 全 Buyer フローテスト Pass | ⬜ |
| 全 Webhook テスト Pass | ⬜ |
| 全エッジケーステスト Pass | ⬜ |
| データ整合性チェック Pass | ⬜ |
| **総合判定: リリース Ready** | ⬜ |

---

> このチェックリストの全項目が ✅ になった時点で、  
> seller-harmony は Lovable 本番環境での運用準備が完了です。
