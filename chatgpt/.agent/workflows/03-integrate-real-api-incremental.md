# 実API統合（段階移行）

## 説明
mockApi を残したまま、interface + real implementation に分離して、機能ごとに段階的に実APIへ切り替える。

## 方針
- 一括置換しない
- 機能単位で差し替える
- `VITE_USE_MOCK_API` フラグで切替可能にする

## ステップ
// turbo

### 1. APIインターフェース抽出
- `src/services/interfaces.ts`
- platform / seller / buyer API interface 定義

### 2. mockApi を interface 実装へ適合

### 3. HTTPクライアント作成
- `src/services/http/client.ts`
- base URL, timeout, error normalization

### 4. まずは読み取り系から統合
候補:
- seller stats
- seller plans list
- seller members list
- platform tenants list

### 5. 書き込み系は確認ダイアログを維持したまま統合
