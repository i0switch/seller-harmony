seller-harmony バグ調査レポート
1. 全体所見
リスクの高い領域
認証/権限分離とテナント分離：Seller API の一部取得処理で seller_id 条件が欠落しており、RLS 設定に依存した安全性になっています（実装だけ見ると越権アクセス余地あり）。

課金導線（Checkout Success）：session_id 欠落時に警告は立てるが最終的に null を返して画面が空になる経路があります。UX/導線断絶の再現性が高いです。

Discord/Onboarding フロー：Hook呼び出し順違反が静的に検出されており、レンダー条件によって不安定化し得ます。

シークレット管理：リポジトリ内に実運用系と思われる認証情報・鍵が平文で存在しています（重大）。

重点的に見た理由
プロジェクト方針として「3ロール分離」「strict TS」「秘密情報コミット禁止」が明示されており、今回の重点観点（Auth/Billing/Webhook/Permissions）と一致するためです。

実施チェック（コマンド）
✅ npm run build

❌ npm run lint

❌ npm run test -- --run

❌ npm run e2e（多数失敗を確認後、長時間実行のため打ち切り）

2. 確認済みバグ
2-1. Onboarding 画面で Hook 呼び出し順違反（React Hooks rule）
深刻度: High

種別: Auth / UI / Test

発生箇所: OnboardingProfile, OnboardingDiscord

再現手順

npm run lint を実行

react-hooks/rules-of-hooks エラーを確認

実際の結果

条件分岐 if (isOnboarded) return ... の後に useState があり、Hook順序違反が静的検出される。

期待結果

全Hookは常に同順序で評価される。

根拠ファイル/ログ

条件 return 後に useState がある実装。

原因の仮説

ガードリダイレクトを Hook 宣言より先に置いた設計。

修正方針の概要（コードは書かない）

Hook 宣言を先頭に統一し、ガードはその後に評価する。

2-2. /checkout/success が条件次第で空画面になる
深刻度: High

種別: Billing / UI

発生箇所: CheckoutSuccess

再現手順

/checkout/success に session_id なしでアクセス

警告状態に遷移後の描画を確認

実際の結果

plan が null のまま return null となり、画面が空になる。

期待結果

session_id 不在でもフォールバックUI（購入履歴リンクや再試行導線）が表示される。

根拠ファイル/ログ

session_id 欠落時は warning をセットして終了するが、描画時に !plan で null を返却。

原因の仮説

warning 表示と plan 表示の分岐条件が不整合。

修正方針の概要（コードは書かない）

plan なし専用のフォールバックUIを追加し、return null を廃止する。

2-3. OnboardingDiscord のユニットテストが実行不能（AuthProvider欠落）
深刻度: Medium

種別: Test / Auth

発生箇所: OnboardingDiscord.test.tsx

再現手順

npm run test -- --run

OnboardingDiscord 系4件失敗を確認

実際の結果

テストが useAuth must be used within an AuthProvider で失敗する。

期待結果

テスト対象が必要コンテキストでラップされ、検証ロジックまで到達する。

根拠ファイル/ログ

テストは MemoryRouter のみで AuthProvider がない。

対象コンポーネントは useSellerAuth（= useAuth）を直接使用。

原因の仮説

テスト基盤の Provider 構成不足。

修正方針の概要（コードは書かない）

テストレンダラを実アプリ同等の Provider 構成に揃える。

2-4. 機密情報のリポジトリ露出
深刻度: Critical

種別: Security / Config

発生箇所: テスト計画書・E2Eテスト・Supabase client

再現手順

該当ファイルを確認

実際の結果

管理者メール/パスワード、Supabase URL/anon key が平文で保存されている。

期待結果

秘密情報は .env またはシークレットストア管理。

根拠ファイル/ログ

平文アカウント情報。

テスト内に Supabase URL/anon key ハードコード。

アプリ本体 client に URL/key 直書き。

「秘密情報をコミットしない」方針と矛盾。

原因の仮説

検証容易化のための暫定値が恒久化。

修正方針の概要（コードは書かない）

直書き情報のローテーション、履歴除去、環境変数化、CIシークレット注入へ移行。

3. 高確度のバグ候補
3-1. Buyer の保護ページ /member/me が実質未ガード
深刻度: High

種別: Auth / Permissions

発生箇所: ルーティング・BuyerLayout・MemberMe

再現手順

未ログインで /member/me へ遷移

実際の結果（高確度）

ルート自体は BuyerLayout 配下で認証判定がなく、MemberMe 側も未ログイン時に強制リダイレクトしない。

期待結果

未認証なら /buyer/login へ遷移。

根拠ファイル/ログ

/member/me は BuyerLayout 配下だが guard なし。

MemberMe は getUser() で user 不在時に読み込み解除のみ実施し遷移しない。

原因の仮説

Buyer role 専用ガード導入が未完了。

修正方針の概要（コードは書かない）

BuyerLayout もしくは route-level で useBuyerAuth を用いた保護を追加。

3-2. Seller API の単票取得が seller_id 制約なし（RLS依存）
深刻度: High

種別: Permissions / Data

発生箇所: sellerApi.getPlanById, sellerApi.getMemberById, getMemberTimeline

再現手順

Seller として他IDを直接指定（URL直打ち）

実際の結果（高確度）

クエリが id のみ条件で seller_id = currentUser を掛けていない。

期待結果

明示的な seller_id 制約を常時適用。

根拠ファイル/ログ

getPlanById は eq("id", id) のみ。

getMemberById は eq("id", id) のみ。

getMemberTimeline 初手取得も memberId のみ。

原因の仮説

RLS前提でアプリ側ガードを省略。

修正方針の概要（コードは書かない）

アプリ側でも seller_id 条件を必須化し、二重防御にする。

3-3. PlatformLogin で render 中に navigate 実行
深刻度: Medium

種別: UI / Auth

発生箇所: PlatformLogin

再現手順

isLoggedIn=true 状態で /platform/login を表示

実際の結果（高確度）

レンダー中に navigate() 呼び出し。React warning/再描画競合の温床。

期待結果

<Navigate /> 使用か useEffect で遷移。

根拠ファイル/ログ

render body に直接 navigate("/platform/dashboard") がある。

原因の仮説

早期リダイレクトを簡便実装。

修正方針の概要（コードは書かない）

宣言的ナビゲーションへ移行。

3-4. Supabase client の固定値化で環境差分吸収不可
深刻度: Medium

種別: Config

発生箇所: supabase/client.ts

再現手順

別環境で .env を変えて起動

実際の結果（高確度）

接続先は固定URL/固定キーのため切替不能。

期待結果

.env ベースで環境切替できる。

根拠ファイル/ログ

URL/KEY が定数直書き。

.env.example では変数運用が想定されている。

原因の仮説

自動生成clientをそのまま採用。

修正方針の概要（コードは書かない）

環境変数優先・未設定時 fail-fast に統一。

4. 未確認だが要調査の論点
Webhook fail-closed / 冪等性の実装本体が本リポジトリで追えない

何が怪しいか: 重点観点だが、ここで確認できる backend はモック中心で Stripe署名検証や冪等DB制御が見えない。

なぜ怪しいか: readyz は secret 有無のみ確認し、実処理ルートがない。Edge Function 側ソース不在。

追加検証: Supabase Edge Functions (stripe-webhook) の署名検証・イベント重複処理・再実行セマンティクスをコード/ログで監査。

Discord OAuth の membership 紐付け整合性

何が怪しいか: DiscordResult では OAuth 成功時に UI上は固定文言（guild/role/plan）表示。実データ整合が確認できない。

なぜ怪しいか: save:false/save:true の2段階で、どの membership に対する付与か画面上根拠が薄い。

追加検証: discord-oauth 関数実装で state・user・membership の三者整合と再入安全性を確認。

Platform系APIの可用性（mock fallback不足）

何が怪しいか: Platform API は HTTP 直アクセス固定で、ローカルAPI未起動時は機能停止。

なぜ怪しいか: AGENTS の「mock fallback維持」とズレる。

追加検証: APIダウン時の画面導線・代替表示・read-only fallback をE2Eで確認。

5. テストの穴
未カバー領域

Buyer 未認証アクセス制御（/member/me 直アクセス）をユニットで明示検証していない。MemberMe.test は buyerApi の表示ロジック中心。

CheckoutSuccess の session_id なし/membership なし時の表示保証テストがない（E2Eには要件記述はある）。

OnboardingDiscord テストがProvider不整合で落ちており、本来検証したいUI分岐が未検証。

追加すべきテスト観点

Role分離: platform/seller/buyer の誤ログイン時遷移、直接URLアクセス拒否。

Billing: checkout/success で session_id 欠落・期限切れ・他人の session_id。

Permissions: seller単票APIに対する他テナントIDアクセス拒否。

Discord: OAuth state再利用・二重submit・途中離脱復帰。

Webhook: 署名不正、同一event重複、部分失敗時の再実行整合。

6. 優先順位つき一覧
P0
**機密情報露出（ドキュメント/テスト/クライアント）**

**CheckoutSuccess 空画面バグ（購入後導線断絶）**

P1
**Seller API 単票取得の seller_id 制約欠落（越権リスク）**

**Buyer /member/me 未ガード（認証フロー不整合）**

P2
**Onboarding Hook順序違反（不安定化要因）**

**OnboardingDiscord テスト基盤破綻（品質ゲート低下）**

PlatformLogin の render中navigate