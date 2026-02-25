# Seller Harmony Backend (FastAPI)

フロントエンドと並行して構築された FastAPI バックエンドの基盤（ブートストラップ）です。
現状は実DBや外部API（Supabase, Stripe, Discord）には未接続であり、モックデータを返却する API 仕様契約（Interface）の役割を果たしています。

## 環境構築と起動

### 前提条件
- Python 3.11+

### セットアップ
```bash
# 仮想環境の作成と有効化 (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 依存関係のインストール
pip install fastapi uvicorn pydantic-settings pytest httpx python-dotenv stripe

# 環境変数ファイルの作成
cp .env.example .env
```

### 開発サーバーの起動
```bash
uvicorn app.main:app --reload --port 8000
```
- Swagger UI (APIドキュメント): [http://localhost:8000/docs](http://localhost:8000/docs)
- 現在 CORS は `http://localhost:8080`, `http://localhost:5173` 等に許可されています。

### テストの実行
```bash
pytest
```

## 今後の統合ポイント (Next Steps)
このバックエンド基盤は段階的に実体化していく想定です。以下の順序で実装を進めます。

1. **Supabase (Auth & Database)**
   - `core/config.py` にある `SUPABASE_URL` などを利用し、ミドルウェアや Dependency Injection でユーザー認証（JWT検証）を構築します。
   - インメモリのモックデータを Supabase DB クエリに置き換えます。

2. **Stripe Webhook**
   - `STRIPE_WEBHOOK_SECRET` を利用し、`api/endpoints/platform.py` または専用の Webhook エンドポイントにて署名検証 (`Fail Closed` 設計) を行います。

3. **Discord Role Bot**
   - `api/endpoints/seller.py` の `/discord/validate` の中身を、実際の Discord API (`httpx` 利用) に置き換えてボット権限（botRoleHierarchy等）を確認します。
