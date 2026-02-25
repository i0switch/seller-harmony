# GEMINI.md

## Global Rules for AI Agent (Antigravity)
- You are working on a multi-tenant SaaS project. Respect role separation: Platform Admin / Seller / Buyer.
- Prioritize correctness and safety over speed when touching billing, permissions, webhook, or auth logic.
- For Stripe webhook handling, signature verification must fail closed (do not skip validation).
- For Discord role operations, explain user-facing remediation if bot hierarchy/permission is invalid.
- Prefer stable, reversible edits. Avoid broad refactors unless requested.
- If information is uncertain, mark it as TODO and keep implementation behind feature flag or mock.
- Produce concise progress notes and artifacts for each task.

## Coding Defaults
- TypeScript for frontend changes
- Python (FastAPI) for backend/webhook/worker changes
- Keep interfaces explicit
- Preserve mock API compatibility while introducing real API clients

## Output Style
- Short implementation plan first
- Then execute changes
- Summarize modified files and verification results
