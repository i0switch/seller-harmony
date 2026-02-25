# フロントエンド環境セットアップ

## 説明
Lovable生成済みのVite/Reactプロジェクトをローカルで起動し、lint/test/buildの基本検証を行う。

## 前提条件
- Node.js 20系推奨（18以上でも可）
- npm 利用（package-lock.json を優先）

## ステップ
// turbo-all

### 1. バージョン確認
```bash
node -v
npm -v
```

### 2. 環境変数作成（未作成時のみ）
```bash
[ -f .env ] || cp .env.example .env
```

### 3. 依存関係インストール
```bash
npm install
```

### 4. テスト（任意だが推奨）
```bash
npm run test || true
```

### 5. Lint
```bash
npm run lint || true
```

### 6. Build
```bash
npm run build
```

### 7. 開発サーバー起動
```bash
npm run dev
```

## 検証項目
- アプリが起動する
- 主要ルートのナビゲーションが崩れていない
- mock API ベースで画面遷移できる
