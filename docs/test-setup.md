# テスト・自動QA環境セットアップ (Test Setup & Automation)

このドキュメントでは、Stripe Webhook連携、Discord OAuth連携、および全体のE2Eテストを自動化するための環境要件とセットアップ手順を定義します。

## 1. 環境変数の参照経路と要件

Supabase (Edge Functions) および Backend (FastAPI) において、以下の4つの主要なシークレットが使用されています。

| 環境変数名 | 使用箇所 | 役割 |
|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | Backend (`app.main`, `app.core.config`)<br/>Supabase (`stripe-webhook`) | StripeからのWebhookリクエストの署名検証に必要。未設定時は処理を拒否する(Fail Closed) |
| `DISCORD_BOT_TOKEN` | Backend (`app.core.config`)<br/>Supabase (`stripe-webhook`, `discord-bot`) | Discord APIを叩いてユーザーのサーバー参加や自動的なRoll付与・剥奪を行うために必要。 |
| `DISCORD_CLIENT_ID` | Supabase (`discord-oauth`) | OAuth連携のAuthorization URL生成時や、CodeからTokenへの交換時に使用。 |
| `DISCORD_CLIENT_SECRET` | Supabase (`discord-oauth`) | OAuthフローでのToken取得 (Client Credentials / Authorization Code) 時に必要。 |

> **注意**: これらは**本番用とテスト用で明確に分ける**必要があり、E2Eやローカルテストでは必ずテスト用シークレット / 対象Guild・Roleを使用します。

## 2. ローカルテスト用の追加環境変数

誤って本番環境のDiscordサーバーに影響を与えないよう、ローカルおよびCI検証用に以下の変数を `.env` および `backend/.env` に追加します。

```env
# ====== Discord Test Environment (E2E & Local QA) ======
DISCORD_TEST_GUILD_ID="YOUR_TEST_GUILD_ID"
DISCORD_TEST_ROLE_ID="YOUR_TEST_ROLE_ID"
```

## 3. Stripe Local Webhook 転送設定

ローカルテストでは、Stripe CLI を利用してモックWebhookを受信します。

```bash
# Stripe CLI ログイン
stripe login

# バックエンドまたはSupabase Edge Functions へのフォワード
stripe listen --forward-to http://localhost:8000/api/platform/webhooks/stripe
# ※実際の転送先ポートとパスはBackendの起動状態に合わせて調整
```

## 4. テスト実行コマンド (Preflight)

システム全体をテストする際のプレフライトコマンド群です。QAループで常に通る必要があります。

```bash
# Frontend
npm run build
npm run test
npm run lint

# Backend
cd backend
pytest

# E2E (Playwright)
npx playwright test
```
