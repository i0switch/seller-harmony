以下に seller-harmony のバグ監査レポートを提出します。制約に従い、コードの修正・PR等は一切行わず、報告のみを行っております。

seller-harmony バグ監査レポート
調査サマリー
リポジトリ内のコード、ドキュメント（docs/production-readiness-tests.md, docs/qa/implementation-gap-risk-priority-tests-20260303.md 等）、およびEdge Functionsの挙動を中心に監査を実施しました。金銭的損害やセキュリティインシデント（CORS、権限昇格）に直結するクリティカルなバグ（BUG-07, BUG-08, BUG-13など）を特定しました。また、UIとバックエンド間の契約不整合による機能不全や、スタブ実装のまま放置されている監視運用機能など、本番稼働において高いリスクとなる実装ギャップも確認されています。

確認済みバグ
1. 削除済み/無効プランでの決済可能（BUG-07）
タイトル: 削除済みまたは無効なプランに対してCheckout Sessionが作成可能
深刻度: 🔴 Critical
区分: 決済 / ビジネスロジック
根拠: supabase/functions/stripe-checkout/index.ts のソースコードレビューおよび docs/production-readiness-tests.md の記録。
再現手順:
セラーがプランを作成し、その後削除（deleted_at IS NOT NULL）または非アクティブ化する。
削除済みプランの plan_id を用いて /stripe-checkout エンドポイントを呼び出す。
実際の結果: Stripe Checkout URL が正常に生成され、決済が進んでしまう。
期待結果: HTTP 400 または 404 が返却され、決済セッションが作成されない。
想定原因: plans テーブルから対象プランを取得する際、deleted_at IS NULL AND is_active = true の絞り込み条件が欠落しているため。
追加検証方法: curl コマンドで削除済み plan_id を指定して stripe-checkout に POST リクエストを送信し、動作を確認する。
修正方針の概要: Edge Function 内での DB クエリに論理削除およびアクティブステータスのチェック条件を追加する。
2. バイヤーによる Stripe アカウント作成（権限昇格）（BUG-08）
タイトル: stripe-onboarding でのセラーロールチェック欠落
深刻度: 🔴 Critical
区分: 認証・認可
根拠: supabase/functions/stripe-onboarding/index.ts のソースコードおよび docs/production-readiness-tests.md の記録。
再現手順:
バイヤーアカウントでログインし、JWT トークンを取得する。
取得したトークンを使用して POST /stripe-onboarding を呼び出す。
実際の結果: バイヤー権限でも Stripe Express アカウントのオンボーディングリンクが生成されてしまう。
期待結果: HTTP 403 Forbidden が返却される。
想定原因: エンドポイント側で users.role や role_assignments を参照してのリクエスト元のロール検証が実装されていないため。
追加検証方法: バイヤーの JWT を使用して stripe-onboarding を直接呼び出す統合テスト（Playwright/curl）を実施。
修正方針の概要: stripe-onboarding 実行前に、リクエスト元ユーザーが seller または platform_admin であるかを検証する処理を追加する。
3. CORS ワイルドカードフォールバックによるセキュリティリスク（BUG-13）
タイトル: ALLOWED_ORIGIN 未設定時の Access-Control-Allow-Origin: * フォールバック
深刻度: 🟠 High
区分: セキュリティ / 構成設定
根拠: 全5つの Edge Function (stripe-checkout, discord-oauth, stripe-onboarding, discord-bot, stripe-webhook) のソースコード（corsHeaders の定義部）。
再現手順:
環境変数 ALLOWED_ORIGIN を未設定の状態にする。
任意の Origin（例: https://evil.com）から OPTIONS リクエストを送信する。
実際の結果: 悪意のある Origin に対しても *（あるいはフォールバック値）が返却され、クロスオリジンリクエストが許可される可能性がある。
期待結果: ホワイトリスト外の Origin からのリクエストは CORS エラーとして拒否される。
想定原因: 環境変数が見つからない場合のフォールバック値が、セキュリティ上不適切な設定（ワイルドカード同等）になっているか、Gateway層の挙動に依存しているため。
追加検証方法: Origin: https://evil-site.com ヘッダーをつけて Edge Function にリクエストを送信し、レスポンスの CORS ヘッダーを確認する。
修正方針の概要: コード内の CORS ヘッダー生成ロジックを見直し、環境変数が未設定の場合は fail-closed（リクエストを拒否）とするか、厳密なホワイトリスト判定を実装する。
4. 空文字 discord_user_id による UNIQUE 制約違反（BUG-09）
タイトル: discord_identities テーブルで空文字による UNIQUE 制約エラー
深刻度: 🟠 High
区分: Discord 連携 / データ整合性
根拠: supabase/migrations/20260228000000_production_readiness_fixes.sql の内容および docs/production-readiness-tests.md。
再現手順:
Discord API が何らかの理由で discord_user_id を空文字で返却する、または仮状態として空文字を挿入する。
2人目のユーザーで同じく空文字の discord_user_id を UPSERT しようとする。
実際の結果: UNIQUE 制約に抵触し、サーバーエラー（500）が発生する。
期待結果: 一時的な状態は NULL として保存され、UNIQUE 制約に抵触せず処理が完了する。
想定原因: DBスキーマにおいて、プレースホルダーとして空文字列（''）を使用しており、空文字に対して UNIQUE 制約が適用されてしまうため。
追加検証方法: discord_identities テーブルに空文字の discord_user_id を2件 INSERT する SQL を実行し、エラーを再現させる。
修正方針の概要: プレースホルダーには NULL を使用し、空文字を許容しない CHECK 制約を DB に追加する。
5. Discord Bot の grant_role アクション不整合（P0-1）
タイトル: バイヤーからの「ロール再付与リクエスト」が機能しない
深刻度: 🟠 High
区分: API / Discord連携
根拠: docs/qa/implementation-gap-risk-priority-tests-20260303.md の未実装一覧および discord-bot/index.ts のコード。
再現手順:
バイヤーのマイページ (/member/me) から、ロール付与に失敗しているプランに対し「Discord連携をして権限を受け取ってください」等の導線から再連携/再付与をリクエストする。
フロントエンドは buyerApi.requestRoleGrant() を呼び出す。
実際の結果: Edge Function discord-bot は該当アクションを正しく処理できず（あるいはモックに吸い込まれ）、Unknown action となる。
期待結果: discord-bot が grant_role アクションを受け付け、対象ユーザーに適切なロールを付与する。
想定原因: フロントエンドの buyerApi では action: "grant_role" を想定しているが、バックエンド側（Edge Function）の実装が不完全、または仕様の不整合があるため。
追加検証方法: E2Eテストで MemberMe 画面から「ロール再付与リクエスト」を実行し、ネットワークリクエストと結果を確認する。
修正方針の概要: discord-bot Edge Function 側に grant_role アクションの処理を正しく実装し、フロントエンドの API クライアントと契約を合わせる。
高確度の不具合候補
6. Webhook 失敗時の自動再試行抑止（P0-2）
タイトル: stripe-webhook 処理失敗時に常に HTTP 200 を返却してしまう懸念
深刻度: 🟠 High
区分: 決済 / Webhook
根拠: docs/qa/implementation-gap-risk-priority-tests-20260303.md で指摘されている本番リスク。
再現手順:
stripe-webhook 実行中に DB 障害や Discord API エラーなどの内部エラーを意図的に発生させる。
実際の結果: エラーをキャッチして内部処理を中断するが、Stripe に対しては HTTP 200 を返却してしまう設計になっている（可能性がある）。
期待結果: 致命的なエラー時は HTTP 5xx を返却し、Stripe 側の自動リトライ機構をトリガーする。
想定原因: 例外処理（try-catch）内でエラーを吸収しすぎているため。
追加検証方法: stripe-webhook 宛に不正なペイロード（ただし署名は正しい）を送り、レスポンスステータスコードを確認する。
修正方針の概要: Webhook のエラーハンドリング戦略を統一し、リトライが必要なエラーでは明示的に 500 を返す、あるいは専用の再処理キューシステムを導入する。
7. system_announcements の SELECT RLS ポリシー欠落（BUG-11）
タイトル: 一般ユーザーがお知らせを閲覧できない RLS 設定漏れ
深刻度: 🟠 High
区分: RLS / 権限
根拠: docs/production-readiness-tests.md および supabase/migrations/20260228000000_production_readiness_fixes.sql での修正案提示。
再現手順:
バイヤーまたはセラーとしてログインする。
system_announcements テーブルに対して SELECT を実行する（ダッシュボード等で取得を試みる）。
実際の結果: RLS ポリシーによってブロックされ、データが取得できない（0件返却）。
期待結果: is_published = true のお知らせデータを取得できる。
想定原因: system_announcements に対して platform_admin 向けの ALL ポリシーのみが存在し、一般向け SELECT ポリシーが欠落しているため。
追加検証方法: Supabase ダッシュボードまたは API からバイヤーの JWT を使って対象テーブルを SELECT する。
修正方針の概要: is_published = true の条件で Authenticated ユーザーが SELECT できる RLS ポリシーを追加する。
8. current_period_end の未設定によるデータ不整合（BUG-10）
タイトル: subscriptions.current_period_end が Webhook 経由で保存されない
深刻度: 🟠 High
区分: 決済 / データ整合性
根拠: docs/production-readiness-tests.md。
想定原因: checkout.session.completed イベント処理時に、Stripe API からサブスクリプションの詳細を取得して current_period_end を DB（memberships テーブル）に保存する処理が抜けている。
修正方針の概要: Webhook 処理内でサブスクリプション情報を Retrieve し、期末日時を保存するように処理を追加。
未確認だが危険な論点
9. オンボーディング状態の localStorage 依存（P0-3）
タイトル: セラーのオンボーディング進捗がブラウザ依存
深刻度: 🟡 Medium
区分: アーキテクチャ / UX
想定原因: 進捗状態が localStorage（例: seller_onboarding_step）のみに保存されており、端末を変えると最初からやり直しになる、あるいは本来の権限状態と UI が不一致になるリスクがある。
修正方針の概要: seller_profiles 等の DB テーブルに状態カラムを追加し、バックエンドを正とするアーキテクチャに変更する。
10. grace_period から expired への自動遷移未実装（BUG-12）
タイトル: 猶予期間終了後の自動ステータス更新機能の欠如
深刻度: 🟡 Medium
区分: 運用 / バッチ処理
想定原因: grace_period_ends_at を過ぎたメンバーシップを expired にする cron ジョブ（pg_cron等）がセットアップされていないため、永久に猶予期間のままとなる。
修正方針の概要: Supabase の pg_cron または外部のバッチワーカーを用いて定期実行処理を実装する。
テスト不足・監視不足
運用画面の実データ欠落 (P1-1)
Seller向けのタイムライン (getMemberTimeline)、クロスチェック (getCrosscheck)、Webhook一覧 (getWebhooks) が固定の空配列やスタブを返す実装（例: src/services/api/supabase/seller.ts）になっている。障害調査やユーザーサポートが UI から実施できない。
Platform運用機能の未実装 (P1-2)
terminateJob, saveAnnouncement などが Not Implemented エラーを投げるモック状態。
二重構成による混乱リスク (P2)
backend/app/api/ 以下の FastAPI 実装がモック応答中心のまま存在しており、実際の通信経路である Supabase Edge Functions と混在している。本番環境の通信パスがわかりにくく、開発・運用時の認知負荷が高い。
優先順位付き対応リスト
【最優先対応 (Hotfix / P0)】

[BUG-07] 削除済みプランの Checkout 阻止（SQLクエリ修正）
[BUG-08] stripe-onboarding のセラーロール検証追加
[BUG-13] Edge Functions の CORS 設定修正（ワイルドカード排除）
[BUG-09] discord_identities の空文字制約追加（DBスキーマ修正）
[BUG-10] memberships.current_period_end の保存処理追加
[BUG-11] system_announcements の SELECT RLS 追加
[P0-1] discord-bot Edge Function の grant_role 実装完了
[P0-2] stripe-webhook エラーハンドリング（5xx返却）の徹底
【中・長期対応 (P1 / P2)】

[BUG-12] pg_cron による grace_period 期限切れ自動バッチの導入
[P0-3] セラーのオンボーディング状態のDB（サーバーサイド）管理化
[P1-1 & P1-2] Seller / Platform 各種運用 API（Timeline, Crosscheck, お知らせ等）の実装
[P2] バックエンド構成（FastAPI vs Supabase Edge Functions）のドキュメント整理と不要なモックの撤去
以上がバグ監査レポートとなります。