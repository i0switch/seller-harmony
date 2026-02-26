# 02_SECURITY_SUPABASE — セキュリティ/Edge/DB監査と修正

## 目的
- 生成コードのセキュリティ問題を潰す
- Supabase Edge Functions と DB（RLS/インデックス/公開設定）に問題がないか検証し修正

## A) ソースコード脆弱性チェック（最低限）
- secretsがフロントに露出していないか検索
  - service_role, STRIPE_SECRET_KEY, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN 等
- XSS/CSRF/権限チェック（RBAC/テナント分離）の抜けを確認
- ログにPIIやトークンを出していないか確認（特にEdge Functionsログ）

## B) Stripe Webhook（Fail-Closedを必ずテストで保証）
- 署名検証は raw body + Stripe-Signature + endpoint secret を使用
- STRIPE_WEBHOOK_SECRET が未設定のとき：
  - 起動失敗 または 受信しても保存のみで処理キュー投入禁止
- 署名不一致は400（または処理拒否）でキュー投入禁止
- stripe_event_id による冪等性をテストで保証（重複受信で二重処理しない）

## C) Discord OAuth（CSRF対策）
- OAuth state 検証必須（不一致なら拒否）
- token/secretをログに出さない
- Botロール階層チェックの結果をエラーコードで返す（UI表示用）

## D) Supabase Edge Functions 監査
- supabase/functions/ を全て列挙し、以下を確認
  - Deno.env から秘密取得（ハードコードなし）
  - 入力バリデーション
  - 署名検証（Stripe/Discord）
  - 過剰権限でDBを触っていないか
- Edge Function のログに secret が出ていないか確認

## E) DB監査（migrations/RLS/インデックス）
- supabase/migrations/ を確認し、RLSが有効か、公開テーブル/危険なポリシーがないか確認
- memberships のインデックス要件（seller_id+status, buyer_id+status, grace_period_ends_at）を確認
- plans.deleted_at があることを確認
- audit_logs.action を列挙値化（CHECK制約 or アプリ層バリデーション）で担保

## 出力（必須）
- docs/security/security-review.md
  - 指摘一覧（重大/高/中/低）
  - 修正内容（ファイル/差分）
  - 残リスク（理由つき）