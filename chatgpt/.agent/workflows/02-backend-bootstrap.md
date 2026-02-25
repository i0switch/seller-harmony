# バックエンド基盤のブートストラップ（FastAPI + Supabase接続準備）

## 説明
フロントエンドと並行して、Stripe Webhook/Discord同期のためのバックエンド基盤を `backend/` に初期構築する。

## 前提条件
- Python 3.11+ 推奨
- uv または pip が利用可能

## ステップ
// turbo

### 1. backend ディレクトリ作成
```bash
mkdir -p backend/app/{api,core,models,schemas,services,workers}
mkdir -p backend/tests
```

### 2. Python仮想環境作成（uv推奨 / なければvenv）
```bash
command -v uv && uv venv backend/.venv || python3 -m venv backend/.venv
```

### 3. 依存関係ファイル作成（最小）
- FastAPI
- Uvicorn
- Pydantic Settings
- httpx
- stripe
- python-dotenv
- pytest

### 4. ヘルスチェックAPI作成
- `GET /healthz`
- `GET /readyz`

### 5. Stripe Webhook受け口を雛形で作成（未実装は 501 可）
- `POST /webhooks/stripe`
- 署名検証をスキップしない設計（シークレット未設定なら起動エラー or エンドポイント拒否）

### 6. README（backend/README.md）作成
- 起動手順
- 環境変数一覧
- 未実装事項

## 成果物
- backend 初期骨組み
- 実行確認コマンド
- 実装ログへの記録
