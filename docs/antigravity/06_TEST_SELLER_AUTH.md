# Step 06: セラー認証テスト（ログイン・サインアップ・オンボーディング）

> **目的**: Seller アカウントのログイン/サインアップ/オンボーディングフローを確認
> **実行環境**: ブラウザ（Lovable プレビュー）
> **前提**: Step 04 完了（デプロイ成功）

---

## テストアカウント

| 項目 | 値 |
|---|---|
| メール | `i0switch.g+test01@gmail.com` |
| パスワード | `pasowota427314s` |
| ロール | `seller` |

---

## Task 1: セラーログインページへアクセス

### 手順

1. ブラウザで以下のURLを開く:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/login
   ```

2. ログインフォームが表示されることを確認:
   - メールアドレス入力欄
   - パスワード入力欄
   - 「ログイン」ボタン
   - 「新規登録はこちら」リンク

---

## Task 2: セラーログイン実行

### 手順

1. **メールアドレス** 欄に入力:
   ```
   i0switch.g+test01@gmail.com
   ```

2. **パスワード** 欄に入力:
   ```
   pasowota427314s
   ```

3. 「ログイン」ボタンをクリック

### 期待される結果（アカウント未作成の場合）

- 「Invalid login credentials」エラーが表示される
- → Task 3 のサインアップに進む

### 期待される結果（アカウント既存の場合）

- ログイン成功
- オンボーディングまたはダッシュボードにリダイレクトされる
- → Task 4 に進む

---

## Task 3: セラーサインアップ（アカウント未作成の場合）

### 手順

1. 「新規登録はこちら」リンクをクリック
   または直接アクセス:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/signup
   ```

2. サインアップフォームに入力:
   - **セラー名（表示名）**: `テストセラー01`
   - **メールアドレス**: `i0switch.g+test01@gmail.com`
   - **パスワード**: `pasowota427314s`
   - **パスワード確認**: `pasowota427314s`

3. 「アカウント作成」ボタンをクリック

### 期待される結果

- 成功メッセージが表示される
- 確認メールが送信される（テスト環境では省略される場合あり）
  - Supabase で Auto Confirm が有効な場合 → 即時ログイン可能
  - 無効な場合 → メール確認が必要

### メール確認が必要な場合

**方法A: Gmailで確認メールを開く**
1. Gmail（i0switch.g@gmail.com のメールボックス）を開く
   - `+test01` はGmailではエイリアス、同じメールボックスに届く
2. Supabase からの確認メールを開く
3. 確認リンクをクリック

**方法B: Supabase で手動確認**
1. Supabase Dashboard → Authentication → Users
2. `i0switch.g+test01@gmail.com` を見つける
3. 「...」メニュー → 「Confirm email」

### 確認後、再度ログイン

1. `/seller/login` に戻る
2. 上記の認証情報でログイン
3. ログイン成功 → Task 4 に進む

---

## Task 4: セラーオンボーディング画面の確認

### 手順

新規セラーは初回ログイン時にオンボーディングフローが表示される。

1. ログイン後、オンボーディング画面 `/seller/onboarding` にリダイレクトされることを確認

2. オンボーディングステップを確認:
   - **Step 1**: Stripe 連携（Stripe Connect Express アカウント作成）
   - **Step 2**: Discord 連携（Bot 招待、ギルド設定）
   - **Step 3**: プラン作成（最初のプランを作成）

### 期待される画面要素

- ステップインジケーター（1/3 などの進捗表示）
- 現在のステップの説明
- 「次へ」ボタンまたは各ステップのアクション起動ボタン

---

## Task 5: Supabase でユーザーデータ確認

### 手順

1. Supabase Dashboard を開く:
   ```
   https://supabase.com/dashboard/project/xaqzuevdmeqxntvhamce
   ```

2. **Table Editor** → `users` テーブル
3. `i0switch.g+test01@gmail.com` のレコードを確認

### 確認ポイント

| カラム | 期待値 |
|---|---|
| `email` | `i0switch.g+test01@gmail.com` |
| `role` | `seller` |
| `display_name` | `テストセラー01` |
| `created_at` | 直近のタイムスタンプ |

4. **Table Editor** → `seller_profiles` テーブル
5. 該当ユーザーIDのレコードを確認

| カラム | 期待値 |
|---|---|
| `user_id` | users テーブルの id と一致 |
| `stripe_account_id` | NULL（Stripe 連携前） |
| `stripe_onboarding_complete` | false |
| `discord_guild_id` | NULL（Discord 連携前） |

---

## Task 6: セラーダッシュボードへのアクセス確認

### 手順（オンボーディング完了後またはスキップ可能な場合）

1. `/seller/dashboard` にアクセス:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/dashboard
   ```

2. ダッシュボードが表示されることを確認:
   - 収益サマリー（初期状態: ¥0）
   - 会員数（初期状態: 0名）
   - Stripe 連携ステータス
   - Discord 連携ステータス

---

## 完了確認

- [ ] セラーログインページが表示される
- [ ] `i0switch.g+test01@gmail.com` でログインできる（またはサインアップ後にログインできる）
- [ ] サインアップフォームが正しく動作する
- [ ] メール確認が完了できる
- [ ] Supabase の users テーブルに正しいレコードが存在する
- [ ] Supabase の seller_profiles テーブルにレコードが存在する
- [ ] オンボーディング画面が表示される
- [ ] ダッシュボードにアクセスできる
