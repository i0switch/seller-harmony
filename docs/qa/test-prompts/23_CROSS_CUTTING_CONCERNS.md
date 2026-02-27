# テスト23: 横断的検証（認証ガード・ナビゲーション・Toast・共通コンポーネント）

> **カテゴリ**: 横断的品質  
> **優先度**: P1 (High)  
> **推定所要時間**: 20分  
> **前提条件**: 各ロールでの認証が可能

---

## AIエージェントへの指示

```
アプリケーション全体に横断的に適用される機能の一貫性を検証してください。
テスト環境: https://preview--member-bridge-flow.lovable.app/

認証ガード、ナビゲーション、Toast通知、共通UIコンポーネント（
DataTable、ConfirmDialog、EmptyState、ErrorBanner、FilterBar、
PaginationBar、StatusBadge、TimelineList、LoadingSkeleton）の
一貫した動作を確認してください。
```

---

## TC-23-01: 認証ガード — Sellerルートの保護

**手順**（未認証状態で以下の全URLにアクセス）:
1. `/seller/dashboard`
2. `/seller/plans`
3. `/seller/plans/new`
4. `/seller/members`
5. `/seller/crosscheck`
6. `/seller/webhooks`
7. `/seller/settings/discord`

**期待結果**:
- [ ] すべてのURLで `/seller/login` にリダイレクトされる
- [ ] 保護されたコンテンツが一瞬も表示されない（フラッシュなし）

---

## TC-23-02: 認証ガード — Platformルートの保護

**手順**（未認証状態で以下の全URLにアクセス）:
1. `/platform/dashboard`
2. `/platform/tenants`
3. `/platform/tenants/t1`
4. `/platform/webhooks`
5. `/platform/retry-queue`
6. `/platform/announcements`
7. `/platform/system-control`

**期待結果**:
- [ ] すべてのURLで `/platform/login` にリダイレクトされる
- [ ] platform_admin以外のロールではアクセスが拒否される

---

## TC-23-03: オンボーディングガード

**手順**（Sellerログイン済み、オンボーディング未完了で）:
1. `/seller/dashboard` にアクセス

**期待結果**:
- [ ] 現在のオンボーディングステップにリダイレクトされる
  - profile未完了 → `/seller/onboarding/profile`
  - stripe未完了 → `/seller/onboarding/stripe`
  - discord未完了 → `/seller/onboarding/discord`
- [ ] ダッシュボードは表示されない

---

## TC-23-04: ConfirmDialogの一貫性

**手順**:
1. 以下の画面でConfirmDialogをすべて開いて確認:
   - プラン停止/公開 (`/seller/plans`)
   - 会員再付与/剥奪 (`/seller/members/{id}`)
   - クロスチェック再付与/剥奪 (`/seller/crosscheck`)
   - Webhook再処理 (`/seller/webhooks`)
   - テナント停止/再開 (`/platform/tenants`)
   - リトライ再試行/終了 (`/platform/retry-queue`)
   - Kill Switchトグル (`/platform/system-control`)
   - Buyerアカウント削除 (`/member/me`)

**期待結果**:
- [ ] すべてのダイアログが同じコンポーネント（ConfirmDialog）を使用
- [ ] タイトル + 説明 + キャンセル + アクションの構造が統一
- [ ] destructive（破壊的）アクションは赤色ボタン
- [ ] 「キャンセル」で確実にダイアログが閉じる
- [ ] アクション実行後にダイアログが閉じてToastが表示される

---

## TC-23-05: StatusBadgeの一貫性

**手順**:
1. 全ページのステータスバッジの表示を確認

**期待結果**:
- [ ] 同じステータスには同じバッジスタイル（色・テキスト）が使用される:
  - active → 緑/正のバッジ
  - suspended / failed → 赤/destructiveバッジ
  - pending → 黄/secondaryバッジ
  - draft → グレー/outlineバッジ
- [ ] テキストラベルが日本語で統一されている

---

## TC-23-06: DataTableの一貫性

**手順**:
1. DataTableを使用している全ページを確認:
   - `/seller/members`
   - `/platform/tenants`
   - `/platform/webhooks`
   - `/platform/retry-queue`

**期待結果**:
- [ ] すべてのテーブルで以下が統一:
  - ソートの挙動（クリックで昇順/降順切り替え）
  - ヘッダーのスタイル
  - 行のホバー効果
  - モバイルでのカード表示切り替え
  - 空状態のEmptyState表示

---

## TC-23-07: PaginationBarの一貫性

**手順**:
1. ページネーション付きの全ページを確認

**期待結果**:
- [ ] ページ番号表示が統一（「X/Yページ」or 類似のフォーマット）
- [ ] 全件数の表示
- [ ] 前ページ/次ページボタン
- [ ] 最初のページで「前へ」が disabled
- [ ] 最後のページで「次へ」が disabled
- [ ] PAGE_SIZEが各ページで適切

---

## TC-23-08: FilterBarの一貫性

**手順**:
1. フィルター付きの全ページを確認

**期待結果**:
- [ ] 検索バーのplaceholderが各ページに適した内容
- [ ] フィルターセレクトのデフォルト値が「すべて」
- [ ] フィルター変更が即座に反映される
- [ ] フィルターとページネーションの連携（フィルター変更時にページが1に戻る）

---

## TC-23-09: LoadingSkeletonの一貫性

**手順**:
1. 各ページのローディング状態を確認

**期待結果**:
- [ ] テーブルページ: `type="table"` のスケルトン
- [ ] カードページ: `type="cards"` のスケルトン
- [ ] ローディング時はインタラクティブ要素が操作不可

---

## TC-23-10: Toast通知の動作

**手順**:
1. 複数のアクションを連続実行してToast通知を確認

**期待結果**:
- [ ] Toastが画面の適切な位置に表示（右上/上部中央等）
- [ ] 複数のToastが同時に表示される場合、スタックされる
- [ ] Toastが自動消去される（3-5秒）
- [ ] X ボタンで手動消去可能

---

## TC-23-11: ログアウト機能

**手順**:
1. Sellerとしてログイン中にログアウトを実行
2. Platformとしてログイン中にログアウトを実行

**期待結果**:
- [ ] ログアウト後、適切なページ（ログインページ or ランディング）にリダイレクト
- [ ] 保護されたページにアクセスできなくなる
- [ ] セッション情報がクリアされる

---

## TC-23-12: 戻りリンクの一貫性

**手順**:
1. 以下のページの「戻る」リンクを確認:
   - `/seller/plans/{id}` → 「プラン一覧」→ `/seller/plans`
   - `/seller/members/{id}` → 「会員一覧」→ `/seller/members`
   - `/platform/tenants/{id}` → 「テナント一覧へ戻る」→ `/platform/tenants`

**期待結果**:
- [ ] すべての詳細ページに戻りリンクがある
- [ ] リンク先が正しい
- [ ] リンクテキストが一貫（「〜一覧」の形式）

---

## TC-23-13: URL直接入力とリフレッシュ

**手順**:
1. 認証済みの状態で以下のURLを直接入力してアクセス:
   - `/seller/plans`
   - `/seller/members/m1`
   - `/platform/tenants/t1`
2. 各ページでF5（リフレッシュ）

**期待結果**:
- [ ] 各ページが正常にロードされる
- [ ] React Routerの履歴が壊れない
- [ ] 認証状態が保持される
- [ ] データが正常に再取得される

---

## TC-23-14: QueryClient/Reactキャッシュの動作

**手順**:
1. `/seller/plans` でデータ確認
2. プランを作成/編集
3. `/seller/plans` に戻る

**期待結果**:
- [ ] 一覧に最新のデータが反映される
- [ ] 古いキャッシュが残って古いデータが表示されない

---

## テスト完了チェックリスト

| TC | テスト名 | 結果 | 備考 |
|---|---|---|---|
| TC-23-01 | Sellerルート保護 | | |
| TC-23-02 | Platformルート保護 | | |
| TC-23-03 | オンボーディングガード | | |
| TC-23-04 | ConfirmDialog一貫性 | | |
| TC-23-05 | StatusBadge一貫性 | | |
| TC-23-06 | DataTable一貫性 | | |
| TC-23-07 | PaginationBar一貫性 | | |
| TC-23-08 | FilterBar一貫性 | | |
| TC-23-09 | LoadingSkeleton一貫性 | | |
| TC-23-10 | Toast通知 | | |
| TC-23-11 | ログアウト | | |
| TC-23-12 | 戻りリンク | | |
| TC-23-13 | URL直接入力 | | |
| TC-23-14 | キャッシュ動作 | | |
