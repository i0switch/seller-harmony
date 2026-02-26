# 01_TRACEABILITY — 要件トレーサビリティ作成とギャップ修正

## 目的
「コード/仕様が要件定義どおりか」を証明できる形にする。

## 手順
1. 要件定義_ai_optimized.md を読み、チェックリストを作成
2. docs/qa/requirements-traceability.md を新規作成し、以下の列で表を作る
   - Requirement（要件）
   - Implementation（該当コード/関数/ファイル）
   - Tests（単体/結合テスト）
   - E2E（UIで確認するシナリオ）
   - Status（PASS/FAIL/TODO）
3. PASSでないものは task として分解し、実装修正→テスト追加→E2E確認まで実施
4. 「仕様が曖昧」な場合は “ASSUMPTION” として明記し、要件側に戻すべきか判断する

## 最低限、必ず表に含める要件（抜粋）
- memberships 状態機械（pending_discord/active/grace_period/cancel_scheduled/payment_failed/canceled/expired/refunded）
- grace_period の猶予（最終失敗確定まで剥奪しない）
- cancel_at_period_end=true → cancel_scheduled 扱い
- ロール競合（同一roleを要求する有効membershipがあれば剥奪スキップ）
- plans.deleted_at（論理削除）
- audit_logs の action列挙・相関ID
- APIのページングレスポンス { items, page, page_size, total_count }
- Stripe Webhook署名検証 Fail-Closed
- Discord OAuth state 検証
- Buyerの誤アカウント連携防止UX（discord confirmでusername確認）