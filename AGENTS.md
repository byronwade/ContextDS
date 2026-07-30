# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains App Router routes: `(marketing)` covers public pages, `(dashboard)` powers authenticated tools, and `api/` serves handlers.
- `components/` implements atomic layers; keep primitives in `components/ui/` and compose the rest through molecules, organisms, and templates.
- `lib/storage/` is the default persistence layer (Vercel Blob + Upstash Redis). Prefer it over `lib/db/`.
- `lib/workers/simple-scan.ts` is the default scan pipeline; `scan-orchestrator.ts` is legacy Postgres.
- `lib/` also houses `lib/ai/`, `lib/mcp/`, `lib/utils.ts`; client state lives in `hooks/` and `stores/`.
- Update `tailwind.config.ts` and `eslint.config.mjs` whenever dependencies or tokens change.

## Build, Test, and Development Commands
- `bun install` syncs dependencies after cloning or pulling.
- `bun dev` serves Turbopack at `http://localhost:3000`; `bun run build` + `bun start` verify the production bundle.
- `bun lint` runs the Next.js ESLint config; fix issues locally with `bun lint --fix` when supported.
- No database migrate step for the default path — set `BLOB_READ_WRITE_TOKEN` + Upstash Redis env vars for durable storage.
- `bun run test` executes Playwright end-to-end suites; scope runs with `--project` or `--grep` when iterating.

## Coding Style & Naming Conventions
- Keep TypeScript strict; avoid `any` and add explicit return types on shared helpers.
- Use PascalCase for components, camelCase for utilities, and prefix hooks with `use`; colocate files with the feature they support.
- Favor Tailwind utilities and extend tokens via `tailwind.config.ts` rather than hard-coded colors or spacing.
- Format with the repo’s Prettier + ESLint integration and add `"use client"` only when interactivity is required.

## Testing Guidelines
- Place unit specs as `*.spec.ts` beside the source or inside a local `__tests__` folder.
- Maintain Playwright coverage for scan submission, directory browsing, and MCP handshake flows.
- Run `bun lint` and `bun run test` before opening a PR; note flakes in the description.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(scanner): describe change`) to keep history and releases machine-friendly.
- Keep branches focused, rebase on `main`, and avoid merge commits in review.
- PRs need a concise summary, linked issues, and before/after evidence when UI or JSON contracts change.
- Flag Blob/Redis env requirements; wait for green CI and a domain-owner review.

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit Blob, Redis, or AI gateway keys.
- Tune `CONTEXTDS_*` / `DISABLE_COMPUTED_CSS` cautiously before scanning production domains.
- Audit new API endpoints for robots/ToS compliance before deploy.
