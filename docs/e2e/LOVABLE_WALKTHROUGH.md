# LOVABLE HOSTING WALKTHROUGH

実施日: 2026-02-27  
仕様基準: `要件定義_ai_optimized.md`  
環境: [Lovable Preview](https://preview--member-bridge-flow.lovable.app/)

## 実施方法
- `npm run e2e:hosted` を実行（Playwright + pre-captured storageState）

## 実行結果 (QAサイクル2)

| Run | Passed | Failed | 判定 |
|---|---:|---:|---|
| 1 | 5 | 0 | PASS |

## 検証済みシナリオ
- **PW-H1: ログイン→ダッシュボード遷移**: 正常（Platform/Seller/Buyer各ロール）
- **PW-H2: 一覧操作**: 正常（ページング、フィルタリングのUI崩れなし）
- **PW-H3: 確認ダイアログ**: 全主要アクションで ConfirmDialog の表示を確認
- **PW-H4: 誤連携防止UX**: `/buyer/discord/confirm` 画面でのUsername表示と確定ステップを確認

## 備考
- Hosted環境は外部API（Stripe/Discord実機）との完全な疎通は制限されているため、UI導線とルーティング、ガードロジックの判定に絞って検証。
- 署名検証等のバックエンド・セーフティはローカル環境のE2E（QAサイクル2）でパスしているため、総合的に「READY」と判定。
