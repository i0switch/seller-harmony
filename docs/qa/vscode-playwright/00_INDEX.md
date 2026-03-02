# VSCode + Playwright 実行インデックス

> 目的: Antigravity用ドキュメントとは分離して、VSCode上でHosted環境テストを再現可能にする
> 対象: seller-harmony
> 実行環境: VSCode Terminal (PowerShell)

---

## 実行順序

1. [01_SETUP.md](01_SETUP.md) — 依存関係と事前確認
2. [02_AUTH_STORAGE.md](02_AUTH_STORAGE.md) — テストアカウント認証状態の保存
3. [03_HOSTED_AUTH_SMOKE.md](03_HOSTED_AUTH_SMOKE.md) — Hosted認証系スモーク
4. [04_HOSTED_PAYMENTS_WEBHOOK.md](04_HOSTED_PAYMENTS_WEBHOOK.md) — 決済・Webhook確認
5. [05_DISCORD_ADMIN_VERIFY.md](05_DISCORD_ADMIN_VERIFY.md) — Discord連携 + Admin確認
6. [06_FINAL_CHECKLIST.md](06_FINAL_CHECKLIST.md) — 最終判定

---

## 方針

- Playwrightを主軸に実行する（Seleniumは使わない）
- Stripeはテストモード運用のまま検証する
- 不明点や画面差異が出たら、実行を止めてユーザー確認を行う
- 認証情報はこのドキュメントへ平文で追記しない

---

## 全自動エントリーポイント

### npmコマンド

- `npm run qa:vscode:auto:dry` — 実行計画のみ表示（安全確認用）
- `npm run qa:vscode:auto` — 1回実行（list → hosted e2e、未認証前提テスト向け）
- `npm run qa:vscode:auto:3x` — hosted e2e を3連続実行（未認証前提）
- `npm run qa:vscode:auto:auth` — 1回実行（list → auth capture → hosted e2e）
- `npm run qa:vscode:auto:auth:3x` — 認証state付きで3連続実行

### 完全自動の実行手順

1. 未認証前提テスト中心なら `npm run qa:vscode:auto` を実行
2. 認証stateが必要な検証を含む場合のみ [01_SETUP.md](01_SETUP.md) の環境変数を設定して `npm run qa:vscode:auto:auth` を実行
3. 安定性確認は `:3x` バリアントを使用

### VSCode Task

- `QA: Hosted Auto (dry-run)`
- `QA: Hosted Auto`
- `QA: Hosted Auto (3x)`
