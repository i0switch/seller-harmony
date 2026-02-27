# Security Review (02_SECURITY_SUPABASE)

実施日: 2026-02-27  
仕様基準: `要件定義_ai_optimized.md`  
最終更新: 2026-02-27 QAサイクル2

## 指摘一覧（重大/高/中/低）

| # | Severity | Area | Finding | Status |
|---|---|---|---|---|
| 1 | Critical | .gitignore | `.env`ファイルが`.gitignore`に未登録。シークレットがリポジトリにコミットされうる | **修正済み** |
| 2 | High | Discord OAuth (CSRF) | Edge Function側でstateのサーバーサイド突合（DB保存→比較）が行われていなかった | **修正済み** |
| 3 | High | Discord OAuth (CSRF) | `discord-oauth` callbackで`state`未指定でもトークン交換に進める実装だった | **修正済み（前回）** |
| 4 | Medium | Webhook Fail-Closed | `STRIPE_SECRET_KEY`空文字チェックなし → 後続Stripe APIコール時に初めて失敗 | **修正済み** |
| 5 | Medium | Discord OAuth | `redirect_uri`のバリデーションがなく、オープンリダイレクトリスク | **修正済み** |
| 6 | Medium | CORS | 全Edge Functionsで`Access-Control-Allow-Origin: '*'` | 残リスク（要本番デプロイ時対応） |
| 7 | Medium | Edge checkout | `stripe-checkout`で`plan_id`の型チェック（UUID形式）がない | 残リスク（低影響: Supabase SDK injection防止） |
| 8 | Medium | DB Migration | `manual_override`カラムのマイグレーション欠落。Webhook関数がクエリで参照するが未定義 | **修正済み** |
| 9 | Medium | Billing Grace Policy | `invoice.payment_failed`時の猶予日数が仕様初期値(3日)ではなく7日だった | **修正済み（前回）** |
| 10 | Medium | DB Performance | `memberships`要件インデックス不足 | **修正済み（前回）** |
| 11 | Medium | State transitions | `charge.refunded`/`charge.dispute.created`ハンドラ未実装 | **修正済み** |
| 12 | Medium | Audit Logs | `audit_logs`への実書き込みと`correlation_id`伝搬が未実装 | **修正済み** |
| 13 | Low | Frontend | `dangerouslySetInnerHTML`使用（shadcn/ui chart → 外部入力なし）| 問題なし |
| 14 | Low | Secret exposure | フロントコード内に`service_role`/Stripe secret/Discord secretのハードコード痕跡なし | 問題なし |

## 修正内容（ファイル/差分）

### QAサイクル2（今回）
- `.gitignore` — `.env`/`.env.*`/`backend/.env*`パターン追加
- `supabase/functions/discord-oauth/index.ts`
  - サーバーサイドstate検証（DB保存→callback時に突合＋10分有効期限）
  - `redirect_uri`ホワイトリスト検証
  - 使用済みstateのクリア（one-time use）
  - `pending_discord`→`active`自動遷移（Discord連携完了時）
- `supabase/functions/stripe-webhook/index.ts`
  - `STRIPE_SECRET_KEY`空文字チェック追加（起動時警告ログ）
  - `charge.refunded`ハンドラ追加（→refunded状態遷移＋role剥奪）
  - `charge.dispute.created`ハンドラ追加（→risk_flag設定）
  - `checkout.session.completed`でDiscord未連携時は`pending_discord`に遷移
  - 全主要イベントに`writeAuditLog()`追加（correlation_id=event.id）
- `supabase/migrations/20260227000003_manual_override_and_refund.sql`
  - `memberships.manual_override`カラム追加
  - `role_assignments`複合インデックス追加
  - `discord_identities.oauth_state`/`oauth_state_created_at`カラム追加

### QAサイクル1（前回）
- `supabase/functions/discord-oauth/index.ts` — state必須化
- `src/pages/buyer/DiscordResult.tsx` — state送信統一
- `supabase/functions/stripe-webhook/index.ts` — grace_period 7日→3日、ログ機微情報削減
- `supabase/migrations/20260227000002_membership_indexes.sql` — インデックス追加

## 監査結果（要件別）

| 要件 | 結果 |
|---|---|
| Stripe Webhook署名検証 Fail-Closed | PASS — signature必須、secret未設定→500拒否、検証失敗→400拒否 |
| Stripe冪等性 | PASS — `stripe_event_id`重複スキップ実装あり |
| Discord OAuth state検証 | PASS — フロント照合＋Edge側サーバーサイドDB突合（10分有効期限＋one-time use） |
| Open redirect防止 | PASS — `redirect_uri`ホワイトリスト検証追加 |
| RLS（全主要テーブル） | PASS — 10テーブルで有効、ポリシー定義確認済み |
| シークレット非露出 | PASS — フロントはanon keyのみ、Edge FunctionsはDeno.env取得 |
| `plans.deleted_at` | PASS |
| `audit_logs.action`制約 | PASS — CHECK制約＋writeAuditLog()による列挙値管理 |
| membershipsインデックス | PASS |
| role_assignmentsインデックス | PASS |

## 残リスク（理由つき）

1. **CORS origin `*`** — 全Edge FunctionsでOrigin無制限。本番デプロイ時にホワイトリスト化が必要。現段階は開発環境のため許容。
2. **plan_id UUID型バリデーション** — `stripe-checkout`でplan_idの形式チェックがない。Supabase SDKがSQLインジェクションを防止するため実害は低い。
3. **Edge Functionユニットテスト不足** — 署名検証・state異常系の機械的回帰テストがない。コードレビューで代替中。
4. **日次番人バッチ未デプロイ** — `grace_period_ends_at`超過→`expired`自動遷移のcronジョブはインフラ依存。
