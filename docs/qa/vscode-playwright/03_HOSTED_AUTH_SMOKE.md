# Step 03: Hosted認証スモークテスト

## 目的

管理者/販売者/購入者の基本導線がHosted環境で成立するかを短時間で確認する。

## 実行コマンド

```powershell
npm run e2e:hosted
```

## 重点確認

- ログイン画面遷移
- バリデーション表示
- 正常ログイン後の画面表示
- 主要ルートのアクセス制御（未認証時リダイレクト）

## 失敗時の切り分け

1. 単発失敗か確認（リトライ）

```powershell
npm run e2e:hosted
```

2. 連続安定性確認

```powershell
npm run e2e:hosted:3x
```

3. レポート確認
- `playwright-report/` を開いて失敗ステップを特定

## 完了条件

- Hosted認証系が連続実行で安定してPassする
