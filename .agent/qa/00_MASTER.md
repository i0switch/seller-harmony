# 00_MASTER — 自律QAの前提とDone条件

## 参照（唯一の要件）
- 要件定義_ai_optimized.md を唯一の仕様として扱う（逸脱は禁止）

## 対象環境
- ローカル（dev server）
- Lovable hosting（本番相当のUI検証）：https://preview--member-bridge-flow.lovable.app/

## 重要：資格情報の扱い
- **パスワード/トークン/キーはログ・スクショ・レポートに絶対出さない**
- 認証が必要な場合は、ログイン画面を開き、**秘密入力（secure input）**で入力する
- 共有されているのはメールのみ：
  - 管理者メール：i0switch.g@gmail.com
  - 一般ユーザーメール：i0switch.g+test01@gmail.com
  - パスワードは「秘密入力」で設定（本文には書かない）

## Done条件（これを満たすまで止まらない）
### A. 仕様準拠
- 要件定義の主要項目が「実装箇所＋自動テスト＋E2E」で裏付けられている

### B. 品質
- frontend：build/test/lint がすべて成功（存在するもの）
- backend/edge：テスト成功（存在するもの）
- E2E：主要フローが3回連続成功（ローカル・Lovable両方）

### C. セキュリティ
- Webhook署名検証のFail-Closedが担保される
- OAuth state検証が担保される
- Supabase service_role など秘密がクライアント露出していない
- RLSの穴がない（テナント分離が崩れない）

## 進め方（必ずループ）
1) 静的監査 → 2) テスト実行 → 3) 失敗修正 → 4) 回帰確認 → 5) ログ記録
ログは docs/setup/implementation-log.md に追記する