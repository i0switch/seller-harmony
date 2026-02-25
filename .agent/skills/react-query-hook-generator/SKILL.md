---
name: react-query-hook-generator
description: React Query (@tanstack/react-query) を用いたデータフェッチ用のカスタムフックを生成する。
---

# React Query Hook Generator

> 💡 **react-query-hook-generator スキルを読み込みました**  
> React Queryを用いた非同期通信（データフェッチや更新）用のカスタムフックを生成します。

## When to Use

- バックエンドAPIからデータを取得する処理を実装したいとき
- データの作成・更新・削除ロジック（Mutation）を追加したいとき

## 手順

### Step 1: API要件の確認
- 対象となるAPIのエンドポイント、HTTPメソッド、必要なリクエストパラメータ、期待されるレスポンスの形を確認する。

### Step 2: 型定義の作成
- 必要に応じて `src/types/api.ts` や `src/types/` ディレクトリ配下のファイルに、リクエスト/レスポンスに関する TypeScript の型（Type/Interface）を定義する。

### Step 3: APIコール用関数の実装
- カスタムフックが呼び出す、純粋な `fetch` API（あるいは axios 等、プロジェクトの作法に合わせた手段）を用いた非同期関数を実装する。
- （例: `src/lib/api/` などに分割、またはフックと同じファイル内に定義）

### Step 4: カスタムフックの実装
- `src/hooks/use{EntityName}.ts` のようなファイルを作成する。
- `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'` を記述する。
- クエリの場合は `useQuery` をラップして、キャッシュキー（queryKey）や実行関数（queryFn）を定義したフックをエクスポートする。
- ミューテーションの場合は `useMutation` をラップし、成功時のキャッシュ無効化（`queryClient.invalidateQueries`）などの処理を含める。

### Step 5: 利用側コンポーネントへの適用例の提示
- どのように作成したフックを利用し、ローディング状態（`isPending`）やエラー状態（`isError`）をハンドリングするか、サンプルのコード片をユーザーに提示する。
