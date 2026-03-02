# Step 07: セラー Stripe Connect オンボーディング テスト

> **目的**: Seller が Stripe Express アカウントを作成・連携するフローをテスト
> **実行環境**: ブラウザ（Lovable プレビュー + Stripe テストモード）
> **前提**: Step 06 完了（セラーログイン可能）

---

## テストアカウント

| 項目 | 値 |
|---|---|
| セラーメール | `i0switch.g+test01@gmail.com` |
| パスワード | `pasowota427314s` |

---

## 概要

### Stripe Connect Express フロー
```
セラーダッシュボード → 「Stripe連携」ボタン
  → Edge Function (stripe-onboarding) 呼び出し
  → Stripe Express オンボーディングページにリダイレクト
  → テスト情報を入力
  → 完了 → アプリに戻る
  → account.updated Webhook → seller_profiles 更新
```

---

## Task 1: セラーとしてログイン

### 手順

1. ブラウザで以下のURLを開く:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/login
   ```

2. `i0switch.g+test01@gmail.com` / `pasowota427314s` でログイン

3. オンボーディングページまたはダッシュボードが表示される

---

## Task 2: Stripe Connect 連携を開始

### 手順

1. オンボーディングページの **Step 1: Stripe 連携** セクションへ
   または ダッシュボード → **「Stripe 連携」** ボタンをクリック
   または `/seller/onboarding/stripe` に直接アクセス:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/onboarding/stripe
   ```

2. 「Stripe アカウントを作成」または「Stripe 連携を開始」ボタンをクリック

### 期待される動作

1. Edge Function `stripe-onboarding` が呼び出される
2. Stripe Express のオンボーディングページにリダイレクトされる
   - URL例: `https://connect.stripe.com/express/onboarding/...`

### エラーの場合

| エラー | 原因 | 対処 |
|---|---|---|
| 「Stripe連携に失敗しました」 | Edge Function エラー | Supabase Logs → stripe-onboarding のログ確認 |
| ネットワークエラー | CORS問題 | ALLOWED_ORIGIN 設定を確認 |
| 404 | Edge Function未デプロイ | Step 02 を再実行 |

---

## Task 3: Stripe Express テスト情報を入力

### Stripe テストモードの入力ガイド

Stripe テストモードでは以下のテストデータを使用:

#### 電話番号（テスト用）
```
000 000 0000
```

#### SMS認証コード（テスト用）
```
000000
```

#### 個人情報（テスト用）
| フィールド | 入力値 |
|---|---|
| First name | `Test` |
| Last name | `Seller` |
| Date of birth | `1990-01-01` |
| Address | `23 Main Street, Suite 100` |
| City | `San Francisco` |
| State | `CA` |
| ZIP | `94111` |
| SSN last 4 | `0000` |

#### 銀行口座（テスト用）
| フィールド | 入力値 |
|---|---|
| Routing number | `110000000` |
| Account number | `000123456789` |

⚠️ テストモードでは「Skip this form」のようなオプションがある場合はそれを使用しても可。

### 手順

1. Stripe Express のフォームに上記テストデータを入力
2. 各ステップで「Continue」「Next」をクリック
3. 最終ステップで「Done」「Submit」をクリック

---

## Task 4: アプリへのリダイレクト確認

### 期待される動作

1. Stripe オンボーディング完了後、アプリにリダイレクトされる
   - リダイレクト先: `/seller/onboarding/stripe` または `/seller/dashboard`
2. Stripe 連携ステータスが更新される:
   - 「Stripe 連携済み」「認証完了」等の表示

### 完了しない場合

- Stripe Express の入力が不完全だとリダイレクトされない
- 「Go back to the platform」リンクがある場合はそれをクリック
- 手動で `/seller/dashboard` にアクセス

---

## Task 5: Supabase でデータ確認

### 手順

1. Supabase Dashboard → Table Editor

2. **`seller_profiles`** テーブルを確認:

   | カラム | 期待値 |
   |---|---|
   | `stripe_account_id` | `acct_` で始まる文字列（NULL でない） |
   | `stripe_onboarding_complete` | `true` |

3. **`stripe_connected_accounts`** テーブルを確認:

   | カラム | 期待値 |
   |---|---|
   | `stripe_account_id` | seller_profiles の値と一致 |
   | `charges_enabled` | `true`（テスト完了後） |
   | `payouts_enabled` | `true`（テスト完了後） |

---

## Task 6: Stripe Dashboard で Connect アカウント確認

### 手順

1. Stripe Dashboard → **Connect** → **Accounts**:
   ```
   https://dashboard.stripe.com/acct_1T4pL2CPMy4DDs4S/test/connect/accounts/overview
   ```

2. 新しく作成された Connect アカウントが一覧に表示されることを確認

3. アカウントをクリック:
   - Status: **Enabled** or **Complete**
   - charges_enabled: `true`
   - payouts_enabled: `true`

---

## Task 7: Seller ダッシュボードで Stripe ステータス確認

### 手順

1. アプリに戻る:
   ```
   https://preview--member-bridge-flow.lovable.app/seller/dashboard
   ```

2. Stripe ステータスの表示を確認:
   - ✅ 「Stripe 連携済み」「認証完了」等
   - ❌ 「未連携」「審査中」の場合は Webhook が正しく処理されたか確認

---

## 完了確認

- [ ] 「Stripe 連携を開始」ボタンが動作する
- [ ] Stripe Express オンボーディングページにリダイレクトされる
- [ ] テスト情報の入力が完了できる
- [ ] アプリにリダイレクトされる
- [ ] `seller_profiles.stripe_account_id` に値が入る
- [ ] `seller_profiles.stripe_onboarding_complete` が `true`
- [ ] Stripe Dashboard に Connect アカウントが表示される
- [ ] Seller ダッシュボードで Stripe 連携ステータスが「完了」

---

## トラブルシューティング

### Stripe Express にリダイレクトされない
→ DevTools → Network で `stripe-onboarding` へのリクエストを確認。レスポンスにリダイレクトURLが含まれているか確認。

### Stripe Express でエラー「This account link is no longer valid」
→ リンクの有効期限切れ。アプリに戻り、もう一度「Stripe 連携を開始」をクリック。

### アプリにリダイレクトされるが Stripe ステータスが更新されない
→ Webhook が動作していない可能性。Step 03 を確認し、`account.updated` イベントが正しく処理されているか Supabase Logs で確認。
