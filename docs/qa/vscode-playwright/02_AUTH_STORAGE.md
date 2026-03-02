# Step 02: 認証状態の保存（Hosted）

## 目的

管理者・販売者テストに必要な認証状態を取得し、E2Eで再利用する。

## 手順

1. 既存の認証キャプチャを実行

```powershell
npm run e2e:hosted:auth
```

2. 実行ログで以下を確認
- ログイン成功
- storage state ファイル保存成功

3. 失敗時の再実行
- 入力情報が変わった場合は再ログイン
- 2FAやCaptchaが出る場合は手動介入後に再実行

## 完了条件

- `npm run e2e:hosted:auth` が `Exit Code 0` で終了
- 後続のHostedテストでログイン手順をスキップできる状態になる
