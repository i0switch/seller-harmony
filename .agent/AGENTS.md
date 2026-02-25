# ワークスペースルール (法律)

このプロジェクト（`seller-harmony`）において遵守すべき固有の開発ルールです。

## プロジェクトコンテキスト
- **Project**: Seller Harmony (multi-tenant SaaS front-end prototype)
- **技術スタック**: React (v18), Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Current phase**: UI complete (mock API based). Next phase: backend/API integration and automation-first implementation.
- **パッケージマネージャー**: npm （プロジェクト内に `bun.lockb` が存在しますが、原則として npm を使用。実行環境に応じて柔軟に判断してください）

## コアプロダクトモデル (Role Separation)
This is a **multi-tenant SaaS** with 3 separated roles:
1. Platform Admin (SaaS operator)
2. Tenant Admin / Seller (SaaS customer)
3. End Member / Buyer (customer's fanclub member)
- Do not merge Platform and Seller flows.

## 現在のフロントエンド実装状況
- Role-separated routes exist for Platform / Seller / Buyer
- Shared components: table, badge, dialogs, pagination, timeline, filter bar
- Mock APIs exist with delay/error simulation
- Seller onboarding is separated from dashboard and guarded

## 開発とコーディング規約 (Development Rules)
1. Preserve route separation and role boundaries.
2. Prefer incremental changes with small diffs.
3. Keep TypeScript strict-friendly (no `any` unless justified).
4. Do not remove mock API paths until replacement APIs are wired.
5. For destructive actions, keep confirmation UI.
6. Add loading / empty / error states for new list screens.
7. Never commit secrets. Use `.env` files only.
8. **コンポーネント設計**:
   - UI は小さく再利用可能なコンポーネントに分割すること。
   - `shadcn/ui` のコンポーネントを優先的に使用・拡張すること。
9. **スタイリング規則**:
   - `className` には Tailwind ユーティリティクラスを直接記述すること。
   - 動的スタイリングには `cn` （`clsx` + `tailwind-merge`）を使用すること。

## バックエンド統合の優先順位 (Backend Integration Priorities)
1. Auth (Supabase Auth for Platform/Seller/Buyer as designed)
2. Data model (Supabase tables / RLS)
3. Webhook receiver (FastAPI) + Stripe signature verification
4. Discord role sync worker
5. Crosscheck jobs / retry queue

## タスク完了の定義 (Definition of Done)
- Builds locally (or task scope explicitly excludes build)
- Type errors not increased
- Route/UI behavior preserved unless intentionally changed
- Mock fallback retained when backend endpoint unavailable (until full cutover)
- Changes documented in `docs/setup/implementation-log.md`
- 大きな機能追加やリファクタリングを行う際は、必ず変更を適切な意味のある単位（タスク）に分割し確認を取りながら進めること。
