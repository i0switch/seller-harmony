# AGENTS.md

## Project Overview
- Project: Seller Harmony (multi-tenant SaaS front-end prototype)
- Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui
- Current phase: UI complete (mock API based). Next phase: backend/API integration and automation-first implementation with Antigravity.

## Core Product Model
This is a **multi-tenant SaaS** with 3 separated roles:
1. Platform Admin (SaaS operator)
2. Tenant Admin / Seller (SaaS customer)
3. End Member / Buyer (customer's fanclub member)

Do not merge Platform and Seller flows.

## Current Frontend Status (already implemented)
- Role-separated routes exist for Platform / Seller / Buyer
- Shared components: table, badge, dialogs, pagination, timeline, filter bar
- Mock APIs exist with delay/error simulation
- Seller onboarding is separated from dashboard and guarded

## Development Rules (must follow)
1. Preserve route separation and role boundaries.
2. Prefer incremental changes with small diffs.
3. Keep TypeScript strict-friendly (no `any` unless justified).
4. Do not remove mock API paths until replacement APIs are wired.
5. For destructive actions, keep confirmation UI.
6. Add loading / empty / error states for new list screens.
7. Never commit secrets. Use `.env` files only.

## Backend Integration Priorities
1. Auth (Supabase Auth for Platform/Seller/Buyer as designed)
2. Data model (Supabase tables / RLS)
3. Webhook receiver (FastAPI) + Stripe signature verification
4. Discord role sync worker
5. Crosscheck jobs / retry queue

## Commands (frontend)
- `npm install`
- `npm run dev`
- `npm run test`
- `npm run lint`
- `npm run build`

## Definition of Done for each Antigravity task
- Builds locally (or task scope explicitly excludes build)
- Type errors not increased
- Route/UI behavior preserved unless intentionally changed
- Mock fallback retained when backend endpoint unavailable (until full cutover)
- Changes documented in `docs/setup/implementation-log.md`
