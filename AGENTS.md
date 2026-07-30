# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains App Router routes. Product UX lives under `app/(marketing)/` but **renders as an app shell** (chat / library / docs / site) — not a brochure site.
- `components/organisms/app-shell.tsx` is the canonical chrome for product routes. Prefer it over `MarketingFooter` / ad-hoc headers.
- `components/` implements atomic layers; keep primitives in `components/ui/` and compose through molecules → organisms → templates.
- `lib/storage/` is the default persistence layer (Vercel Blob + Upstash Redis). Prefer it over `lib/db/`.
- `lib/workers/simple-scan.ts` is the default scan pipeline; `scan-orchestrator.ts` is legacy Postgres.
- `lib/` also houses `lib/ai/`, `lib/mcp/`, `lib/agent/`, `lib/utils.ts`; client state lives in `hooks/` and `stores/`.
- **Design system of record:** [`DESIGN.md`](./DESIGN.md). Follow it for all UI. `DESIGN_SYSTEM.md` is legacy.

## Product routing (keep cohesive)

| Route | Shell nav | Notes |
|-------|-----------|-------|
| `/` | Chat | Primary product — `ScanChat` full viewport |
| `/community` | Library | Directory of scanned contracts |
| `/docs` | Docs | Install + API |
| `/site/[domain]` | — | Detail view; **hydrate cache, don’t auto-rescan** |
| `/features`, `/pricing`, `/about` | More | Same `AppShell`; quiet content via `PageCanvas` |
| `/contact`, `/privacy`, `/terms` | Legal links | Same shell; no separate marketing chrome |
| `/metrics` | — | Live metrics; still use `AppShell` |
| `/scan`, `/agent` | → `/` | Redirects (keep `?url=`) |

When adding pages:
1. Wrap with `AppShell` + `currentPage` (and `PageCanvas` if scrollable).
2. Add a sidebar item under Primary or More if users need persistent access.
3. Update `DESIGN.md` route table and this file.
4. Never introduce a second competing nav (`MarketingHeader` / `MarketingFooter` / `VercelHeader`) on public routes.

## Design & UI rules (summary)
- App-like: sidebar + canvas, **no marketing footer** on any AppShell route.
- **Cream-first** (`#f7f7f4`) + warm ink (`#26251e`) + scarce **Contract Orange** (`#f54e00`) — Cursor editorial system.
- Inter (display/body weight 400) + JetBrains Mono (code). Hairline borders only — no shadows.
- Chat empty state = brand + one line + chips + composer. No hero cards/stats.
- Timeline pastels only for scan/agent stages — never CTAs.
- Inline scan widgets stay compact; Open uses cache/handoff (no auto-rescan).
- Details: [`DESIGN.md`](./DESIGN.md).

## Build, Test, and Development Commands
- `bun install` syncs dependencies after cloning or pulling.
- `bun dev` serves Turbopack at `http://localhost:3000`; `bun run build` + `bun start` verify the production bundle.
- `bun lint` runs the Next.js ESLint config; fix issues locally with `bun lint --fix` when supported.
- No database migrate step for the default path — set `BLOB_READ_WRITE_TOKEN` + Upstash Redis env vars for durable storage.
- Accurate scans need `SCANNER_SERVICE_URL` (e.g. `https://designcontracts-scanner.vercel.app`) + matching `SCANNER_SERVICE_SECRET`.
- Blob persistence: `BLOB_READ_WRITE_TOKEN` required. Store may be public or private — `lib/storage/serverless-store.ts` tries both (override with `BLOB_ACCESS`).
- `/site/[domain]` must hydrate from cache/handoff and **must not auto-rescan** on Open.
- `bun run test` executes Playwright end-to-end suites; scope runs with `--project` or `--grep` when iterating.
- `bun run test:unit` runs Vitest unit specs.

## Coding Style & Naming Conventions
- Keep TypeScript strict; avoid `any` and add explicit return types on shared helpers.
- Use PascalCase for components, camelCase for utilities, and prefix hooks with `use`; colocate files with the feature they support.
- Favor Tailwind utilities and semantic CSS variables from `globals.css` rather than hard-coded colors.
- Format with the repo’s Prettier + ESLint integration and add `"use client"` only when interactivity is required.

## Testing Guidelines
- Place unit specs as `*.spec.ts` beside the source or inside a local `__tests__` folder.
- Maintain Playwright coverage for chat entry, library browsing, and MCP handshake flows.
- When changing shell/nav, update e2e selectors that assumed the old marketing header/footer.
- Run `bun lint` and `bun run test` before opening a PR; note flakes in the description.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(scanner): describe change`) to keep history and releases machine-friendly.
- Keep branches focused, rebase on `main`, and avoid merge commits in review.
- PRs need a concise summary, linked issues, and before/after evidence when UI or JSON contracts change.
- Flag Blob/Redis/scanner env requirements; wait for green CI and a domain-owner review.

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit Blob, Redis, AI gateway, or scanner secrets.
- Tune `DESIGNCONTRACTS_*` (legacy `CONTEXTDS_*`) / `DISABLE_COMPUTED_CSS` cautiously before scanning production domains.
- Audit new API endpoints for robots/ToS compliance before deploy.
