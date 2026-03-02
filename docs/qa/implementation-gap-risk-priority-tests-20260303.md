# 実装ギャップ・本番リスク・優先修正順・必要テスト項目

作成日: 2026-03-03  
対象: seller-harmony

---

## 1. 未実装一覧（コード確認ベース）

### Platform API
- `terminateJob` が未実装（例外 `Not Implemented`）
- `saveAnnouncement` が未実装（例外 `Not Implemented`）

### Seller API（Supabase実装）
- `getMemberTimeline` が空配列固定
- `getCrosscheck` が空配列固定
- `runCrosscheck` が `jobId: "not_implemented"` 固定
- `getWebhooks` が空配列固定

### Buyer API / Discord連携
- `buyerApi.requestRoleGrant()` は `discord-bot` に `action: "grant_role"` を送るが、`discord-bot` 側は `validate_bot_permission` しか実装しておらず機能不整合

### FastAPI backend（参考）
- `backend/app/api/endpoints/*.py` はモック応答中心で、本番主経路（Supabase Edge Functions）としては未接続

---

## 2. 本番リスク

### P0（高）
1. **再付与導線の機能不整合**
   - 症状: UIで「ロール再付与をリクエスト」しても `Unknown action` になり得る
   - 影響: 購入者がロール復旧できず、サポート負荷増大

2. **Webhook失敗時の自動再試行抑止**
   - 現状: `stripe-webhook` は処理失敗時でも 200 を返す設計
   - 影響: Stripe側自動リトライが効かず、運用で見落とすと状態不整合が残る

3. **オンボーディング状態のローカル依存**
   - 現状: セラーのオンボーディング進捗が `localStorage` 基準
   - 影響: 端末変更/ブラウザ消去で進捗不一致、権限制御やUI遷移の整合性低下

### P1（中）
4. **Seller運用画面の実データ欠落**
   - 対象: timeline/crosscheck/webhooks
   - 影響: 障害解析・運用監視がUI上で完結しない

5. **Platform運用機能の未完了**
   - 対象: retry queue terminate、announcement 保存
   - 影響: 管理運用の一部が手動/外部依存になる

### P2（低〜中）
6. **FastAPIモック層との二重構成による認知コスト**
   - 影響: 新規メンバーが本番経路を誤認しやすい

---

## 3. 優先修正順（実行順）

1. **P0-1: `discord-bot` に `grant_role` アクション実装**
   - あわせて `buyerApi.requestRoleGrant()` の成功/失敗契約を明確化

2. **P0-2: Webhook失敗時の再処理戦略を統一**
   - 方針A: 5xx返却でStripe再試行を活かす
   - 方針B: 200返却維持なら、確実な再処理ジョブ（Queue/Cron）を必須化

3. **P0-3: オンボーディング進捗のDB化**
   - `localStorage` 依存を段階廃止し、`seller_profiles` 等に状態保持

4. **P1-1: Seller APIのスタブ実装を本実装化**
   - timeline / crosscheck / webhooks を実データ返却へ

5. **P1-2: Platform APIの未実装を解消**
   - `terminateJob`, `saveAnnouncement` を実装

6. **P2: FastAPIの位置づけを明文化**
   - READMEで「モック契約層」か「将来本体」かを明示

---

## 4. 必要テスト項目（追加・強化）

## 4.1 最優先（P0対応テスト）

- [ ] **E2E**: MemberMe から「ロール再付与リクエスト」実行 → `grant_role` 成功レスポンス確認
- [ ] **E2E**: `grant_role` 失敗（権限不足/対象ロールなし）時のUI表示・再試行導線
- [ ] **Integration**: `stripe-webhook` 失敗時の動作（HTTPステータス、`stripe_webhook_events.processing_status`、再実行可否）
- [ ] **Integration**: 重複イベント時の冪等性（同一 `stripe_event_id`）
- [ ] **Unit/Integration**: オンボーディング状態が端末変更後も一貫すること（DB基準）

## 4.2 中優先（P1対応テスト）

- [ ] **Seller画面テスト**: Timeline表示（時系列、ページング、空状態）
- [ ] **Seller画面テスト**: Crosscheckの判定種別フィルタと再実行
- [ ] **Seller画面テスト**: Webhooks一覧のステータス・再処理導線
- [ ] **Platform画面テスト**: RetryQueue terminate 操作の成功/失敗
- [ ] **Platform画面テスト**: Announcement 保存・公開状態遷移

## 4.3 回帰（既存機能の安全網）

- [ ] `checkout.session.completed` → `pending_discord/active` 分岐
- [ ] `discord-oauth` 成功時 `pending_discord -> active` 遷移
- [ ] `invoice.payment_failed` → `grace_period`、`invoice.payment_succeeded` で復帰
- [ ] `customer.subscription.deleted` / `charge.refunded` でロール剥奪分岐（manual_override含む）
- [ ] 主要ロール（platform/seller/buyer）のRLS逸脱がないこと

---

## 5. 受け入れ完了条件（最小）

- P0項目がすべて実装・テスト緑化
- `qa:vscode:auto`（最低1回）と Hosted E2E で主要導線が通る
- Webhook障害時の再処理手順が「コード + 運用手順」で閉じる
- オンボーディング状態がDB基準で一貫
