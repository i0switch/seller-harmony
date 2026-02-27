# テスト25: Supabase RLS・Edge Functions・Secret 監査

> **カテゴリ**: セキュリティ監査  
> **優先度**: P0 (Critical)  
> **推定所要時間**: 45分  
> **前提条件**: Supabase管理画面アクセス権、リポジトリのソースコード  
> **実行方法**: 静的コード検索 + Supabase SQLエディタ + ビルド成果物検査

---

## AIエージェントへの指示

```
あなたはセキュリティ監査エンジニアです。
Supabaseを使用したこのアプリケーションの以下の3領域を監査してください:
1. service_role キーのクライアント露出
2. RLSポリシーの網羅性と正当性
3. Edge Functionsのsecret管理とログ漏洩

リポジトリルート: seller-harmony/
Supabase Project ID: xaqzuevdmeqxntvhamce

「安全」であることを証明するために、全チェック項目にPASS/FAILを記録し、
FAILの場合は具体的な修正コードを提案してください。
```

---

## A. service_role キー露出チェック（静的検索）

### SEC-25-01: フロントエンドコードにservice_roleがないこと

**検証手順**:
```bash
# リポジトリ全体でservice_roleを検索
grep -r "service_role" src/ --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "SERVICE_ROLE" src/ --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "SUPABASE_SERVICE_ROLE" src/ --include="*.ts" --include="*.tsx"

# .envファイルにservice_roleが含まれていないか
grep -r "service_role" .env .env.local .env.production 2>/dev/null
```

**期待結果**:
- [ ] `src/` 配下に `service_role` を含むファイルが **0件** であること
- [ ] `.env` 系にプレースホルダー（`your-service-role-key`）以外の実キーがないこと
- [ ] `src/integrations/supabase/client.ts` が `SUPABASE_PUBLISHABLE_KEY`（anon key）のみ使用

### SEC-25-02: ビルド成果物にservice_roleが含まれないこと

**検証手順**:
```bash
npm run build
grep -r "service_role" dist/ 2>/dev/null
grep -r "eyJ" dist/ --include="*.js" | head -20  # JWT形式のキーを検索
```

**期待結果**:
- [ ] `dist/` にservice_roleに言及するコードが **0件**
- [ ] anon key以外のJWTが埋め込まれていないこと

### SEC-25-03: Vite環境変数にservice_roleが含まれないこと

**検証手順**:
```bash
grep -r "VITE_.*SERVICE_ROLE" vite.config.ts .env* src/
```

**期待結果**:
- [ ] `VITE_` プレフィックスのservice_role変数が **存在しない** こと
  - ※ Viteでは `VITE_` プレフィックスの環境変数のみがクライアントにバンドルされる

---

## B. Supabase Edge Functionsのsecret管理

### SEC-25-04: Edge Functionsのsecret参照パターン

**検証手順**: 各Edge Function内の `Deno.env.get()` 呼び出しを列挙

| Edge Function | 使用するsecret | 取得方法 | 安全? |
|---|---|---|---|
| `stripe-webhook` | `STRIPE_SECRET_KEY` | `Deno.env.get()` | ✅ サーバーサイド |
| `stripe-webhook` | `STRIPE_WEBHOOK_SECRET` | `Deno.env.get()` | ✅ サーバーサイド |
| `stripe-webhook` | `DISCORD_BOT_TOKEN` | `Deno.env.get()` | ✅ サーバーサイド |
| `stripe-webhook` | `SUPABASE_SERVICE_ROLE_KEY` | `Deno.env.get()` | ✅ サーバーサイド |
| `stripe-checkout` | `STRIPE_SECRET_KEY` | `Deno.env.get()` | ✅ サーバーサイド |
| `stripe-checkout` | `SUPABASE_ANON_KEY` | `Deno.env.get()` | ✅ anon key |
| `stripe-onboarding` | `STRIPE_SECRET_KEY` | `Deno.env.get()` | ✅ サーバーサイド |
| `stripe-onboarding` | `SUPABASE_SERVICE_ROLE_KEY` | `Deno.env.get()` | ✅ サーバーサイド |
| `discord-bot` | `DISCORD_BOT_TOKEN` | `Deno.env.get()` | ✅ サーバーサイド |
| `discord-bot` | `SUPABASE_SERVICE_ROLE_KEY` | `Deno.env.get()` | ✅ サーバーサイド |
| `discord-oauth` | `DISCORD_CLIENT_ID` | `Deno.env.get()` | ✅ サーバーサイド |
| `discord-oauth` | `DISCORD_CLIENT_SECRET` | `Deno.env.get()` | ✅ サーバーサイド |
| `discord-oauth` | `SUPABASE_SERVICE_ROLE_KEY` | `Deno.env.get()` | ✅ サーバーサイド |

- [ ] 全secretがサーバーサイド（Edge Function内）のみで参照されている
- [ ] クライアントに返すResponseにsecretが含まれていないこと

### SEC-25-05: Edge Functionsのログ漏洩チェック

**検証手順**:
```bash
# Edge Functions内のconsole.log/errorでsecretやトークンが出力されないか
grep -n "console\.\(log\|error\|warn\)" supabase/functions/*/index.ts
```

**確認項目**:
- [ ] `console.error` でアクセストークン、リフレッシュトークンが出力されない
- [ ] `console.log` でStripeのsecret keyが出力されない
- [ ] エラーメッセージにsecretの部分文字列が含まれない
- [ ] `stripe-webhook`: エラーログの `errorMsg` にsecretが混入しないこと

### SEC-25-06: Edge FunctionsのJWT検証設定

**検証手順**: `supabase/config.toml` を確認

| Function | `verify_jwt` | 安全性 |
|---|---|---|
| `stripe-webhook` | `false` | ✅ Stripeが署名で認証（JWTは不要） |
| `stripe-checkout` | `false` | ⚠️ **要確認**: 関数内でAuthヘッダー検証している |
| `stripe-onboarding` | `false` | ⚠️ **要確認**: 関数内でAuthヘッダー検証している |
| `discord-bot` | `false` | ⚠️ **要確認**: 関数内でAuthヘッダー検証している |
| `discord-oauth` | `false` | ⚠️ **要確認**: 関数内でAuthヘッダー検証している |

**追加確認**:
- [ ] `verify_jwt=false` の各Functionが、内部でAuthorizationヘッダーの`Bearer` トークンを検証している
- [ ] `stripe-checkout`: L24-28 で Authorization チェック → ✅
- [ ] `stripe-onboarding`: L36-40 で Authorization チェック → ✅
- [ ] `discord-bot`: L26-30 で Authorization チェック → ✅
- [ ] `discord-oauth`: L27-31 で Authorization チェック → ✅

---

## C. Row Level Security (RLS) 監査

### SEC-25-07: 全テーブルのRLS有効化確認

**検証手順（Supabase SQLエディタ）**:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**期待結果**: 以下の全テーブルに `rowsecurity = true` が設定されていること

| テーブル | RLS有効 | PASS/FAIL |
|---|---|---|
| `users` | | |
| `seller_profiles` | | |
| `stripe_connected_accounts` | | |
| `discord_servers` | | |
| `plans` | | |
| `buyers` | | |
| `discord_identities` | ✅ (migration 000001) | |
| `checkout_sessions` | | |
| `memberships` | | |
| `role_assignments` | ✅ (migration 000001) | |
| `stripe_webhook_events` | ✅ (migration 000001) | |
| `audit_logs` | ✅ (migration 000001) | |
| `system_announcements` | | |

⚠️ **注意**: migration 000001 では `discord_identities`, `audit_logs`, `stripe_webhook_events`, `role_assignments` のRLSのみ設定されている。他のテーブルのRLS状態を確認する必要がある。

### SEC-25-08: RLSポリシーの妥当性確認

**検証手順（Supabase SQLエディタ）**:
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**確認すべきポリシーマトリクス**:

| テーブル | 必要なポリシー | 存在 | 正当性 |
|---|---|---|---|
| `users` | 自分のレコードのみ参照可 | | |
| `seller_profiles` | sellerは自分のprofileのみ、adminは全件 | | |
| `plans` | sellerは自分のplanのみ、buyerはpublic planのみ | | |
| `memberships` | buyerは自分、sellerは自テナント、adminは全件 | | |
| `discord_identities` | `auth.uid() = user_id` | ✅ | |
| `audit_logs` | platform_adminのみSELECT | ✅ | |
| `stripe_webhook_events` | platform_adminのみSELECT | ✅ | |
| `role_assignments` | buyer: 自分のmembershipに紐づくもの | ✅ | |
| `role_assignments` | seller: 自テナントのmembershipに紐づくもの | ✅ | |

### SEC-25-09: 公開テーブル（RLS無効）のリスク評価

**検証手順**:
1. SEC-25-07で `rowsecurity = false` のテーブルを列挙
2. それぞれについて「anon keyで直接アクセスできるか」を確認

```bash
# anon keyでの直接テーブルアクセステスト
curl "https://xaqzuevdmeqxntvhamce.supabase.co/rest/v1/users?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

- [ ] 認証なしで機密テーブルにアクセスできないこと
- [ ] RLS無効テーブルに機密データ（メール、トークン等）が含まれないこと

---

## D. platform_admin 権限昇格防止

### SEC-25-10: サインアップ時の自己昇格防止

**検証手順（Supabase SQLエディタ）**:
```sql
-- トリガー関数の確認
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

**期待結果**:
- [ ] `role = 'platform_admin'` がメタデータで指定されても `buyer` に降格されること
- [ ] トリガーに `SECURITY DEFINER` が設定されていること

**実際のテスト**:
```bash
# メタデータにplatform_adminを指定してサインアップ（Supabase Auth API）
curl -X POST "https://xaqzuevdmeqxntvhamce.supabase.co/auth/v1/signup" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"attacker@test.com","password":"password123","data":{"role":"platform_admin"}}'
```

- [ ] 作成されたユーザーの `role` が `buyer` であること（`platform_admin` でないこと）

---

## E. CORS設定の監査

### SEC-25-11: Edge FunctionsのCORS設定

**現在の設定**（全Edge Function共通）:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
};
```

**リスク評価**:
- [ ] `Access-Control-Allow-Origin: *` → ⚠️ 本番では特定ドメインに制限すべき
- [ ] 推奨修正:
  ```typescript
  const ALLOWED_ORIGINS = [
    'https://preview--member-bridge-flow.lovable.app',
    'http://localhost:5173',
  ];
  ```

---

## F. Open Redirect防止

### SEC-25-12: discord-oauthのredirect_uri制限

**現在の実装**:
```typescript
const ALLOWED_REDIRECT_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?\/buyer\/discord\/result$/,
  /^https:\/\/.*\.lovable\.app\/buyer\/discord\/result$/,
  /^https:\/\/.*\.supabase\.co\/.*$/,
];
```

- [ ] **PASS**: リダイレクトURIがホワイトリストで制限されている
- [ ] ⚠️ `\.supabase\.co\/.*$` パターンが広すぎないか確認
  - 攻撃者が `.supabase.co` サブドメインを利用する可能性は低いが要検討

---

## テスト完了チェックリスト

| セクション | 項目 | PASS | FAIL | 要改善 |
|---|---|---|---|---|
| A. service_role露出 | 3項目 | | | |
| B. Edge Functions | 3項目 | | | |
| C. RLS | 3項目 | | | |
| D. 権限昇格防止 | 1項目 | | | |
| E. CORS | 1項目 | | | |
| F. Open Redirect | 1項目 | | | |

---

## Done条件

```
全SECチェック項目がPASSであること。
FAIL項目がある場合:
1. 修正コードを生成
2. 修正を適用
3. 再監査を実施
4. 3回連続PASSでDone
```
