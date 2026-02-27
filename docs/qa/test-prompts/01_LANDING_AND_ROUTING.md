# テスト01: ランディングページ・ルーティング・404

> **カテゴリ**: ナビゲーション基盤  
> **優先度**: P0 (Critical)  
> **推定所要時間**: 10分  
> **前提条件**: なし（未認証状態で実行）

---

## AIエージェントへの指示

```
以下のテストケースをブラウザで順番に実行してください。
テスト環境: https://preview--member-bridge-flow.lovable.app/
認証不要のテストです。ログアウト状態で実施してください。
```

---

## TC-01-01: ランディングページの表示

**手順**:
1. `https://preview--member-bridge-flow.lovable.app/` にアクセス

**期待結果**:
- [ ] ページタイトル「🎤 ファンクラブ運用インフラ」が表示される
- [ ] サブタイトル「マルチテナントSaaS」が表示される
- [ ] 3つのナビゲーションカードが表示される:
  - 「🛡️ Platform Admin」— サブテキスト「SaaS管理者としてログイン」
  - 「🎤 Seller / Tenant」— サブテキスト「販売者としてログイン」
  - 「🎫 Buyer / Member」— サブテキスト「購入者フローを確認」
- [ ] ページ全体が崩れず、レイアウトが中央揃えで表示される

---

## TC-01-02: ランディングページからの各ロールへの遷移

**手順**:
1. ランディングページで「🛡️ Platform Admin」カードをクリック

**期待結果**:
- [ ] `/platform/login` に遷移する
- [ ] Platform管理者ログインフォームが表示される

**手順**:
2. ブラウザの戻るボタンでランディングページに戻る
3. 「🎤 Seller / Tenant」カードをクリック

**期待結果**:
- [ ] `/seller/login` に遷移する
- [ ] Sellerログインフォームが表示される

**手順**:
4. ブラウザの戻るボタンでランディングページに戻る
5. 「🎫 Buyer / Member」カードをクリック

**期待結果**:
- [ ] `/checkout/success` に遷移する
- [ ] 決済完了ページが表示される

---

## TC-01-03: 存在しないURLへのアクセス（404ページ）

**手順**:
1. `https://preview--member-bridge-flow.lovable.app/nonexistent-page` にアクセス

**期待結果**:
- [ ] 404 Not Found ページが表示される
- [ ] 白い画面やエラーではなく、適切なNotFoundコンポーネントが表示される
- [ ] ランディングページに戻るリンクまたはナビゲーションが存在する

**手順**:
2. `https://preview--member-bridge-flow.lovable.app/platform/nonexistent` にアクセス

**期待結果**:
- [ ] 同様にNotFoundページ、またはPlatformLayoutでの適切なエラー表示

**手順**:
3. `https://preview--member-bridge-flow.lovable.app/seller/nonexistent` にアクセス

**期待結果**:
- [ ] 同様にNotFoundページ、またはリダイレクト

---

## TC-01-04: 認証ガードのリダイレクト確認

**手順** (未ログイン状態で):
1. `https://preview--member-bridge-flow.lovable.app/seller/dashboard` に直接アクセス

**期待結果**:
- [ ] `/seller/login` にリダイレクトされる
- [ ] ダッシュボードの内容は表示されない

**手順**:
2. `https://preview--member-bridge-flow.lovable.app/platform/dashboard` に直接アクセス

**期待結果**:
- [ ] `/platform/login` にリダイレクトされる
- [ ] ダッシュボードの内容は表示されない

**手順**:
3. `https://preview--member-bridge-flow.lovable.app/seller/plans` に直接アクセス

**期待結果**:
- [ ] `/seller/login` にリダイレクトされる

**手順**:
4. `https://preview--member-bridge-flow.lovable.app/seller/members` に直接アクセス

**期待結果**:
- [ ] `/seller/login` にリダイレクトされる

---

## TC-01-05: 直接URLアクセスの動作確認（公開ページ）

**手順**:
1. `https://preview--member-bridge-flow.lovable.app/checkout/success` に直接アクセス

**期待結果**:
- [ ] 決済完了ページが正常に表示される（ログイン不要）

**手順**:
2. `https://preview--member-bridge-flow.lovable.app/buyer/discord/confirm` に直接アクセス

**期待結果**:
- [ ] Discord連携確認ページが表示される（またはBuyer認証要求）

**手順**:
3. `https://preview--member-bridge-flow.lovable.app/seller/signup` に直接アクセス

**期待結果**:
- [ ] 販売者登録ページが正常に表示される（ログイン不要）

---

## テスト完了チェックリスト

| TC | テスト名 | 結果 | 備考 |
|---|---|---|---|
| TC-01-01 | ランディングページ表示 | | |
| TC-01-02 | 各ロール遷移 | | |
| TC-01-03 | 404ページ | | |
| TC-01-04 | 認証ガードリダイレクト | | |
| TC-01-05 | 公開ページ直接アクセス | | |
