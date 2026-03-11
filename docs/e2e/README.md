# E2E Reports Index

このディレクトリは、QA手順（`.agent/qa/03_*`, `.agent/qa/04_*`）で取得したE2E実行記録を保持します。

## レポート一覧
- `docs/e2e/LOCAL_BROWSER_WALKTHROUGH.md`
  - ローカル環境E2E結果（3回連続実行結果、シナリオ別判定、修正履歴）
- `docs/e2e/LOVABLE_WALKTHROUGH.md`
  - Lovable Hosted環境の実行結果（現状のブロッカーと次アクション）
- `docs/e2e/PRODUCTION_SMOKE_2026-03-11.md`
  - 本番URL最終テスト前の hosted E2E 実行結果と外部依存ブロッカー

## 実行ポリシー
- 仕様基準は `要件定義_ai_optimized.md` のみ。
- シークレット/パスワードはログ・証跡へ記載しない。
- Hostedで前段認証が必要な場合は `storageState` を利用し、機微ファイルはコミットしない。

## Hosted 実行手順（Lovable認証あり）
1. 認証状態を保存（手動ログイン）
  - `npm run e2e:hosted:auth`
  - 起動したブラウザで Lovable にログインし、完了後にターミナルで Enter
  - 認証状態は `.auth/lovable-hosted-state.json` に保存（`.gitignore` 済み）
2. Hosted E2E 実行
  - `npm run e2e:hosted`
3. 3連続実行（04のDone条件用）
  - `npm run e2e:hosted:3x`

補足:
- Hosted URLを変更する場合は環境変数 `HOSTED_BASE_URL` を指定。
- 認証状態ファイルを変更する場合は `HOSTED_STORAGE_STATE` を指定。
- 「このブラウザまたはアプリは安全でない可能性があります」が出る場合:
  - 最新版のローカル Chrome を既定ブラウザとして利用し、`npm run e2e:hosted:auth` を再実行
  - Google連携が拒否される場合は、Lovable側でメール/パスワード等の別ログイン手段で認証して state を保存
