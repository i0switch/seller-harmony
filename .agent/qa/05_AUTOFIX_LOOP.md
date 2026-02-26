# 05_AUTOFIX_LOOP — 自律改善ループ（止まらない）

## 目的
テスト→修正→再テスト→回帰防止を自律で回し、Done条件を満たすまで続ける。

## ループ手順（必ず毎回）
1) build/test/lint（存在するコマンド全部）を実行
2) backend/edgeのテストを実行（存在するもの全部）
3) ローカルE2Eを実行（必須）
4) Lovable E2Eを実行（最小）
5) 失敗があれば原因分類（型/状態/ルート/権限/署名/DB/RLS/UI）
6) 最小修正→再実行
7) docs/setup/implementation-log.md に必ず記録

## 終了条件
00_MASTER の Done条件をすべて満たしたときのみ終了。
満たしていない場合、次の改善タスクを自動で追加して継続する。

## 最終成果物（必須）
- docs/qa/requirements-traceability.md
- docs/security/security-review.md
- docs/e2e/README.md
- docs/release-readiness.md