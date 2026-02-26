---
name: stripe-cli-dev
description: Stripe CLIを利用してローカル開発環境でのWebhookイベントの転送（listen）やテストイベントのトリガー（trigger）を行うスキルパッケージ。「Stripeローカルテスト」「Stripe Webhookテスト」「Stripe CLI連携」などで発火。
---

# Stripe CLI Development Skill

> 💡 **stripe-cli-dev スキルを読み込みました**
> Stripe CLIを用いたローカルのWebhookテストおよびイベント発火の自動化をサポートします。

本スキルは、事前にWindows等へStripe CLIがインストールされ、`stripe login` が完了していることを前提とします。ローカルで稼働している決済パイプライン（例: Supabase Edge Functions）に向けたリアルタイムテストを支援します。

## 機能概要

1. **Webhookのローカル転送 (Listen)**
   - Stripeアカウント上で発生したイベントを、ローカルで立ち上がっているWebhookエンドポイント（例: `http://localhost:54321/functions/v1/stripe-webhook`）へ転送します。
2. **イベントのモック送信 (Trigger)**
   - 故意に `checkout.session.completed` などの特定イベントを発生させ、決済完了時のロジックが正しく機能するかをテストします。

## ディレクトリ構成

- `scripts/listen.ps1`: Webhookをローカルのエンドポイントへ転送するPowerShellヘルパースクリプト
- `scripts/trigger.ps1`: 指定したStripeイベントをトリガーするヘルパースクリプト

---

## 使い方（エージェントへの指示）

以下のように指示することで、決済機能の開発・テスト環境を準備できます。

### 1. Webhook転送の開始
> 「StripeのWebhookリスニングを開始して」
> 「ローカルのEdge FunctionsへStripeのイベントを転送して」

**実行される処理:**
```bash
# デフォルトでSupabase Edge Functionsの54321ポートへ転送します
.\.agent\skills\stripe-cli-dev\scripts\listen.ps1
```
*(注意: 実行時にターミナルへ出力される `whsec_...` (Webhook署名シークレット) は、環境変数 `STRIPE_WEBHOOK_SECRET` に設定して手動テスト等で署名検証を行うのに利用します。)*

### 2. テストイベントの送信
> 「決済完了イベント（checkout.session.completed）をトリガーして」
> 「別のStripeイベント（例: customer.created）をテストして」

**実行される処理:**
```bash
# 引数なしの場合は checkout.session.completed をトリガーします
.\.agent\skills\stripe-cli-dev\scripts\trigger.ps1 -EventName "checkout.session.completed"
```

## エラー時の対応・トラブルシューティング

- **`stripe : The term 'stripe' is not recognized` と出る場合**: 
  Stripe CLIがシステム要件にインストールされていないか、PATHが通っていません。`winget install Stripe.cli`などでインストールし直してください。
- **Webhookがエラー（400/500）になる場合**:
  ローカルのSupabaseコンテナ（またはそれに準ずるローカルサーバー）が立ち上がっていない、もしくはコード側の署名検証ロジックで署名シークレット (`STRIPE_WEBHOOK_SECRET`) が一致していません。
