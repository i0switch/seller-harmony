# Step 12: 管理者による全体状態検証

> **目的**: Platform Admin がすべての機能の状態を一元確認し、正常動作を検証
> **実行環境**: ブラウザ（Lovable プレビュー + Supabase Dashboard）
> **前提**: Step 05〜11 完了（Seller/Buyer のフロー一通り完了）

---

## テストアカウント

| 項目 | 値 |
|---|---|
| Admin メール | `i0switch.g@gmail.com` |
| パスワード | `pasowota427314s` |

---

## Task 1: 管理者ダッシュボードで統計確認

### 手順

1. 管理者としてログイン:
   ```
   https://preview--member-bridge-flow.lovable.app/platform/login
   ```

2. ダッシュボード `/platform` で以下の統計を確認:

### 期待される統計値

| 項目 | 期待値 |
|---|---|
| テナント（Seller）数 | 1以上 |
| アクティブ会員数 | 1以上 |
| 月間売上 | ¥980以上 |
| 審査待ち件数 | 0 or 1（状態による） |

---

## Task 2: テナント管理ページで Seller 状態確認

### 手順

1. `/platform/tenants` にアクセス

2. テスト Seller のエントリを確認:

| 確認項目 | 期待値 |
|---|---|
| Seller 名 | `テストセラー01` |
| Stripe 状態 | 「認証完了」or「有効」 |
| Discord 状態 | 「連携済み」 |
| プラン数 | 2（スタンダード + プレミアム） |
| 会員数 | 1以上 |

3. テナント詳細ページに遷移（行をクリック・詳細ボタン）

### テナント詳細

- Seller プロフィール情報
- Stripe Connect アカウント状態
- Discord サーバー設定
- プラン一覧
- 会員一覧

---

## Task 3: 審査待ちの確認（該当する場合）

### 手順

1. `/platform/pending` または `/platform/reviews` にアクセス

2. 審査が必要なアイテムがある場合:
   - Seller の本人確認待ち
   - プラン承認待ち
   - 等

### アクション

- 「承認」「却下」ボタンがある場合はテスト実行
- 承認後にステータスが更新されることを確認

---

## Task 4: Supabase で全テーブルのデータ整合性確認

### 手順

Supabase Dashboard → Table Editor で以下を確認

### 4.1 users テーブル
```sql
SELECT id, email, role, display_name, created_at 
FROM users 
ORDER BY created_at DESC;
```

| email | role | display_name |
|---|---|---|
| `i0switch.g@gmail.com` | `platform_admin` | (Admin名) |
| `i0switch.g+test01@gmail.com` | `seller` | `テストセラー01` |
| `i0switch.g+buyer01@gmail.com` | `buyer` | (Buyer名) |

### 4.2 seller_profiles テーブル
```sql
SELECT user_id, stripe_account_id, stripe_onboarding_complete, discord_guild_id 
FROM seller_profiles;
```

| stripe_account_id | stripe_onboarding_complete | discord_guild_id |
|---|---|---|
| `acct_...` | `true` | (Guild ID) |

### 4.3 plans テーブル
```sql
SELECT id, name, price, interval, seller_id, is_active 
FROM plans;
```

| name | price | interval | is_active |
|---|---|---|---|
| スタンダード会員 | 980 | month | true |
| プレミアム会員 | 9800 | year | true |

### 4.4 memberships テーブル
```sql
SELECT user_id, plan_id, status, stripe_subscription_id 
FROM memberships;
```

| status | stripe_subscription_id |
|---|---|
| `active` | `sub_...` |

### 4.5 discord_identities テーブル
```sql
SELECT user_id, discord_user_id, discord_username 
FROM discord_identities;
```

### 4.6 role_assignments テーブル
```sql
SELECT membership_id, discord_user_id, guild_id, role_id, assigned 
FROM role_assignments;
```

---

## Task 5: 監査ログの確認

### 手順

1. Supabase → Table Editor → `audit_logs`

2. 以下のイベントが記録されていることを確認:

| action | 説明 |
|---|---|
| `user_signup` | ユーザー登録 |
| `seller_onboarding` | Seller オンボーディング完了 |
| `plan_created` | プラン作成 |
| `checkout_completed` | 決済完了 |
| `membership_created` | 会員登録 |
| `discord_connected` | Discord 連携 |
| `role_assigned` | ロール付与 |

⚠️ audit_logs テーブルの構造によっては action 名が異なる場合がある。

---

## Task 6: クロスリファレンス整合性チェック

### 確認項目

1. **Seller の user_id 整合性**:
   - `users.id` = `seller_profiles.user_id`
   - `seller_profiles.user_id` = `plans.seller_id`

2. **Buyer の membership 整合性**:
   - `users.id` = `memberships.user_id`
   - `memberships.plan_id` = `plans.id` の有効なプラン

3. **Discord 整合性**:
   - `discord_identities.user_id` = `memberships.user_id`
   - `role_assignments.membership_id` = `memberships.id`

4. **Stripe 整合性**:
   - `memberships.stripe_subscription_id` が Stripe Dashboard に存在
   - `seller_profiles.stripe_account_id` が Stripe Connect に存在

---

## 完了確認

- [ ] 管理者ダッシュボードに正しい統計が表示される
- [ ] テナント一覧に Seller が表示される
- [ ] テナント詳細が正しい
- [ ] users テーブルに3アカウント（admin, seller, buyer）がある
- [ ] seller_profiles に Stripe / Discord 情報が揃っている
- [ ] plans テーブルに2件のプランがある
- [ ] memberships テーブルにアクティブな会員がある
- [ ] discord_identities にレコードがある
- [ ] role_assignments にレコードがある
- [ ] 外部キーの整合性が保たれている
