# Step 04: Lovable デプロイ・ビルド確認

> **目的**: Step 01 のモック削除を含むコード変更を Lovable にプッシュし、ビルド成功を確認
> **実行環境**: Lovable エディタ + プレビューブラウザ
> **前提**: Step 01 〜 03 完了

---

## 概要

Lovable はGitHub リポジトリと連携しており、  
コードの変更を反映してプレビュー環境にデプロイする。

**プレビューURL**: `https://preview--member-bridge-flow.lovable.app/`

---

## Task 1: Lovable プロジェクトを開く

### 手順

1. Lovable プロジェクトを開く:
   ```
   https://lovable.dev/projects/228f4fc4-0fbb-435a-9b19-6a6ad65e1f39
   ```

2. エディタが表示されることを確認

---

## Task 2: GitHub からの最新コードを同期

### 手順

1. Lovable エディタ → **右上の Git / GitHub アイコン**をクリック
2. 「Pull from GitHub」または「Sync」ボタンで最新のコードを取得
3. Step 01 で行ったモック削除の変更が反映されていることを確認:
   - `src/pages/buyer/CheckoutSuccess.tsx` からモックデータが削除されている
   - `src/pages/seller/OnboardingStripe.tsx` からデモボタンが削除されている

---

## Task 3: Lovable でビルドを実行

### 手順

1. Lovable エディタで **「Deploy」** ボタンまたは自動ビルドをトリガー
2. ビルドログを監視

### 期待される結果

```
✓ Build succeeded
✓ Preview deployed
```

### ビルドエラーが出た場合

1. **TypeScript エラー**: 型定義の不整合。エラーメッセージの行番号を確認し、Lovable のエディタで修正
2. **Import エラー**: 削除したモックデータを参照しているファイルがないか確認
3. **Supabase 接続エラー**: 環境変数が正しいか確認

---

## Task 4: プレビューでの基本動作確認

### 手順

1. プレビューURL を開く:
   ```
   https://preview--member-bridge-flow.lovable.app/
   ```

2. ページが正常に表示されることを確認（白画面にならない）

3. **コンソールエラーの確認**:
   - ブラウザの DevTools (F12) → Console タブ
   - 赤いエラーメッセージが出ていないこと
   - ⚠️ Supabase への接続エラーは環境変数未設定の可能性

4. **ページ遷移テスト**:
   - `/` トップページ → 表示される
   - `/seller/login` → ログインフォームが表示される
   - `/platform/login` → 管理者ログインフォームが表示される

---

## Task 5: Supabase 接続の確認

### 手順

1. プレビューURL を開く
2. DevTools → Network タブを開く
3. ページをリロード
4. `supabase.co` へのリクエストが発生していることを確認

### 期待される結果

- `xaqzuevdmeqxntvhamce.supabase.co` へのリクエストが見える
- ステータスコードが `200` または `401`（未認証の場合）
- `CORS` エラーが無い

---

## Task 6: Lovable 環境変数の確認

### 手順

1. Lovable エディタ → **Settings** (⚙ アイコン)
2. **Environment Variables** セクション
3. 以下の変数が設定されていることを確認:

| Key | 値 |
|---|---|
| `VITE_SUPABASE_URL` | `https://xaqzuevdmeqxntvhamce.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key |

⚠️ ソースコード内（`src/integrations/supabase/client.ts`）にハードコードされている場合は不要だが、環境変数からの読み取りに変更した場合は必須。

---

## 完了確認

- [ ] Lovable プロジェクトが開ける
- [ ] GitHub からの最新コードが同期されている
- [ ] ビルドが成功する（エラーなし）
- [ ] プレビューURLでページが表示される
- [ ] コンソールに致命的エラーが無い
- [ ] トップページ、ログインページが正しく表示される
- [ ] Supabase への接続リクエストが見える

---

## トラブルシューティング

### ビルドが失敗する
→ Lovable エディタのビルドログでエラー内容を確認。多くの場合は TypeScript のコンパイルエラー。

### 白画面になる
→ DevTools Console でエラーを確認。「Module not found」の場合はインポートパスの誤り。

### Supabase 接続エラー（CORS）
→ Supabase Dashboard → Settings → API → 「Additional allowed origins」に Lovable のプレビューURLを追加。
