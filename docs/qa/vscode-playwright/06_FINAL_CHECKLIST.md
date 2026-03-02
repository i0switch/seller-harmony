# Step 06: 最終チェックリスト（VSCode実行版）

## A. 実行結果

- [ ] `npx playwright test -c playwright.hosted.config.ts --list` 成功
- [ ] `npm run e2e:hosted:auth` 成功
- [ ] `npm run e2e:hosted` 成功
- [ ] 必要時 `npm run e2e:hosted:3x` で安定性確認

## B. 機能確認

- [ ] Sellerプラン作成/編集/削除
- [ ] Buyer購入処理
- [ ] Stripe Webhook受信（200）
- [ ] Supabase側データ更新
- [ ] Discord連携
- [ ] Admin確認

## C. 運用条件

- [ ] Stripeはテストモード維持
- [ ] モックに依存する挙動が残っていない
- [ ] 不明点はユーザー確認済み

## 判定

- [ ] Ready for Antigravity final run

