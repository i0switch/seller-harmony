# 残タスク一覧 — seller-harmony 本番デプロイ前

> 最終更新: 2026-03-03  
> ステータス: ユニットテスト 47/47 ✅ | E2E 166/166 ✅ | ビルド ✅ | Supabase Advisor ✅

---

## 🔴 MUST（デプロイ前に必須）

### 1. Supabase — Leaked Password Protection 有効化

| 項目 | 内容 |
|---|---|
| **重要度** | P0 — セキュリティ |
| **対象** | Supabase ダッシュボード > Authentication > Settings |
| **現状** | パスワード漏洩保護が無効。ユーザーが HaveIBeenPwned に登録済みのパスワードで登録できてしまう |
| **対応** | ダッシュボードで「Leaked Password Protection」を **ON** にする |
| **所要時間** | 1分（GUI操作のみ） |
| **参考** | https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection |

---

### 2. 環境変数の確認・設定

| 項目 | 内容 |
|---|---|
| **重要度** | P0 — 動作必須 |
| **対象** | Supabase Edge Functions の Secrets / Lovable 環境変数 |
| **現状** | ローカル開発では `.env` 参照だが、本番環境での設定状況が未確認 |

#### 必要な環境変数一覧

| 変数名 | 用途 | 設定場所 |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe API 秘密鍵 | Supabase Secrets |
| `STRIPE_WEBHOOK_SECRET` | Webhook 署名検証用シークレット | Supabase Secrets |
| `DISCORD_BOT_TOKEN` | Discord Bot API トークン | Supabase Secrets |
| `DISCORD_CLIENT_ID` | Discord OAuth2 クライアントID | Supabase Secrets |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 クライアントシークレット | Supabase Secrets |
| `ALLOWED_ORIGINS` | CORS / リダイレクト許可オリジン（カンマ区切り） | Supabase Secrets |
| `SUPABASE_URL` | Supabase プロジェクトURL | 自動設定済み |
| `SUPABASE_ANON_KEY` | Supabase 匿名キー | 自動設定済み |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function 内で RLS バイパス用 | Supabase Secrets |

#### 確認コマンド

```bash
# Supabase CLI で secrets 一覧確認
supabase secrets list --project-ref xaqzuevdmeqxntvhamce
```

---

### 3. Stripe Webhook エンドポイント登録

| 項目 | 内容 |
|---|---|
| **重要度** | P0 — 決済フロー必須 |
| **対象** | Stripe Dashboard > Developers > Webhooks |
| **現状** | ローカル開発は `stripe listen --forward-to` で対応。本番用 Webhook URL 未登録の可能性 |

#### 登録すべきエンドポイント

```
URL: https://xaqzuevdmeqxntvhamce.supabase.co/functions/v1/stripe-webhook
```

#### 必要なイベント

| イベント | 用途 |
|---|---|
| `checkout.session.completed` | 購入完了 → メンバーシップ作成 |
| `invoice.payment_succeeded` | サブスクリプション更新成功 |
| `invoice.payment_failed` | 支払い失敗 → grace_period |
| `invoice.voided` | 請求書無効 → ステータス変更 |
| `customer.subscription.updated` | サブスクリプション更新（キャンセル/復帰） |
| `customer.subscription.deleted` | サブスクリプション削除 → expired |
| `charge.refunded` | 返金処理 |
| `charge.dispute.created` | 紛争発生 |
| `charge.dispute.closed` | 紛争終了 |

#### Connect対応

```
✅ Connect アプリケーション用 Webhook も同一 URL で受信
☑️ 「接続されたアカウントからイベントを受信」にチェック
```

---

### 4. Edge Functions デプロイ

| 項目 | 内容 |
|---|---|
| **重要度** | P0 — 全機能必須 |
| **対象** | 5つの Edge Function |

```bash
# 全 Edge Functions を一括デプロイ
supabase functions deploy stripe-onboarding --project-ref xaqzuevdmeqxntvhamce
supabase functions deploy stripe-checkout --project-ref xaqzuevdmeqxntvhamce
supabase functions deploy stripe-webhook --project-ref xaqzuevdmeqxntvhamce
supabase functions deploy discord-oauth --project-ref xaqzuevdmeqxntvhamce
supabase functions deploy discord-bot --project-ref xaqzuevdmeqxntvhamce
```

---

## 🟡 SHOULD（デプロイ直後に対応推奨）

### 5. Discord OAuth トークンの暗号化

| 項目 | 内容 |
|---|---|
| **重要度** | P1 — セキュリティ |
| **対象** | `supabase/functions/discord-oauth/index.ts` |
| **現状** | `discord_identities` テーブルに `access_token` / `refresh_token` が**平文**で保存されている |
| **要件** | 要件定義 §8-4「トークンは暗号化して保存」 |

#### 対応方針

```
選択肢A: Supabase Vault を使用
  - pgsodium の encrypt/decrypt を利用
  - DB レベルで暗号化、Edge Function で透過的にアクセス

選択肢B: アプリ層で AES-256-GCM 暗号化
  - Edge Function 内で暗号化してから INSERT
  - 復号キーを Supabase Secrets に保管
```

#### 影響範囲

| ファイル | 変更内容 |
|---|---|
| `supabase/functions/discord-oauth/index.ts` | トークン保存時に暗号化 |
| `supabase/functions/discord-bot/index.ts` | トークン読み取り時に復号（API呼び出し時） |
| DB マイグレーション | カラム型変更不要（text→暗号文テキスト） |

---

### 6. JS バンドルサイズの最適化（コード分割）

| 項目 | 内容 |
|---|---|
| **重要度** | P1 — パフォーマンス |
| **対象** | `vite.config.ts` |
| **現状** | 単一チャンク **1,175 KB**（Vite の 500KB 警告あり） |
| **目標** | 初回ロード 500KB 以下 |

#### 対応方針

```typescript
// vite.config.ts に追加
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', /* ...shadcn依存 */],
        query: ['@tanstack/react-query'],
        stripe: ['@stripe/stripe-js'],
      }
    }
  }
}
```

#### ルートベース遅延読み込み

```typescript
// App.tsx のルート定義を lazy() に変更
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'));
const PlatformDashboard = lazy(() => import('./pages/platform/PlatformDashboard'));
// ... 他の全ページコンポーネント
```

---

### 7. Seller Webhook データのサーバーサイドフィルタリング

| 項目 | 内容 |
|---|---|
| **重要度** | P1 — セキュリティ + パフォーマンス |
| **対象** | `src/services/api/supabase/seller.ts` |
| **現状** | `stripe_webhook_events` を全件取得後にクライアント側で `seller_id` フィルタリングしている（約405行目、543行目） |

#### 問題

```
1. セキュリティ: 他 seller の webhook データがクライアントに送信される
2. パフォーマンス: データ量増加に伴いレスポンスが劣化
3. RLS で防御されているはずだが、ポリシーの抜けがあれば情報漏洩
```

#### 修正方法

```typescript
// Before (クライアントフィルタ)
const { data } = await supabase.from('stripe_webhook_events').select('*');
return data?.filter(e => e.seller_id === user.id) ?? [];

// After (DBフィルタ)
const { data } = await supabase
  .from('stripe_webhook_events')
  .select('*')
  .eq('seller_id', user.id)
  .order('created_at', { ascending: false })
  .limit(100);
```

---

### 8. 会員一覧の名前/メール表示修正

| 項目 | 内容 |
|---|---|
| **重要度** | P2 — UX |
| **対象** | `src/services/api/supabase/seller.ts` — `getMembers()` |
| **現状** | 会員(buyer)の `name`/`email` に `buyer_id`（UUID）が表示されている |

#### 原因

```typescript
// 現在のマッピング
name: m.buyer_id,  // ← UUID が表示される
email: m.buyer_id, // ← UUID が表示される
```

#### 修正方法

```typescript
// memberships テーブルを users テーブルと JOIN して取得
const { data } = await supabase
  .from('memberships')
  .select(`
    *,
    buyer:users!memberships_buyer_id_fkey (
      display_name,
      email
    )
  `)
  .eq('seller_id', user.id);

// マッピング
name: m.buyer?.display_name ?? '未設定',
email: m.buyer?.email ?? '不明',
```

---

## 🟢 NICE TO HAVE（将来的に対応）

### 9. `account.updated` Webhook ハンドラー追加

| 項目 | 内容 |
|---|---|
| **重要度** | P2 |
| **対象** | `supabase/functions/stripe-webhook/index.ts` |
| **現状** | Stripe Express オンボーディング完了時の `account.updated` イベントが未処理 |
| **影響** | seller が Stripe 審査完了しても `charges_enabled`/`payouts_enabled` が DB に反映されない |

#### 実装案

```typescript
case "account.updated": {
  const account = event.data.object;
  await supabaseAdmin
    .from("stripe_connected_accounts")
    .update({
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", account.id);
  break;
}
```

---

### 10. Grace Period 自動期限切れ Cron ジョブ

| 項目 | 内容 |
|---|---|
| **重要度** | P2 |
| **対象** | Supabase pg_cron / Edge Function スケジューラ |
| **現状** | `expire_grace_period_memberships()` 関数は存在するが定期実行が未設定 |
| **影響** | grace_period のメンバーシップが期限切れ後も active のまま残る |

#### 設定方法

```sql
-- Supabase Dashboard > SQL Editor で実行
SELECT cron.schedule(
  'expire-grace-period',
  '0 */6 * * *',  -- 6時間ごと
  $$SELECT public.expire_grace_period_memberships()$$
);
```

---

### 11. FastAPI バックエンド実装（Platform Admin API）

| 項目 | 内容 |
|---|---|
| **重要度** | P3 |
| **対象** | `backend/app/api/` 配下全ファイル |
| **現状** | **全エンドポイントがハードコードされたモックデータ**を返す。認証ミドルウェアも未実装 |
| **影響** | Platform Admin ダッシュボードが実データを表示しない |

#### 未実装エンドポイント一覧

| ルート | ファイル | 現状 |
|---|---|---|
| `GET /api/platform/stats` | `platform.py` | ダミー統計 |
| `GET /api/platform/tenants` | `platform.py` | ダミーテナント3件 |
| `GET /api/platform/tenants/:id` | `platform.py` | ダミー詳細 |
| `POST /api/platform/tenants/:id/suspend` | `platform.py` | no-op |
| `GET /api/platform/webhooks` | `platform.py` | ダミーイベント2件 |
| `POST /api/platform/webhooks/:id/retry` | `platform.py` | no-op |
| `GET /api/platform/retry-queue` | `platform.py` | 空配列 |
| `GET /api/platform/announcements` | `platform.py` | 空配列 |
| `POST /api/platform/announcements` | `platform.py` | no-op |
| `GET /api/platform/system-control` | `platform.py` | ダミー設定 |
| `PUT /api/platform/system-control` | `platform.py` | no-op |
| `POST /api/auth/login` | `auth.py` | ダミー成功 |
| `GET /api/buyer/me` | `buyer.py` | ダミーデータ |
| `GET /api/seller/stats` | `seller.py` | ダミー統計 |

#### 対応方針

```
1. Supabase service_role_key を使った Python SDK 連携
2. JWT 検証ミドルウェアの追加（Supabase JWT → FastAPI Depends）
3. 各エンドポイントの実 SQL クエリ実装
4. Platform Admin のみアクセス可能なロールガード
```

---

### 12. Discord ロール操作の非同期キュー化

| 項目 | 内容 |
|---|---|
| **重要度** | P3 |
| **対象** | `supabase/functions/stripe-webhook/index.ts` |
| **現状** | Webhook ハンドラー内で Discord API を同期的に呼び出している |
| **問題** | Discord API のレートリミット（50 req/sec）に引っかかると Webhook 処理がタイムアウトする |

#### 対応方針

```
1. role_assignments テーブルに desired_state を書き込み
2. 別の Edge Function (discord-role-sync) で定期的にキューを処理
3. Webhook ハンドラーは DB 更新のみで即座に 200 を返す
```

---

### 13. エラーモニタリング導入

| 項目 | 内容 |
|---|---|
| **重要度** | P3 |
| **対象** | フロントエンド + Edge Functions |
| **現状** | エラーは `console.error` のみ。本番環境でのエラー追跡手段なし |

#### 推奨ツール

| ツール | 用途 | 無料枠 |
|---|---|---|
| Sentry | フロントエンド + Edge Function エラー | 5K events/月 |
| LogFlare | Supabase ネイティブログ | Supabase 統合済み |
| Axiom | 構造化ログ + アラート | 500MB/月 |

---

## 完了済みタスク（参考）

| # | タスク | ステータス |
|---|---|---|
| ✅ | プロジェクト構造スキャン（400行レポート） | 完了 |
| ✅ | フロントエンド 8ファイル深層分析（35+問題） | 完了 |
| ✅ | バックエンド/Edge Function 10ファイル分析（45+問題） | 完了 |
| ✅ | P0 セキュリティバグ 5件修正 | 完了 |
| ✅ | Edge Function 重大バグ 8件修正 | 完了 |
| ✅ | フロントエンド バグ 4件修正 | 完了 |
| ✅ | ユニットテスト修正 + 全47件パス | 完了 |
| ✅ | E2E テスト修正 + 全166件パス | 完了 |
| ✅ | Supabase DB UNIQUE制約 + インデックス追加 | 完了 |
| ✅ | 関数 search_path セキュリティ修正 | 完了 |
| ✅ | 本番ビルド成功確認 | 完了 |
