# 04_E2E_LOVABLE — Lovable hosting E2E（Playwright + Antigravity AIブラウザ併用）

## 対象URL（本番相当UI）
https://preview--member-bridge-flow.lovable.app/

## 目的
Lovable hosting上のUIが、本番相当の環境で「導線・表示・ガード・エラーUI・一覧操作」が破綻しないことを、
(1) Playwright による安定した回帰テスト と
(2) Antigravity内蔵AIブラウザによる実操作検証
の二重で保証する。

※ 要件定義（要件定義_ai_optimized.md）を唯一の仕様とし、重要要件（状態バッジ/誤連携防止UX/ページング/確認ダイアログ等）をE2Eでも裏付ける。 :contentReference[oaicite:1]{index=1}

---

## セキュリティ前提（絶対）
- パスワード/トークン/キーはログ・スクショ・レポートに出さない
- 入力が必要な場合は「秘密入力（secure input）」で行う
- Playwrightで認証状態を使い回す場合は storageState を使用し、ファイルは .gitignore に入れてコミットしない
- Supabase service_role key をフロントに露出させない（RLSをバイパスするため） ※監査対象
- Stripe Webhook署名検証は raw body + Stripe-Signature + endpoint secret を前提（Hosted側は主にUI確認、署名検証の結合はローカルで担保）

参考：
- Playwrightの安定化（web-first assertions/locator） https://playwright.dev/docs/best-practices
- Supabase RLSとservice keyの扱い https://supabase.com/docs/guides/database/postgres/row-level-security
- Stripe Webhook署名検証 https://docs.stripe.com/webhooks/signature

---

# A) Playwright（Hosted回帰テスト）

## 方針
- Hostedは環境差分が出やすいので、テストは「UI導線」「表示」「ガード」「一覧操作」を中心にする
- 外部連携（Stripe実決済・Discord実OAuth）に強依存させない（不安定になりやすいため）
- 可能ならテスト用モード/フラグで外部連携をスタブ化し、UIだけ確実に担保する

## シナリオ（最小で必須）
### PW-H1: ログイン→ダッシュボード表示（Platform / Seller / Buyer）
- Platformログイン → /platform/dashboard 表示
- Sellerログイン → /seller/dashboard 表示（onboardingガードが正しく働く）
- Buyerログイン → /member/me 表示

### PW-H2: 一覧操作（ページング/フィルタ/ソートの回帰）
- /platform/tenants：検索/フィルタ/ソート/ページングが機能
- /platform/webhooks：失敗フィルタ/詳細モーダル/再処理ボタン（UI）
- /platform/retry-queue：フィルタ/アクションボタン（UI）
- /seller/members：検索/フィルタ/ページング、3状態（loading/empty/error）
- /seller/crosscheck：乖離フィルタ、judgment/detail表示

### PW-H3: 破壊的操作の確認ダイアログ（必須）
- 停止/再開、再処理、再試行、kill switch等の操作で ConfirmDialog が必ず出る

### PW-H4: 誤連携防止UX（UI検証）
- /buyer/discord/confirm 相当画面で「usernameの明示」＋「このアカウントでOK/やり直す」ステップが存在する
  （Hostedでは外部OAuthを通さず、表示の存在と文言・導線を検証）

## 成功条件
- 上記が3回連続で成功（フレークがあれば locator / assertion を改善）

---

# B) Antigravity内蔵AIブラウザ（実操作検証）

## 方針
- Browser Extension / browser sub-agent で Hosted UI を実際に操作して検証する
- ログインが必要ならログイン画面を表示し、秘密入力で入力する
- 不具合（押せない/無限ローディング/遷移ループ/文言不備）を人間目線で拾い、修正して再検証する

## シナリオ（必須）
### AG-H1: Platform管理導線の実操作
- /platform/dashboard → tenants → tenant detail → webhooks → retry-queue → announcements → system-control
チェック：
- 画面崩れがない
- 一覧操作が使える（検索/ページング）
- 重要操作で確認ダイアログが出る

### AG-H2: Seller運用導線の実操作
- /seller/dashboard → plans → members → crosscheck → webhooks → settings/discord
チェック：
- 状態バッジが分かりやすい
- エラー時に「何をすべきか」が表示される（hint）
- Discord階層ガイド（画像/案内）が表示される

### AG-H3: Buyerセルフサービス導線の実操作
- /member/me → discord再連携導線（UI）→ ロール再付与リクエスト（UI）
チェック：
- 導線が迷わない
- 失敗時の説明が専門用語過多になっていない

## 失敗時
- スクショ/録画/コンソールエラーを保存（秘密情報が映らないよう注意）
- 根本原因を特定して修正
- 修正後に同一シナリオを再実行し、3回連続成功まで継続

---

# 証跡（必須）
- docs/e2e/LOVABLE_WALKTHROUGH.md を作成し、以下を記録：
  - PW実行結果（PASS/FAIL、3回連続成功の記録）
  - AGブラウザ実行結果（PASS/FAIL）
  - スクショ/録画ファイルパス（秘密情報なし）
  - 発見バグと修正内容（該当ファイル一覧）

- docs/setup/implementation-log.md に、各ループの実行ログを追記する

---

# 重要な注意（Hostedで外部連携が難しい場合の方針）
- Hostedでは「UI導線・状態表示・ガード・一覧操作」を最優先で担保し、
- Stripe Webhook署名検証やDiscord OAuth state検証など“外部連携の正当性”は
  ローカルE2E／結合テスト／署名検証テストで担保する（Fail Closed・冪等性含む）。