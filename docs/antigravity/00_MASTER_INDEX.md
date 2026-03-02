# Antigravity 本番テスト — マスターインデックス

> **目的**: Lovable本番環境でseller-harmonyの全機能を実アカウント・実APIで検証する
> **実行者**: Antigravityブラウザ AI エージェント
> **対象環境**: https://lovable.dev/projects/228f4fc4-0fbb-435a-9b19-6a6ad65e1f39

---

## 実行順序

**必ず番号順に実行してください。各ステップは前のステップの完了が前提です。**

| # | ファイル | 内容 | 所要時間 | 前提 |
|---|---|---|---|---|
| 01 | [01_MOCK_REMOVAL.md](01_MOCK_REMOVAL.md) | モックデータ削除・実データ接続への書き換え | 30分 | なし |
| 02 | [02_SUPABASE_EDGE_DEPLOY.md](02_SUPABASE_EDGE_DEPLOY.md) | Edge Functions の環境変数確認・デプロイ | 15分 | 01完了 |
| 03 | [03_STRIPE_WEBHOOK_SETUP.md](03_STRIPE_WEBHOOK_SETUP.md) | Stripe Webhook Endpoint の設定・検証 | 15分 | 02完了 |
| 04 | [04_LOVABLE_DEPLOY.md](04_LOVABLE_DEPLOY.md) | Lovableでのコード反映・ビルド確認 | 10分 | 01〜03完了 |
| 05 | [05_TEST_ADMIN_LOGIN.md](05_TEST_ADMIN_LOGIN.md) | Platform Admin ログイン・ダッシュボード検証 | 10分 | 04完了 |
| 06 | [06_TEST_SELLER_AUTH.md](06_TEST_SELLER_AUTH.md) | Seller ログイン・オンボーディング検証 | 15分 | 04完了 |
| 07 | [07_TEST_SELLER_STRIPE_ONBOARDING.md](07_TEST_SELLER_STRIPE_ONBOARDING.md) | Stripe Connect Express オンボーディング | 15分 | 06完了 |
| 08 | [08_TEST_SELLER_PLAN_CRUD.md](08_TEST_SELLER_PLAN_CRUD.md) | プラン作成・編集・削除 | 15分 | 07完了 |
| 09 | [09_TEST_BUYER_CHECKOUT.md](09_TEST_BUYER_CHECKOUT.md) | Buyer 決済フロー（Stripe テストカード） | 15分 | 08完了 |
| 10 | [10_TEST_STRIPE_WEBHOOK.md](10_TEST_STRIPE_WEBHOOK.md) | Webhook受信・membership作成の検証 | 10分 | 09完了 |
| 11 | [11_TEST_DISCORD_INTEGRATION.md](11_TEST_DISCORD_INTEGRATION.md) | Discord OAuth連携・ロール付与 | 15分 | 10完了 |
| 12 | [12_TEST_ADMIN_VERIFY.md](12_TEST_ADMIN_VERIFY.md) | 管理者画面で全状態の最終確認 | 10分 | 11完了 |
| 13 | [13_TEST_EDGE_CASES.md](13_TEST_EDGE_CASES.md) | 解約・返金・grace period・エラー系 | 20分 | 12完了 |
| 14 | [14_FINAL_CHECKLIST.md](14_FINAL_CHECKLIST.md) | 全項目最終チェック・デプロイ判定 | 10分 | 全完了 |

---

## 環境情報

### アプリURL
- **Lovableプロジェクト**: https://lovable.dev/projects/228f4fc4-0fbb-435a-9b19-6a6ad65e1f39
- **本番アプリ**: https://preview--member-bridge-flow.lovable.app/

### 外部サービス
- **Supabase**: https://supabase.com/dashboard/project/xaqzuevdmeqxntvhamce
- **Stripe (Test Mode)**: https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/workbench/webhooks/we_1T52wlCPMy4DDs4SYpAK9yU8
- **Discord Developer Portal**: https://discord.com/developers/applications/1476545159297630353/oauth2

### テストアカウント

| ロール | メールアドレス | パスワード |
|---|---|---|
| Platform Admin | i0switch.g@gmail.com | pasowota427314s |
| Seller | i0switch.g+test01@gmail.com | pasowota427314s |
| Buyer | （テスト中に新規登録） | — |

### Stripe テストカード
| カード番号 | 用途 |
|---|---|
| `4242 4242 4242 4242` | 成功 |
| `4000 0000 0000 0002` | 拒否 |
| `4000 0000 0000 3220` | 3Dセキュア必須 |

CVC: 任意3桁、有効期限: 未来の日付

---

## 注意事項

- **Stripeはテストモード**のため実際の決済は発生しません
- プロンプト内の `⏸️ 手動確認` マークは、AIが自動判定できない場合に人間の確認が必要な箇所です
- エラーが発生した場合は、そのステップのトラブルシューティングセクションを参照してください
- 画面差異・権限不足・前提不一致・想定外エラーで判断不能な場合は、**処理を止めて必ずユーザーに質問**してから再開してください
