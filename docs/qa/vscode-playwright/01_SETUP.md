# Step 01: VSCode 実行準備

## 目的

PlaywrightのHostedテストをVSCodeから安定実行できる状態にする。

## 手順

1. ワークスペースのルートへ移動

```powershell
Set-Location c:/Users/i0swi/OneDrive/デスクトップ/決済サービス/seller-harmony
```

2. 依存関係インストール

```powershell
npm ci
```

3. Playwrightブラウザの不足があれば導入

```powershell
npx playwright install
```

4. テスト一覧の取得（設定読込チェック）

```powershell
npx playwright test -c playwright.hosted.config.ts --list
```

5. 完全自動用の環境変数を設定（同一ターミナル内）

```powershell
$env:HOSTED_LOGIN_EMAIL="i0switch.g+test01@gmail.com"
$env:HOSTED_LOGIN_PASSWORD="pasowota427314s"
$env:HOSTED_LOGIN_PATH="/seller/login"
```

任意:

```powershell
$env:HOSTED_BASE_URL="https://preview--member-bridge-flow.lovable.app"
```

## 完了条件

- `--list` がエラーなく完了する
- Hosted用テストケースが列挙される
- 環境変数設定後、`npm run e2e:hosted:auth` が手入力なしで完了できる
