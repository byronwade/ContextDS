# CLAUDE.md

Guidance for agents working in this repository.

## Product

**Design Contracts** (rebrand of ContextDS) scans public websites and produces **installable Design Contract packs** compatible with [`byronwade/Design`](https://github.com/byronwade/Design).

Mental model:

```text
Scan site → DESIGN.md grammar + skills + references → ZIP
→ npx github:byronwade/Design init / resolve / check / verify
→ agents uphold the design over time
```

This repo is the **scanner + library + serverless API**. The **enforcement engine** (resolve/check/verify, profiles, quality rules) lives in the Design package.

## Commands

- `bun dev` — Turbopack dev server
- `bun run build` — production build
- `bun lint` — ESLint
- `bun run test` — Playwright (`bun run test`, not `bun test`)

## Architecture

- `lib/workers/simple-scan.ts` — default scan pipeline (no Postgres)
- `lib/contracts/design-contract-package.ts` — ZIP pack builder
- `lib/analyzers/design-md-generator.ts` — Design Contract DESIGN.md
- `lib/storage/serverless-store.ts` — Vercel Blob + Upstash Redis
- `app/api/scan` — scan endpoint
- `app/api/contracts/download` — contract ZIP download
- `app/(marketing)/scan` — primary product UI

Legacy `lib/db` / `scan-orchestrator` are unused by the default path.

## Env

```ini
BLOB_READ_WRITE_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
DISABLE_COMPUTED_CSS=1
```
