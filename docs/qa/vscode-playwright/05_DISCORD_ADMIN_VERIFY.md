# Step 05: Discord連携 + Admin確認

## 目的

Discord OAuth連携と管理者画面での整合性確認を行う。

## テスト観点

- BuyerのDiscord OAuth導線
- ロール付与/剥奪の処理結果
- Admin画面での状態可視化

## 実施手順

1. Hosted E2Eの対象シナリオを実行

```powershell
npm run e2e:hosted
```

2. Discord Developer Portal 側で設定差異がないか確認
- Redirect URL
- Bot権限

3. Adminアカウントで最終確認
- 対象ユーザーの状態
- 決済/連携ステータス

## 完了条件

- Discord連携が失敗なく完了
- Admin画面でデータ整合が確認できる
