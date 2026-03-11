# Production Smoke Report (2026-03-11)

実施日: 2026-03-11
対象URL: `https://member-bridge-flow.lovable.app`
実行コマンド: `npm run e2e:hosted`

## 結果サマリ

- 結果: FAIL
- 実行時間: 約 3.1 分
- 集計:
  - `128 passed`
  - `31 failed`
  - `7 skipped`

## 再実行結果（Supabase 再起動後）

- 実施日: 2026-03-11
- 結果: PARTIAL PASS
- 実行時間: 約 1.9 分
- 集計:
  - `163 passed`
  - `3 failed`
  - `0 DNS blockers`

### 改善した点

- `xaqzuevdmeqxntvhamce.supabase.co` は名前解決可能になった
- `Test-NetConnection ... -Port 443` は成功
- Edge Function integration / security / auth 系の失敗は解消した

### 残っている失敗

1. `TC-03-14`
   - Discord オンボーディング画面で `次へ` を押しても `/seller/onboarding/complete` へ進まない
2. `TC-03-17`
   - オンボーディングフルフローが Discord ステップ以降で不安定
3. `TC-18-08`
   - Buyer Discord エラー画面に `もう一度連携する` リンクが見つからない

### 現時点の判断

インフラ停止による全面ブロックは解消した。
この時点で本番最終テストに進めるが、Discord まわりの導線だけは手動で重点確認が必要。

## 主要な観測結果

- `https://member-bridge-flow.lovable.app` 自体は `HTTP 200 OK` を返す
- 失敗の大半は `xaqzuevdmeqxntvhamce.supabase.co` への到達失敗に起因
- Playwright 失敗ログでは `getaddrinfo ENOTFOUND xaqzuevdmeqxntvhamce.supabase.co` を確認
- `nslookup xaqzuevdmeqxntvhamce.supabase.co` は `Non-existent domain`
- `curl -I https://xaqzuevdmeqxntvhamce.supabase.co` もホスト解決失敗

## 影響範囲

以下のような、Supabase Auth / Edge Functions に依存するテストが落ちた。

- Buyer / Seller の実認証
- Buyer Discord 確認導線
- Seller オンボーディングの一部
- Edge Function integration tests
- Security tests の一部

一方で、ホストURLだけで成立するルーティングや静的表示系は多数成功した。

## 判定

この状態では、本番URLの最終手動テストを完走しても `本番導線の成立` を証明できない。
まず優先すべきなのは、参照中の Supabase プロジェクトURLが有効かを確認し、DNS 解決できる正しいURLへ揃えること。

## 次アクション

1. `VITE_SUPABASE_URL` 相当の設定値と `tests/e2e/fixtures/auth.fixture.ts` の URL が正しいか確認する
2. 対象の Supabase プロジェクトが存続しているか確認する
3. 本番環境の Edge Functions / Auth / DB が別URLへ移っているなら、その値へ更新する
4. 修正後に `npm run e2e:hosted` を再実行する
