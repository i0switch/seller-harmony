# Step 02: Supabase Edge Functions 環境変数確認・デプロイ

> **目的**: 全Edge Functionsが正しい環境変数で動作することを確認し、デプロイする
> **実行環境**: Supabase ダッシュボード + Lovable エディタ
> **前提**: Step 01 完了、各サービスにログイン済み

---

## 概要

seller-harmony は以下の5つの Edge Function を使用する:

| Function | 用途 | 必要な環境変数 |
|---|---|---|
| `stripe-onboarding` | Seller Stripe Express 連携 | STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| `stripe-checkout` | Buyer 決済セッション作成 | STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY |
| `stripe-webhook` | Stripe Webhook 処理 | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| `discord-oauth` | Discord OAuth2 連携 | DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| `discord-bot` | Discord Bot 権限検証 | DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |

---

## Task 1: Supabase ダッシュボードで環境変数を確認・設定

### 手順

1. **Supabase ダッシュボード**を開く:
   ```
   https://supabase.com/dashboard/project/xaqzuevdmeqxntvhamce
   ```

2. **左サイドバー** → **Edge Functions** → **Secrets** タブ（または Settings → Edge Functions）

3. 以下の環境変数が設定されていることを確認。**未設定のものは追加する**:

#### Stripe 関連
| Key | 値の取得先 | 備考 |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key | `sk_test_` で始まること |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → 該当Endpoint → Signing secret | `whsec_` で始まること |

**Stripe Secret Key の確認手順**:
1. https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/apikeys を開く
2. 「Secret key」の「Reveal test key」をクリック
3. `sk_test_...` の値をコピー

**Stripe Webhook Secret の確認手順**:
1. https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/workbench/webhooks/we_1T52wlCPMy4DDs4SYpAK9yU8 を開く
2. 「Signing secret」セクションの値をコピー（`whsec_...`）

#### Discord 関連
| Key | 値の取得先 | 備考 |
|---|---|---|
| `DISCORD_CLIENT_ID` | Discord Developer Portal → Applications → OAuth2 | 数字のみの文字列 |
| `DISCORD_CLIENT_SECRET` | Discord Developer Portal → Applications → OAuth2 → Client Secret | **既存値を優先利用**（不要な再生成はしない） |
| `DISCORD_BOT_TOKEN` | Discord Developer Portal → Applications → Bot → Token | **既存値を優先利用**（不要な再生成はしない） |

**取得手順**:
1. https://discord.com/developers/applications/1476545159297630353/oauth2 を開く
2. **CLIENT ID**: ページ上部に表示されている（`1476545159297630353`）
3. **CLIENT SECRET**: 既存の値が利用可能ならそれを使用。表示できない/失効時のみ再生成
4. **Bot Token**: 既存の値が利用可能ならそれを使用。表示できない/失効時のみ再生成
5. トークンを再生成した場合は、Supabase Secrets更新後に関連機能（discord-oauth / discord-bot）を再デプロイ

#### Supabase 関連（自動設定済みの可能性あり）
| Key | 確認先 |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |

⚠️ Supabase が自動注入する場合もあるが、明示的に設定されていることを確認。

#### CORS 関連
| Key | 値 |
|---|---|
| `ALLOWED_ORIGIN` | `https://preview--member-bridge-flow.lovable.app` |

---

## Task 2: Edge Functions がデプロイ済みであることを確認

### 手順

1. Supabase ダッシュボード → **Edge Functions** を開く
2. 以下の5つの Function が一覧に表示されていることを確認:

   - [ ] `stripe-onboarding`
   - [ ] `stripe-checkout`
   - [ ] `stripe-webhook`
   - [ ] `discord-oauth`
   - [ ] `discord-bot`

3. **表示されていない Function がある場合**:
   - Lovable エディタでコードをプッシュすると自動デプロイされる
   - または Supabase CLI で手動デプロイ:
     ```bash
     supabase functions deploy stripe-onboarding
     supabase functions deploy stripe-checkout
     supabase functions deploy stripe-webhook
     supabase functions deploy discord-oauth
     supabase functions deploy discord-bot
     ```

---

## Task 3: Edge Function の動作確認（ヘルスチェック）

### stripe-onboarding のテスト
```bash
curl -X OPTIONS https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-onboarding
```
→ **期待**: HTTP 200（CORS preflight成功）

### stripe-checkout のテスト（認証なし → 401期待）
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-checkout \
  -H "Content-Type: application/json" \
  -d '{}'
```
→ **期待**: HTTP 401 `{"error": "Unauthorized"}`

### stripe-webhook のテスト（署名なし → 400期待）
```bash
curl -X POST https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{}'
```
→ **期待**: HTTP 400 `Missing Stripe-Signature header`

---

## Task 4: Discord OAuth2 リダイレクトURL 設定

### 手順

1. https://discord.com/developers/applications/1476545159297630353/oauth2 を開く
2. **Redirects** セクションに以下のURLを追加:
   ```
   https://preview--member-bridge-flow.lovable.app/buyer/discord/result
   ```
3. 「Save Changes」をクリック

---

## 完了確認

- [ ] STRIPE_SECRET_KEY が `sk_test_` で始まる値で設定済み
- [ ] STRIPE_WEBHOOK_SECRET が `whsec_` で始まる値で設定済み
- [ ] DISCORD_CLIENT_ID が設定済み
- [ ] DISCORD_CLIENT_SECRET が設定済み
- [ ] DISCORD_BOT_TOKEN が設定済み
- [ ] SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY が設定済み
- [ ] ALLOWED_ORIGIN が設定済み
- [ ] 全5 Edge Functions がデプロイされている
- [ ] OPTIONS リクエストで200が返る
- [ ] 認証なしPOSTで401が返る（stripe-checkout）
- [ ] Discord OAuth2 リダイレクトURLが設定済み

---

## トラブルシューティング

### Edge Function が一覧に表示されない
→ `supabase/functions/` ディレクトリ構造を確認。各Function配下に `index.ts` が存在するか確認。

### 環境変数設定後も「not configured」エラー
→ Edge Functions を再デプロイする必要がある。ダッシュボードから「Redeploy」ボタンを押すか、CLI で `supabase functions deploy <function-name>` を実行。

### CORS エラー
→ `ALLOWED_ORIGIN` の値にプロトコル（`https://`）が含まれているか確認。末尾にスラッシュ（`/`）が無いこと。
