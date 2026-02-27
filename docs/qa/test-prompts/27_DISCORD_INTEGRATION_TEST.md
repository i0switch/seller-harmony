# テスト27: Discord連携 結合テスト — OAuth・Bot権限・ロール付与剥奪

> **カテゴリ**: 外部連携結合テスト  
> **優先度**: P0 (Critical)  
> **推定所要時間**: 45分  
> **前提条件**: テスト用Discord Guild / Bot / Role、Supabase Edge Functionsデプロイ済み  
> **実行環境**: テスト用Discord環境 + Supabase

---

## AIエージェントへの指示

```
あなたはDiscord連携の結合テストエンジニアです。
テスト用Discordサーバー（Guild）を使用して、OAuthフロー・Botによるロール付与/剥奪
が要件定義通りに動作することを検証してください。

検証対象:
1. OAuth2 state検証（CSRF防止）
2. Botロール階層チェック
3. ロール付与/剥奪の正常動作
4. 階層エラー・権限不足時のフォールバック
5. ロール競合時のスキップ動作

⚠️ 重要:
- テスト用GuildのIDを使用し、本番Guildでは絶対にテストしない
- Bot TokenはEdge Functionの環境変数にのみ保持（ログ/レスポンスに出さない）
- OAuthのClient Secretも同様
```

---

## 前提準備

### PREP-01: テスト用Discord環境

1. テスト用Discordサーバー（Guild）を作成
2. テスト用ロール（例: `テスト有料会員`）を作成し Role ID をメモ
3. Botをサーバーに招待（`Manage Roles` + `guilds.join` 権限必須）
4. **Botの役職を有料ロールより上に配置**

```
Discord設定 > ロール:
  ├── @everyone
  ├── テスト有料会員  (role_id: XXXXXX)  ← 付与対象
  └── テストBot       (role_id: YYYYYY)  ← Botロール（上位に配置）
```

**メモ**:
```
TEST_GUILD_ID = __________________
TEST_ROLE_ID  = __________________
BOT_USER_ID   = __________________
```

### PREP-02: Supabase環境変数確認

```bash
# 以下の環境変数がSupabase Edge Functionsに設定されていること
supabase secrets list
# 確認: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
```

### PREP-03: DBテストデータ

```sql
-- テスト用のdiscord_serversレコード
INSERT INTO discord_servers (seller_id, guild_id, guild_name, bot_installed, bot_permission_status)
VALUES ('<test_seller_id>', '<TEST_GUILD_ID>', 'テストサーバー', true, 'unknown')
ON CONFLICT DO NOTHING;

-- テスト用のplanレコード
INSERT INTO plans (seller_id, name, plan_type, amount, currency, discord_guild_id, discord_role_id, is_public, is_active)
VALUES ('<test_seller_id>', 'テストプラン', 'subscription', 3000, 'jpy', '<TEST_GUILD_ID>', '<TEST_ROLE_ID>', true, true)
ON CONFLICT DO NOTHING;
```

---

## A. OAuth2 state検証（CSRF防止）

### DIS-27-01: state パラメータなしでリクエスト → エラー

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-oauth \
  -H "Authorization: Bearer <valid_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**期待結果**:
- [ ] HTTP 400 が返る
- [ ] `"State parameter is required for security."` エラーメッセージ
- [ ] Discord認証URLが**生成されない**

### DIS-27-02: 正常なstate付きリクエスト → 認証URL生成

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-oauth \
  -H "Authorization: Bearer <valid_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"state":"csrf_test_state_12345","redirect_uri":"https://preview--member-bridge-flow.lovable.app/buyer/discord/result"}'
```

**期待結果**:
- [ ] Discord認証URLが返される
- [ ] URLに `state=csrf_test_state_12345` が含まれる
- [ ] DB `discord_identities` に `oauth_state = 'csrf_test_state_12345'` が保存される

### DIS-27-03: callback時のstate不一致 → 403拒否

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-oauth \
  -H "Authorization: Bearer <valid_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"code":"fake_code","state":"wrong_state_value","redirect_uri":"https://preview--member-bridge-flow.lovable.app/buyer/discord/result"}'
```

**期待結果**:
- [ ] HTTP 403 が返る
- [ ] `"OAuth state mismatch — possible CSRF attack"` エラーメッセージ
- [ ] Discord APIへのトークン交換が**実行されない**

### DIS-27-04: state有効期限（10分）の検証

**手順**:
1. state付きリクエストを送信してDBに保存
2. `discord_identities.oauth_state_created_at` を11分前に更新:
```sql
UPDATE discord_identities 
SET oauth_state_created_at = NOW() - INTERVAL '11 minutes'
WHERE user_id = '<test_user_id>';
```
3. callback リクエストを送信

**期待結果**:
- [ ] HTTP 403 が返る
- [ ] `"OAuth state expired"` エラーメッセージ

### DIS-27-05: state使用後の無効化（ワンタイム）

**確認（コードレビュー）**:
- [ ] OAuth成功後に `oauth_state: null, oauth_state_created_at: null` で更新されている
- [ ] 同じstateを再利用したリクエストが**拒否される**

---

## B. Botロール階層チェック

### DIS-27-06: 正常な階層 → status = 'ok'

**前提**: BotのロールがテストロールよりDiscord上で上位に配置されていること

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-bot \
  -H "Authorization: Bearer <seller_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate_bot_permission","guild_id":"<TEST_GUILD_ID>","role_id":"<TEST_ROLE_ID>"}'
```

**期待結果**:
- [ ] `status = "ok"` が返る
- [ ] `botMaxPos > targetRole.position` であること
- [ ] DB `discord_servers.bot_permission_status` が `ok` に更新される

### DIS-27-07: 不正な階層（Bot下位）→ status = 'insufficient'

**前提**: Discord設定でBotのロールをテストロールより**下**に移動

**手順**:
```bash
# 同じリクエストを送信
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-bot \
  -H "Authorization: Bearer <seller_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate_bot_permission","guild_id":"<TEST_GUILD_ID>","role_id":"<TEST_ROLE_ID>"}'
```

**期待結果**:
- [ ] `status = "insufficient"` が返る
- [ ] DB `discord_servers.bot_permission_status` が `insufficient` に更新される

**UI確認**（Lovable環境）:
- [ ] Seller Discord設定画面で「検証NG」が表示される
- [ ] プラン公開がブロックまたは警告される

### DIS-27-08: 存在しないロールID → エラー

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-bot \
  -H "Authorization: Bearer <seller_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate_bot_permission","guild_id":"<TEST_GUILD_ID>","role_id":"999999999999999999"}'
```

**期待結果**:
- [ ] HTTP 400 が返る
- [ ] `"Target role not found in guild"` エラーメッセージ

### DIS-27-09: BotがGuildに参加していない → エラー

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-bot \
  -H "Authorization: Bearer <seller_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate_bot_permission","guild_id":"000000000000000000","role_id":"<TEST_ROLE_ID>"}'
```

**期待結果**:
- [ ] HTTP 400 が返る
- [ ] エラーメッセージ（Bot is not in this guild / Failed to fetch guild roles）

### DIS-27-10: 他sellerのGuildにアクセス → 403

**手順**:
```bash
# TEST_GUILD_ID は test_seller_A のもの
# test_seller_B のJWTでリクエスト
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-bot \
  -H "Authorization: Bearer <seller_B_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate_bot_permission","guild_id":"<TEST_GUILD_ID>","role_id":"<TEST_ROLE_ID>"}'
```

**期待結果**:
- [ ] HTTP 403 が返る
- [ ] `"Forbidden: You do not own this server"` エラーメッセージ
- [ ] OWNERSHIP CHECK が機能している

---

## C. ロール付与（Discord API直接テスト）

### DIS-27-11: ロール付与の正常動作

**手順**（Stripe Webhook経由、またはDB操作 + Edge Function呼び出し）:

1. テスト用buyerのDiscord identityを準備:
```sql
INSERT INTO discord_identities (user_id, discord_user_id, discord_username)
VALUES ('<test_buyer_id>', '<buyer_discord_user_id>', 'テストバイヤー#0001')
ON CONFLICT DO NOTHING;
```

2. checkout.session.completed イベントを発火（STR-26-07参照）

**Discord確認**:
- [ ] テスト用Discordサーバーで、テストバイヤーに「テスト有料会員」ロールが付与されている
- [ ] Discord API レスポンスが正常（HTTP 204）

### DIS-27-12: ロール剥奪の正常動作

**手順**: customer.subscription.deleted イベントを発火（STR-26-11参照）

**Discord確認**:
- [ ] テスト用Discordサーバーで、テストバイヤーから「テスト有料会員」ロールが**剥奪**されている
- [ ] サーバーからは**キック（追放）されていない**（要件: ロール剥奪のみ）

### DIS-27-13: ロール付与失敗時のエラーハンドリング

**手順**: 存在しないdiscord_user_idでロール付与を試行

```sql
-- 無効なDiscord user IDを設定
UPDATE discord_identities 
SET discord_user_id = '000000000000000000'
WHERE user_id = '<test_buyer_id>';
```

その後 checkout.session.completed を発火

**期待結果**:
- [ ] ロール付与がDiscord API側で失敗する
- [ ] Edge Functionのログに `Discord role assignment failed: 4XX` が記録される
- [ ] **Webhookハンドラー自体は200で正常応答する**（ロール付与失敗でWebhook全体を失敗させない）
- [ ] `membership` は正常に作成される（ロール付与失敗は独立したエラー）

---

## D. Discord OAuth リダイレクト制限

### DIS-27-14: 許可されていないredirect_uriでリクエスト → 拒否

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-oauth \
  -H "Authorization: Bearer <valid_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"state":"test_state","redirect_uri":"https://evil-site.com/phishing"}'
```

**期待結果**:
- [ ] HTTP 400 が返る
- [ ] `"Invalid redirect_uri"` エラーメッセージ
- [ ] 認証URLが生成されない

### DIS-27-15: 許可されたredirect_uriパターンの確認

| パターン | 期待 |
|---|---|
| `http://localhost:5173/buyer/discord/result` | ✅ 許可 |
| `http://localhost:3000/buyer/discord/result` | ✅ 許可 |
| `https://preview--member-bridge-flow.lovable.app/buyer/discord/result` | ✅ 許可 |
| `https://anything.lovable.app/buyer/discord/result` | ✅ 許可 |
| `https://evil.lovable.app.attacker.com/buyer/discord/result` | ❌ 拒否 |
| `https://evil-site.com/buyer/discord/result` | ❌ 拒否 |

- [ ] 上記パターンが正しく判定されること

---

## E. 購入者フロー E2E（UI → Discord API）

### DIS-27-16: 決済完了 → Discord連携 → ロール付与の完全フロー

**手順（ブラウザ上の手動テスト）**:
1. `/checkout/success?session_id=cs_test_xxx` にアクセス
2. 「Discordを連携する」ボタンをクリック
3. Discord OAuth認証ページでログイン・許可
4. リダイレクト先で連携結果を確認
5. テスト用Discordサーバーでロールを確認

**期待結果**:
- [ ] 決済完了画面が表示される
- [ ] Discord OAuth画面にリダイレクトされる
- [ ] 連携完了画面にDiscord username が表示される
- [ ] Discordサーバーでロールが付与されている
- [ ] `memberships.status` が `pending_discord` → `active` に変わる

### DIS-27-17: Discord未連携のままマイページを確認

**手順**:
1. `/member/me` にアクセス（Discord未連携の状態）

**期待結果**:
- [ ] 「Discord未連携」の警告が表示される
- [ ] 「連携する」ボタンが表示される
- [ ] membership の status が `pending_discord` のまま

---

## F. 認可・権限チェック

### DIS-27-18: buyerがdiscord-botエンドポイントにアクセス → 403

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-bot \
  -H "Authorization: Bearer <buyer_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate_bot_permission","guild_id":"<TEST_GUILD_ID>","role_id":"<TEST_ROLE_ID>"}'
```

**期待結果**:
- [ ] HTTP 403 が返る
- [ ] `"Forbidden"` エラーメッセージ
- [ ] buyer ロールでは discord-bot の validate_bot_permission にアクセスできないこと

### DIS-27-19: 未認証でdiscord-oauthにアクセス → 401

**手順**:
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/discord-oauth \
  -H "Content-Type: application/json" \
  -d '{"state":"test"}'
```

**期待結果**:
- [ ] HTTP 401 が返る
- [ ] `"Unauthorized"` エラーメッセージ

---

## テスト完了チェックリスト

| セクション | テスト | 結果 | 備考 |
|---|---|---|---|
| A. OAuth state | DIS-27-01: stateなし拒否 | | |
| A. OAuth state | DIS-27-02: 正常state発行 | | |
| A. OAuth state | DIS-27-03: state不一致拒否 | | |
| A. OAuth state | DIS-27-04: state期限切れ | | |
| A. OAuth state | DIS-27-05: state使用後無効化 | | |
| B. 階層チェック | DIS-27-06: 正常階層OK | | |
| B. 階層チェック | DIS-27-07: 不正階層insufficient | | |
| B. 階層チェック | DIS-27-08: 存在しないロール | | |
| B. 階層チェック | DIS-27-09: Bot未参加 | | |
| B. 階層チェック | DIS-27-10: 他seller拒否 | | |
| C. ロール操作 | DIS-27-11: 付与正常 | | |
| C. ロール操作 | DIS-27-12: 剥奪正常 | | |
| C. ロール操作 | DIS-27-13: 付与失敗ハンドリング | | |
| D. リダイレクト | DIS-27-14: 不正URI拒否 | | |
| D. リダイレクト | DIS-27-15: URIパターン検証 | | |
| E. E2Eフロー | DIS-27-16: 完全フロー | | |
| E. E2Eフロー | DIS-27-17: 未連携マイページ | | |
| F. 認可 | DIS-27-18: buyer拒否(bot) | | |
| F. 認可 | DIS-27-19: 未認証拒否(oauth) | | |

---

## Done条件

```
全DIS項目がPASSであること。
FAIL項目がある場合:
1. Edge Function（discord-bot / discord-oauth）の修正コードを生成
2. supabase functions deploy で再デプロイ
3. 当該テストを再実行
4. 3回連続PASSでDone

⚠️ テスト完了後は必ず:
- テスト用DiscordアカウントのOAuthトークンを無効化
- テスト用Guild/Roleはそのまま残してOK（次回テスト用）
- テスト用DBレコード（discord_identities, memberships等）をクリーンアップ
- Botのロール階層を元に戻す（DIS-27-07 で変更した場合）
```
