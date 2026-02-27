# AIエージェント テストプロンプト集 — 総合インデックス

> **対象アプリ**: seller-harmony (ファンクラブ自動運用インフラ SaaS)  
> **ホスティング**: Lovable  
> **テスト環境URL**: `https://preview--member-bridge-flow.lovable.app/`  
> **最終更新**: 2026-02-27  
> **テストファイル数**: 27（UI 23 + セキュリティ・結合 4）

---

## テスト実行の前提条件

- アプリは **Mock API モード** (`VITE_USE_MOCK_API=true`) で動作している
- 外部API (Stripe / Discord) は実機接続なし。Edge Function呼び出しはモック/スタブで処理される
- テストはブラウザ上のUI操作で完結する（バックエンドへの直接アクセス不要）
- 各テストファイルは **独立して実行可能** — 依存関係なし

---

## テストファイル一覧

| # | ファイル名 | カテゴリ | 推定所要時間 |
|---|---|---|---|
| 01 | [01_LANDING_AND_ROUTING.md](01_LANDING_AND_ROUTING.md) | ランディング・ルーティング・404 | 10分 |
| 02 | [02_SELLER_AUTH.md](02_SELLER_AUTH.md) | Seller 認証（登録・ログイン） | 15分 |
| 03 | [03_SELLER_ONBOARDING.md](03_SELLER_ONBOARDING.md) | Seller オンボーディング全4ステップ | 20分 |
| 04 | [04_SELLER_DASHBOARD.md](04_SELLER_DASHBOARD.md) | Seller ダッシュボード | 15分 |
| 05 | [05_SELLER_PLANS.md](05_SELLER_PLANS.md) | Seller プラン管理（CRUD・公開/停止） | 25分 |
| 06 | [06_SELLER_MEMBERS.md](06_SELLER_MEMBERS.md) | Seller 会員管理（一覧・詳細・アクション） | 25分 |
| 07 | [07_SELLER_CROSSCHECK.md](07_SELLER_CROSSCHECK.md) | Seller クロスチェック（不整合検出） | 20分 |
| 08 | [08_SELLER_WEBHOOKS.md](08_SELLER_WEBHOOKS.md) | Seller Webhook履歴 | 15分 |
| 09 | [09_SELLER_DISCORD_SETTINGS.md](09_SELLER_DISCORD_SETTINGS.md) | Seller Discord設定 | 15分 |
| 10 | [10_PLATFORM_AUTH.md](10_PLATFORM_AUTH.md) | Platform Admin 認証 | 10分 |
| 11 | [11_PLATFORM_DASHBOARD.md](11_PLATFORM_DASHBOARD.md) | Platform ダッシュボード | 15分 |
| 12 | [12_PLATFORM_TENANTS.md](12_PLATFORM_TENANTS.md) | Platform テナント管理（停止/再開） | 25分 |
| 13 | [13_PLATFORM_WEBHOOKS.md](13_PLATFORM_WEBHOOKS.md) | Platform Webhook監視 | 15分 |
| 14 | [14_PLATFORM_RETRY_QUEUE.md](14_PLATFORM_RETRY_QUEUE.md) | Platform リトライキュー | 20分 |
| 15 | [15_PLATFORM_ANNOUNCEMENTS.md](15_PLATFORM_ANNOUNCEMENTS.md) | Platform お知らせ管理（CRUD） | 20分 |
| 16 | [16_PLATFORM_SYSTEM_CONTROL.md](16_PLATFORM_SYSTEM_CONTROL.md) | Platform システム制御（Kill Switch） | 15分 |
| 17 | [17_BUYER_CHECKOUT.md](17_BUYER_CHECKOUT.md) | Buyer 決済完了フロー | 15分 |
| 18 | [18_BUYER_DISCORD_FLOW.md](18_BUYER_DISCORD_FLOW.md) | Buyer Discord連携（確認→OAuth→結果） | 20分 |
| 19 | [19_BUYER_MYPAGE.md](19_BUYER_MYPAGE.md) | Buyer マイページ | 20分 |
| 20 | [20_RESPONSIVE_AND_MOBILE.md](20_RESPONSIVE_AND_MOBILE.md) | レスポンシブ・モバイルUI | 25分 |
| 21 | [21_ERROR_HANDLING_AND_EDGE_CASES.md](21_ERROR_HANDLING_AND_EDGE_CASES.md) | エラーハンドリング・エッジケース | 25分 |
| 22 | [22_ACCESSIBILITY_AND_UX.md](22_ACCESSIBILITY_AND_UX.md) | アクセシビリティ・UX品質 | 20分 |
| 23 | [23_CROSS_CUTTING_CONCERNS.md](23_CROSS_CUTTING_CONCERNS.md) | 横断的検証（認証ガード・ナビ・Toast） | 20分 |
| **#** | **セキュリティ・結合テスト** | | |
| 24 | [24_REQUIREMENTS_TRACEABILITY.md](24_REQUIREMENTS_TRACEABILITY.md) | 要件トレーサビリティマトリクス | 30分 |
| 25 | [25_SUPABASE_RLS_EDGE_AUDIT.md](25_SUPABASE_RLS_EDGE_AUDIT.md) | Supabase RLS・Edge Function セキュリティ監査 | 40分 |
| 26 | [26_STRIPE_WEBHOOK_FAIL_CLOSED_AND_IDEMPOTENCY.md](26_STRIPE_WEBHOOK_FAIL_CLOSED_AND_IDEMPOTENCY.md) | Stripe Webhook Fail-Closed・冪等性テスト | 45分 |
| 27 | [27_DISCORD_INTEGRATION_TEST.md](27_DISCORD_INTEGRATION_TEST.md) | Discord OAuth・Bot・ロール付与/剥奪テスト | 40分 |

---

## テスト実行ガイドライン

### AIエージェントへの共通指示

```
あなたはQAテストエンジニアです。以下のテストプロンプトに従い、
Lovableでホスティングされたアプリケーションの実際のUIを操作してテストを実施してください。

テスト環境URL: https://preview--member-bridge-flow.lovable.app/

実行ルール:
1. 各テストケースを順番に実行し、結果を「✅ PASS」「❌ FAIL」「⚠️ WARN」で記録
2. FAILの場合は以下を記録:
   - 期待動作 vs 実際の動作
   - エラーメッセージ（あれば）
   - スクリーンショットの説明
   - 再現手順
3. テスト完了後、サマリーレポートを出力
4. バグが見つかった場合、修正コードも提案
```

### 判定基準

| 判定 | 基準 |
|---|---|
| ✅ PASS | 期待通りの動作を確認 |
| ❌ FAIL | 期待と異なる動作、クラッシュ、UI崩れ |
| ⚠️ WARN | 動作するが改善が望ましい（UX問題、パフォーマンス等） |

### 優先度

| 優先度 | 説明 |
|---|---|
| P0 (Critical) | サービス提供不可となるバグ |
| P1 (High) | 主要機能が使えない |
| P2 (Medium) | 代替手段がある不具合 |
| P3 (Low) | 軽微なUI問題、改善提案 |

---

## 推奨実行順序

0. **Phase 0 — セキュリティ・結合テスト** (24→25→26→27)
   > ⚠️ **本番リリース前に必須。** 要件カバレッジ確認 → RLS/Edge監査 → Stripe結合 → Discord結合
   > Stripe CLI (`stripe listen --forward-to`) / Supabase CLI / Discord テストGuild が必要
1. **Phase 1 — コアフロー** (01→02→03→04→05→10→17)
2. **Phase 2 — 管理機能** (06→07→08→09→11→12→13→14→15→16)
3. **Phase 3 — Buyerフロー** (18→19)
4. **Phase 4 — 品質検証** (20→21→22→23)

**推定総所要時間**: UI テスト ~7.5時間 + セキュリティ・結合テスト ~2.5時間 = **約10時間**
