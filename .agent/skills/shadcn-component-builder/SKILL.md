---
name: shadcn-component-builder
description: React + Tailwind + shadcn/ui 環境でのUIコンポーネントを標準ルールに従って作成・追加する。
---

# UI Component Builder

> 💡 **shadcn-component-builder スキルを読み込みました**  
> UIコンポーネントを標準ルール（Tailwind + shadcn/ui）に従って作成・追加します。

## When to Use

- 新しいUIコンポーネントを作成したいとき
- デザインモックアップに基づいてコンポーネントを実装したいとき
- 既存の shadcn/ui コンポーネントをプロジェクトに追加したいとき

## 手順

### Step 1: 要件のヒアリングと検討
1. ユーザーからコンポーネントの仕様、必要なプロパティ（Props）、およびステートを確認する。
2. 標準の `shadcn/ui` ライブラリ（Button, Input, Dialogなど）で対応可能か、完全新規のカスタムコンポーネントが必要かを検討する。

### Step 2: 実装の準備
- `shadcn/ui` の標準コンポーネントを使用する場合は、まず対応するインストールコマンド（例: `npx shadcn@latest add button`）の実行をユーザーに提案、もしくは自動実行の許可を得る。

### Step 3: コンポーネント生成
- `src/components/` （または適切なサブディレクトリ）にコンポーネントファイルを生成する。
- 以下の実装ルールを遵守すること：
  - `export function ComponentName(props: ComponentNameProps)` の形式を使用する。
  - スタイルは Tailwind CSS のユーティリティクラスを直接 `className` に記述する。
  - 動的なクラス結合には `lib/utils` に配置されている `cn` 関数（`clsx` と `tailwind-merge` のラッパー）を利用する。
  - React のベストプラクティスに基づき、過度な再レンダリングを防ぐ設計とする。

### Step 4: 動作結果の検証
- 開発サーバー (`npm run dev`) が起動している場合は、Storybookやテスト用のページで視覚的に問題がないかユーザーに確認を促す。
