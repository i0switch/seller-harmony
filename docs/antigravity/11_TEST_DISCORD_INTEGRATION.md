# Step 11: Discord 連携テスト

> **目的**: Discord OAuth2 認証、Bot によるロール付与、サーバー設定を検証
> **実行環境**: ブラウザ（Lovable プレビュー + Discord）
> **前提**: Step 09 完了（Buyer がプラン購入済み）

---

## 関連アカウント

| ロール | メール | 用途 |
|---|---|---|
| Seller | `i0switch.g+test01@gmail.com` | Discord サーバー設定 |
| Buyer | `i0switch.g+buyer01@gmail.com` | Discord OAuth 連携 |

## Discord 情報

| 項目 | 値 |
|---|---|
| アプリ ID | `1476545159297630353` |
| Developer Portal | `https://discord.com/developers/applications/1476545159297630353` |

---

## Part A: セラー側 Discord 設定

### Task 1: セラーとしてログイン

1. セラーアカウントでログイン:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/login
   ```
   - `i0switch.g+test01@gmail.com` / `pasowota427314s`

---

### Task 2: Discord 設定ページへアクセス

1. セラーダッシュボード → Discord 設定
   ```
   https://preview--member-bridge-flow.lovable.app/seller/discord
   ```

2. Discord 設定画面が表示されることを確認:
   - Discord Bot 招待ステータス
   - サーバー選択
   - ロール設定

---

### Task 3: Discord Bot をサーバーに招待

1. 「Bot を招待」ボタンをクリック
   - Discord の Bot 招待画面にリダイレクトされる
   - URL 例: `https://discord.com/oauth2/authorize?client_id=1476545159297630353&permissions=268435456&scope=bot`

2. Bot を招待するサーバーを選択
   - テスト用 Discord サーバーを使用
   - ⚠️ サーバーの管理者権限が必要

3. 「認証（Authorize）」をクリック

### 期待される結果
- Bot がサーバーに参加
- アプリにリダイレクトされる

---

### Task 4: Discord サーバーとロールの設定

1. Discord 設定ページで:
   - **サーバー ID（Guild ID）** を入力 or 自動取得
   - **会員ロール**: 付与するロール名を選択/入力

2. 「保存」「検証」ボタンをクリック

### 期待される結果

- 「Discord 連携が完了しました」等のメッセージ
- サーバー名が表示される
- ロール名が表示される

---

### Task 5: Bot 権限の検証

1. Discord 設定ページの「権限を検証」ボタンをクリック
   - Edge Function `discord-bot` が呼び出される

### 期待される結果

- ✅ Bot がサーバーに参加している
- ✅ Bot に「Manage Roles」権限がある
- ✅ 指定ロールが Bot のロールより下位にある

### エラーの場合

| エラー | 原因 | 対処 |
|---|---|---|
| Bot がサーバーにいません | 招待が完了していない | Task 3 を再実行 |
| 権限不足 | Bot のロールが低い | Discord サーバー設定でBot のロールを上に移動 |
| ロールが見つかりません | ロール名が間違っている | Discord サーバーでロール名を確認 |

---

### Task 6: Supabase でセラーの Discord 設定を確認

1. Supabase Dashboard → Table Editor

2. **`seller_profiles`** テーブル:
   | カラム | 期待値 |
   |---|---|
   | `discord_guild_id` | Discord サーバーの Guild ID |
   | `discord_role_id` | 付与するロールの ID |

3. **`discord_servers`** テーブル（存在する場合）:
   | カラム | 期待値 |
   |---|---|
   | `guild_id` | Discord サーバー ID |
   | `guild_name` | サーバー名 |
   | `bot_joined` | `true` |

---

## Part B: バイヤー側 Discord OAuth 連携

### Task 7: バイヤーとしてログイン

1. 新しいブラウザタブ or シークレットウィンドウで:
   ```
   https://preview--member-bridge-flow.lovable.app/buyer/login
   ```
   - `i0switch.g+buyer01@gmail.com` / `pasowota427314s`

---

### Task 8: Discord 連携を開始

1. バイヤーマイページ → 「Discord 連携」ボタン:
   ```
   https://preview--member-bridge-flow.lovable.app/buyer/me
   ```

2. 「Discord アカウントを連携」ボタンをクリック

### 期待される動作

- Discord OAuth2 ページにリダイレクトされる
  - URL 例: `https://discord.com/oauth2/authorize?client_id=1476545159297630353&redirect_uri=...&response_type=code&scope=identify+guilds.join`
- 「identify」と「guilds.join」の権限が要求される

---

### Task 9: Discord OAuth 認証

1. Discord のアカウントでログイン（既にログイン済みの場合はスキップ）
2. 「認証（Authorize）」をクリック

### 期待される動作

- 認可コード付きでアプリにリダイレクトされる:
  ```
  https://preview--member-bridge-flow.lovable.app/buyer/discord/result?code=...
  ```
- Edge Function `discord-oauth` が呼び出される
- Discord ユーザー情報が取得される

---

### Task 10: Discord 連携完了の確認

### 期待されるリダイレクト先の画面

- 「Discord 連携が完了しました」メッセージ
- Discord ユーザー名が表示される（例: `username#1234`）
- アバターが表示される（あれば）

### Supabase で確認

1. **`discord_identities`** テーブル:
   | カラム | 期待値 |
   |---|---|
   | `user_id` | Buyer の UUID |
   | `discord_user_id` | 数字の文字列 |
   | `discord_username` | Discord ユーザー名 |

---

### Task 11: Discord ロール自動付与の確認

### 期待される動作

1. OAuth 連携完了後、自動的にセラーのサーバーに参加
2. 指定ロールが付与される

### Discord で確認

1. Discord アプリ/Web でセラーのサーバーを開く
2. メンバーリストで Buyer の Discord アカウントが表示される
3. 指定ロールが付与されている

### Supabase で確認

1. **`role_assignments`** テーブル:
   | カラム | 期待値 |
   |---|---|
   | `membership_id` | Buyer の membership UUID |
   | `discord_user_id` | Buyer の Discord user ID |
   | `guild_id` | セラーの Guild ID |
   | `role_id` | セラーが設定したロール ID |
   | `assigned` | `true` |

---

## 完了確認

### Part A: セラー側
- [ ] Discord 設定ページが表示される
- [ ] Bot がサーバーに招待できる
- [ ] サーバーとロールの設定が保存できる
- [ ] Bot 権限の検証が成功する
- [ ] Supabase に Discord 設定が保存される

### Part B: バイヤー側
- [ ] Discord OAuth ページにリダイレクトされる
- [ ] OAuth 認証が完了する
- [ ] Discord ユーザー情報が取得される
- [ ] discord_identities テーブルにレコードがある
- [ ] セラーのサーバーに自動参加する
- [ ] 指定ロールが自動付与される
- [ ] role_assignments テーブルにレコードがある

---

## トラブルシューティング

### Discord OAuth ページでエラー
→ Discord Developer Portal → OAuth2 → Redirects に `https://preview--member-bridge-flow.lovable.app/buyer/discord/result` が追加されているか確認。

### 「Invalid redirect URI」
→ Step 02 Task 4 のリダイレクトURL設定を確認。完全一致が必要（末尾スラッシュに注意）。

### ロールが付与されない
→ Bot のロール順位を確認。Discord サーバー設定 → ロール → Bot のロールが対象ロールより上にあること。

### 「guilds.join」でエラー
→ Discord Developer Portal → Bot → 「Server Members Intent」が有効になっているか確認。
