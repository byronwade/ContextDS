# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains App Router routes: `(marketing)` covers public pages, `(dashboard)` powers authenticated tools, and `api/` serves handlers.
- `components/` implements atomic layers; keep primitives in `components/ui/` and compose the rest through molecules, organisms, and templates.
- `lib/` houses services (`lib/db/`, `lib/ai/`, `lib/mcp/`, `lib/utils.ts`); client state lives in `hooks/` and `stores/`, while `workers/` tracks crawl jobs.
- Update `drizzle.config.ts`, `tailwind.config.ts`, and `eslint.config.mjs` whenever dependencies or tokens change.

## Build, Test, and Development Commands
- `pnpm install` syncs dependencies after cloning or pulling.
- `pnpm dev` serves Turbopack at `http://localhost:3000`; `pnpm build` + `pnpm start` verify the production bundle.
- `pnpm lint` runs the Next.js ESLint config; fix issues locally with `pnpm lint --fix`.
- `pnpm dlx drizzle-kit generate` then `pnpm dlx drizzle-kit migrate` align Supabase with `lib/db/schema.ts`.
- `pnpm dlx playwright test` executes end-to-end suites; scope runs with `--project` or `--grep` when iterating.

## Coding Style & Naming Conventions
- Keep TypeScript strict; avoid `any` and add explicit return types on shared helpers.
- Use PascalCase for components, camelCase for utilities, and prefix hooks with `use`; colocate files with the feature they support.
- Favor Tailwind utilities and extend tokens via `tailwind.config.ts` rather than hard-coded colors or spacing.
- Format with the repo’s Prettier + ESLint integration and add `"use client"` only when interactivity is required.

## Testing Guidelines
- Place unit specs as `*.spec.ts` beside the source or inside a local `__tests__` folder.
- Verify Drizzle changes against a Supabase test database before promoting migrations.
- Maintain Playwright coverage for scan submission, directory browsing, and MCP handshake flows.
- Run `pnpm lint` and `pnpm dlx playwright test` before opening a PR; note flakes in the description.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(scanner): describe change`) to keep history and releases machine-friendly.
- Keep branches focused, rebase on `main`, and avoid merge commits in review.
- PRs need a concise summary, linked issues, and before/after evidence when UI or JSON contracts change.
- Attach migration diffs and flag RLS or Supabase configuration impacts; wait for green CI and a domain-owner review.

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit Supabase or Vercel gateway keys.
- Tune `CONTEXTDS_*` environment flags cautiously and tighten allowlists before scanning production domains.
- Review `lib/db/migrations/` and `lib/db/rls-policies.sql`, and audit new API endpoints for robots/ToS compliance before deploy.
