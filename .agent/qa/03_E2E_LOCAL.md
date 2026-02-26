# 03_E2E_LOCAL — ローカル環境でのE2E（Antigravity内蔵AIブラウザで実UI操作）

## 目的
Playwright等の外部E2Eフレームワークは使わず、Antigravityに実装済みのAIブラウザ（Browser Integration / browser sub-agent）で、実際のUIを操作して主要フローを検証する。
失敗したら「再現→原因特定→修正→再検証」を自律ループで繰り返し、安定動作を証明する。

## 前提
- ローカル開発サーバ（frontend / backend）が起動できる状態であること
- 認証情報は **ログに出さない**。パスワード等は秘密入力（secure input）で入力する
- テスト実行の証拠はスクショ/録画/ログで残すが、秘密情報が映らないように注意する
- 要件定義（要件定義_ai_optimized.md）に準拠していることをE2Eでも裏付ける :contentReference[oaicite:1]{index=1}

## 実行方針（AIブラウザでの検証ループ）
1) 主要フローをAIブラウザ:contentReference[oaicite:2]{index=2}収集
2) バグ/不整合を見つけたら、根本原因を特定して最小修正
3) 修正後に同じフローを再実行して確認
4) 重要フローは **3回連続成功**するまで繰り返す
5) 各ループの結果を docs/setup/implementation-log.md に追記する

## 重要：ログイン要求が出た場合
- 画面遷移でログインが必要になったら、ログイン画面を表示する
- 入力は秘密入力（secure input）で行う（パスワードはログ/レポートに書かない）
- Discord / Supabase など外部ログインが必要な場合も同様に、ログイン画面を出して対応する
- MFAなどで止まる場合は、画面状況をスクショで記録し、notify_user（または同等）でユーザーに対応依頼する

## 主要シナリオ（必須）
### S1: Seller オンボーディング完了まで
- /seller/signup → /seller/login → onboarding(profile→stripe→discord→complete) → /seller/dashboard
チェック項目:
- オンボーディング未完了で dashboard に直接入れない（ガード）
- 各ステップの必須入力バリデーション
- Discord検証UI（チェックリスト＋エラーコード＋画像ガイド表示）

### S2: Seller プラン管理
- /seller/plans → 新規作成 → 編集 → 公開/停止切替
チェック項目:
- plan_type が subscription / one_time でUIが分岐
- one_time の付与期間ポリシー（無期限/日数）入力
- Discord検証未クリア時に公開ブロック or 強警告（要件通り）

### S3: Buyer 購入後導線（UI確認中心）
- /checkout/success → /buyer/discord/confirm → /buyer/discord/result → /member/me
チェック項目:
- discord confirm で Discord username を明示し「このアカウントでOK/やり直す」UXがある（誤連携防止） :contentReference[oaicite:3]{index=3}
- member/me で状態バッジ（active/grace_period/:contentReference[oaicite:4]{index=4}く表示

### S4: Seller 会員管理（サポート運用）
- /seller/members（検索/フィルタ/ページング）→ /seller/members/:id（詳細）→ タイムライン表示
チェック項目:
- 3状態（loading/empty/error）でUIが崩れない
- タイムラインがStripe/Webhook/Discord/手動操作を統合して見える（モックでも可）

### S5: Seller Crosscheck（乖離検知）
- /seller/crosscheck
チェック項目:
- 「課金有効だがロール無し」「解約済みだがロールあり」等がフィルタで抽出できる
- judgment と detail が視認性よく表示される
- 行アクション（再同期/再付与/剥奪）が確認ダイアログ付きで出る

### S6: Platform 管理（全体監視）
- /platform/tenants → /platform/tenants/:id → /platform/webhooks → /platform/retry-queue → /platform/announcements → /platform/system-control
チェック項目:
- 一覧の検索/フィルタ/ソート/ページングが動く
- Webhook再処理、キュー再試行、Kill Switch は確認ダイアログ付き
- お知らせ作成→Sellerダッシュボードにバナー反映（可能なら）

## 収集すべき証跡（必須）
- 各シナリオごとに
  - スクショ（開始/完了/重要画面）
  - コンソールエラー（存在すれば）
  - 失敗時の再現手順
- 証跡の保存先パスを walkthrough.md に記載（秘密情報が含まれないこと）

## 失敗時の分類（原因切り分け）
- ルーティング/ガード（無限リダイレクト・権限分離）
- バリデーション漏れ
- 状態バッジ/文言の不一致（Enum/Labelマップ）
- API（モック/実API）契約不整合
- エラーUI不足（空状態/再試行導線）
- セキュリティ（secret露出・署名検証スキップなど）

## 出力（必須）
- docs/e2e/LOCAL_BROWSER_WALKTHROUGH.md
  - 各シナリオの実行結果（PASS/FAIL）
  - スクショ/録画パス
  - 失敗と修正履歴（要点）
- docs/setup/implementation-log.md に各ループの実行ログ追記