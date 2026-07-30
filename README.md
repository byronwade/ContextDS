# ContextDS — AI-Readable Design System Token Extractor
_Scan any public site → extract design tokens → store them on free serverless infra (Vercel Blob + Upstash Redis). No paid database required._

---

## Table of Contents
- [What is ContextDS?](#what-is-contextds)
- [Core Features](#core-features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Storage (no paid database)](#storage-no-paid-database)
- [Running the App](#running-the-app)
- [Directory & Submissions](#directory--submissions)
- [Scanning & Tokenization (Wallace parity)](#scanning--tokenization-wallace-parity)
- [Layout DNA (multi-page)](#layout-dna-multi-page)
- [AI Prompt Pack (via Vercel AI Gateway)](#ai-prompt-pack-via-vercel-ai-gateway)
- [Company Research (Docs + GitHub)](#company-research-docs--github)
- [MCP Tools (for Claude Code / agents)](#mcp-tools-for-claude-code--agents)
- [HTTP API](#http-api)
- [Quotas & Pricing](#quotas--pricing)
- [Performance & Caching](#performance--caching)
- [Security, Compliance, and Licensing](#security-compliance-and-licensing)
- [Development Standards](#development-standards)
- [Testing & QA](#testing--qa)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [FAQ](#faq)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## What is ContextDS?
ContextDS turns **any public website** into an **AI-readable design system**. We:
1) **Scan** the site (respecting robots/ToS),  
2) **Extract** normalized W3C-style **Design Tokens** (Color, Typography, Spacing, Radii, Shadows, Motion),  
3) **Analyze Layout DNA** across multiple pages and breakpoints (grids, containers, spacing scales, motion patterns),  
4) **Organize** it all into a strict **AI Prompt Pack** so agents (Claude Code, etc.) can _obey_ the system instead of guessing,  
5) **Publish** a browsable **Directory** and expose everything via **MCP tools** and **HTTP API**.

Think **Project Wallace** design-tokens analyzer—plus the new agent layer: every scan also emits a Google Stitch–compatible **DESIGN.md** and a Cursor/Claude **design skill** (`SKILL.md`) so coding agents can rebuild UI that matches the site. Persist as JSON on **Vercel Blob**, with an **Upstash Redis** index for recent/popular sites.

---

## Core Features
- **Wallace-parity design tokens**: Colors, Typography (family/size/line-height), Gradients, Shadows, Radii, Motion (duration/easing), plus Spacing scale inference.  
- **Multi-page Layout DNA**: Container widths, grid/flex ratios, column counts, spacing base (4/8-px), radii/shadow taxonomies, motion norms, archetype detection (hero, grids, pricing, docs/blog).  
- **AI Prompt Pack**: Provider-agnostic JSON guidance (instructions, mapping hints, pitfalls), generated via **Vercel AI Gateway**.  
- **Directory & Community**: Free serverless gallery (Blob + Redis) of scanned sites.  
- **Remix Studio**: Blend 2–5 token sets under constraints (AAA contrast, preserve hue, typography scale), with AI reconciliation.  
- **MCP Tools + HTTP API**: “Just plug an agent in.”  
- **$9.95/month** flat plan with generous quotas.

---

## Architecture Overview
```
┌─────────────┐     submit URL     ┌────────────────────┐
│  Browser UI │ ─────────────────→ │ Next.js API Routes │
│ (shadcn UI) │                    │  (scan/generate)   │
└─────┬───────┘                    └─────────┬──────────┘
      │                                     │
      │ Zustand (client state)              │ Jobs (scan/crawl/render)
      │                                     ▼
      │                            ┌────────────────────┐
      │                            │  Worker / Headless │
      │                            │  Browser (compute) │
      │                            └─────────┬──────────┘
      │                                      │
      │                                      ▼
      │                            ┌────────────────────┐
      │                            │  Analyzers (MIT)   │
      │                            │  + Tokenization    │
      │                            └─────────┬──────────┘
      │                                      │
      │                                      ▼
      │                            ┌────────────────────┐
      │                            │    Supabase (DB)    │
      │                            └─────────┬──────────┘
      │                                      │
      │ MCP tools / HTTP API                 │
      ▼                                      ▼
┌─────────────┐     pack/guidance   ┌────────────────────┐
│   MCP/Agent │ ─────────────────→  │ Vercel AI Gateway  │
│ (Claude etc)│                     │  (LLM providers)   │
└─────────────┘                     └────────────────────┘
```

---

## Tech Stack
- **Next.js 16 (App Router)** + **React 19** + **TypeScript**
- **Tailwind** + **shadcn-style** UI
- **Zustand** for scan UI state
- **Vercel Blob** — durable scan JSON (free Hobby tier)
- **Upstash Redis** — directory index + rate limits (free tier)
- **In-memory fallback** when Blob/Redis unset (local/dev)
- **Headless Chromium** (optional computed CSS; off by default on Hobby)
- **Project Wallace-style analyzers** (MIT)
- **Vercel AI Gateway** (optional prompt packs)
- **MCP server** (Claude Code-ready tools)

---

## Quick Start
Prereqs:
- Node 22+
- Bun (recommended)
- Free Vercel Blob + Upstash Redis for durable storage (optional locally)

```bash
# 1) Install deps
bun install

# 2) Prepare environment
cp .env.example .env.local
# Add BLOB_READ_WRITE_TOKEN + UPSTASH_REDIS_REST_* for durable storage
# Without them, scans work in-memory for the current process

# 3) Dev server — no database migrate step
bun dev
# open http://localhost:3000/scan
```

---

## Environment Variables
Create `.env.local` (see `.env.example`):

```ini
# Durable serverless storage (free tiers)
BLOB_READ_WRITE_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Optional: skip Playwright (recommended on Hobby)
DISABLE_COMPUTED_CSS=1

# Optional AI enrichment
AI_GATEWAY_API_KEY=

# DEPRECATED — not required for scanning
# DATABASE_URL=
```

---

## Storage (no paid database)

Default path uses **JSON documents**, not SQL:

| Layer | Role | Free tier |
|-------|------|-----------|
| **Vercel Blob** | Full scan payloads (`scans/{domain}/latest.json`) | Hobby |
| **Upstash Redis** | Site index, recent/popular, rate limits | Free |
| **Memory** | Local/dev when neither is configured | — |

Legacy Drizzle/Postgres under `lib/db/` remains in the repo for optional experimental routes but is **not** used by `/api/scan`, directory, stats, search, or core MCP tools.

---

## Running the App
- **Dev**: `bun dev` → http://localhost:3000  
- Open **Scanner** (`/scan`). Paste a URL (e.g., `https://vercel.com`).  
- On success you’ll see:
  - Token groups (Color, Typography, Spacing, Radii, Shadows, Motion)
  - **Layout DNA** summary
  - **Provenance** (CSS sources if enabled)
  - **AI Prompt Pack** (downloadable JSON)
  - “Use in Claude Code” copy button (MCP link)

---

## Directory & Submissions
- **Directory** lists scanned sites with badges (has Motion/Layout), token counts, last updated.
- **Detail** page shows tokens per group, layout cards, motion summary, version history, and provenance.
- **Submit** any public URL; we respect robots.txt and terms. Popular sites auto-refresh.

---

## Scanning & Tokenization (Wallace parity)
- **Extraction**: Headless Chromium gathers `<link rel="stylesheet">`, `<style>`, and **computed styles** (for CSS-in-JS).  
- **Analysis**: Wallace-style analyzer (MIT) enumerates values (colors, sizes, shadows, transitions, keyframes).  
- **Tokenization**: We build W3C tokens to mirror Wallace’s **Design Tokens** categories:
  - **Color**: normalized to hex; frequency & contrast checks recorded
  - **Typography**: families, font sizes, line-heights (by common selectors)
  - **Spacing**: cluster margins/paddings/gaps to infer a base step (4/8 px typical)
  - **Radii**: cluster corners into `sm/md/lg/full`
  - **Shadows**: offset/blur/spread/alpha clustered into elevation levels
  - **Motion**: transitions & keyframes → duration/easing taxonomy
  - **Gradients**: linear/radial specs grouped by stops
- **Prettify**: Optional formatting pass for human readability (does not change semantics).
- **Confidence**: Each token gets a score derived from frequency, page coverage, and community votes.

> **Why parity matters:** Your results should broadly match Project Wallace’s design-token output on the same site (±5–10% variance is acceptable due to crawl breadth and SPA behavior).

---

## Layout DNA (multi-page)
- Crawl representative pages (home, product, pricing, docs/blog) at **3 breakpoints** (e.g., 360/768/1280).
- Compute:
  - **Containers & breakpoints** (max widths, padding, media queries observed)
  - **Grid/Flex mix** (ratios, column counts, gaps)
  - **Spacing base** (4/8-px step inference + outliers)
  - **Radii & Shadows** taxonomy across components
  - **Motion norms** per intent (hover, focus, modal, route)
  - **Archetypes**: marketing hero, feature grid, pricing table, doc page, blog index, footer types
  - **Accessibility**: contrast evaluation for common text/background pairs

---

## AI Prompt Pack (via Vercel AI Gateway)
- We combine **tokens** + **layout profile** + (optional) **company artifacts** into a strict, self-describing JSON pack:
  - `instructions` (markdown) — what the agent should do
  - `mapping_hints` — Tailwind/theming hints (no code, just guidance)
  - `pitfalls` — “don’t invent new colors” / “keep radii consistent”
  - `performance_notes` — e.g., “prefer 3 elevation levels on mobile”
  - `tokens`, `layout_profile`, and `provenance`
- **Gateway** gives provider-agnostic model access & observability. If Gateway is unavailable, we return a deterministic fallback pack so nothing blocks.

---

## Company Research (Docs + GitHub)
- We auto-search for **design-system docs** (`/design-system`, `/tokens`, `/brand`, `/theme`, `storybook`), possible **Figma** links, and GitHub org repos.  
- Likely packages are flagged via repo topics/keywords (`tokens`, `theme`, `design-system`, `style-dictionary`, `tailwind`, `storybook`).
- Artifacts enrich token naming and improve AI guidance; provenance is always recorded.

---

## MCP Tools (for Claude Code / agents)
All responses are **JSON content**; HTTP mirrors are available.

### 1) `scan_tokens`
**Input**
```json
{ "url": "https://example.com", "depth": 1, "pages": [], "viewports": [360,768,1280], "prettify": true }
```
**Output (example)**
```json
{
  "status": "fresh",
  "site": { "domain": "example.com" },
  "token_set": { "tokens": { "color": { "color_FFFFFF": { "type":"color","value":"#FFFFFF" } } } },
  "provenance": { "css_sources": ["https://example.com/styles.css"] },
  "last_scanned": "2025-09-28T19:20:00Z"
}
```

### 2) `get_tokens`
**Input**
```json
{ "url": "https://example.com", "version": "latest" }
```
**Output**
```json
{ "token_set": { /* W3C tokens */ }, "pack": { /* AI Prompt Pack */ }, "consensus": 0.91, "last_scanned": "..." }
```

### 3) `layout_profile`
**Input**
```json
{ "url": "https://example.com", "pages": ["/pricing","/docs"], "viewports": [360,768,1280] }
```
**Output**
```json
{ "archetypes": [...], "containers": {...}, "grid_flex": {...}, "spacing_scale": {...}, "radii_taxonomy": {...}, "shadows_taxonomy": {...}, "motion": {...}, "accessibility": {...} }
```

### 4) `research_company_artifacts`
**Input**
```json
{ "url": "https://example.com", "github_org": "example" }
```
**Output**
```json
{ "docs": ["https://example.com/design-system"], "storybook": null, "figma": null, "github": { "org":"example", "repos":[{"name":"tokens","topics":["design-system","tokens"]}] } }
```

### 5) `compose_pack`
**Input**
```json
{ "token_set": {/* W3C tokens */}, "layout_profile": {/* JSON */}, "artifacts": {/* optional */}, "intent": "component-authoring" }
```
**Output**
```json
{ "prompt_pack": {/* JSON */}, "mapping_hints": ["..."], "pitfalls": ["..."], "confidence": 0.88 }
```

### 6) `vote_token`
**Input**
```json
{ "token_set_id":"ts_123", "token_key":"color_PRIMARY", "vote_type":"alias", "note":"This is actually brand.primary" }
```
**Output**
```json
{ "ok": true, "token_confidence": 0.93 }
```

**Claude hookup**
```bash
pnpm mcp
# then
claude mcp add contextds -- npx -y tsx mcp/server.ts
```

---

## HTTP API
- `POST /api/scan` → `{ url }` → returns token_set + provenance (same schema as MCP)
- `POST /api/generate` → `{ tokens, intent }` → returns AI Prompt Pack + guidance
- `GET  /api/mcp/tokens?url=...` → HTTP mirror of `get_tokens`

> All endpoints return `application/json`. Authentication (API key) required for scans/remixes on paid plans.

---

## Quotas & Pricing
- **Pro**: $9.95/month  
  - 100 scans / month  
  - 10 remixes / month  
  - 5 private packs  
  - Priority queue  
- **Free**: browse Directory, preview limited tokens, 3 scans / month, no remix export.

---

## Performance & Caching
- **Hash-based caching**: If CSS hasn’t changed (ETag/sha), we return cached tokens instantly.
- **Pre-warm popular sites**; auto-refresh on schedule.  
- **SLOs**: TTFB ≤ 200ms cached, route transitions ≤ 300ms, hydrated JS budget ≤ 170KB.  
- **RSC/ISR** for Directory pages, client components only where interaction is needed.

---

## Security, Compliance, and Licensing
- **Robots/ToS**: We respect `robots.txt` and site terms; disallowed domains are blocked. Owners can **opt-out**; we tombstone entries to avoid re-ingest.  
- **Supabase RLS**: private packs/remixes are owner-only; public token sets are world-readable.  
- **Keys**: `SUPABASE_SERVICE_ROLE_KEY` is server-only.  
- **Licenses**:
  - We implement Wallace-style behavior using **MIT-licensed** extraction/analyzer techniques.
  - We avoid linking EUPL-1.2 code in distributed artifacts; where applicable, we may isolate it as a non-distributed service after legal review.
- **PII**: We store site-public data + minimal account data; no scraping of gated content.

---

## Development Standards
- **TypeScript strict** on; no `any` unless properly justified.  
- **Accessible UI**: focus states, color contrast checks, keyboard navigation.  
- **Linting & formatting**: ESLint + Prettier.  
- **Testing**: unit (tokenization & layout math), integration (scan flow), snapshot (UI).  
- **Commits**: Conventional Commits style.  
- **Perf budgets**: enforced in CI.

---

## Testing & QA
**Parity QA (Wallace)**
- Given a test suite of sites, design-token categories and counts align within ±5–10% (prettify matched).

**Layout DNA QA**
- At least 5 page archetypes across 3 breakpoints; container widths and spacing base remain consistent; contrast checks pass where expected.

**AI Pack QA**
- Deterministic output for identical inputs; mapping hints/pitfalls schema-validated; graceful fallback when Gateway is unavailable.

**Compliance QA**
- Robots-denied domains emit a clear 4xx, no data stored; opt-out respected and logged.

---

## Roadmap
- **Computed-style depth controls** (JS-heavy SPA resilience, timeouts per page).  
- **Design-system diff** (token rename/merge/deprecate guidance).  
- **Framework adapters** (richer hints: Tailwind/Chakra/Mantine/Material).  
- **A11y badges** per token_set; automatic contrast fix suggestions.  
- **Team spaces**: shared remixes, approvals, audit trails.

---

## Contributing
1. Fork & branch (`feat/what-youre-adding`).
2. Add tests where it makes sense.  
3. Keep output schemas stable; if you change them, bump the minor version and update this README.  
4. PR with a clear description and screenshots/json examples.

We like tasteful humor; we do not like breaking changes. Your PR may contain both.

---

## FAQ
**Does this clone Project Wallace?**  
We aim for **behavioral parity** in design-token categories and extraction quality while implementing our own tokenization on top of MIT analyzers (or isolating copyleft code behind non-distributed boundaries). We extend beyond Wallace with **Layout DNA**, **AI Prompt Packs**, **MCP tools**, a **Directory**, and **Remix** features.

**Can I use this in production?**  
Yes—but respect robots/ToS and your local laws. Also consider rate-limits/politeness for crawls.

**Will it handle CSS-in-JS?**  
Yes—via headless browser “computed styles” passes.

**What about component libraries?**  
We detect signatures in CSS and enrich with company research (docs/GitHub) when available.

---

## Acknowledgements
- The **Project Wallace** team for pioneering accessible CSS analysis and token insights.  
- **Supabase** for a delightful Postgres + Auth developer experience.  
- **Vercel AI Gateway** for provider-agnostic AI orchestration.  
- The internet, for being both stylish and wonderfully messy.

---

## License
- App code: MIT (unless noted otherwise in submodules).  
- Ensure compliance if you bring in any EUPL-licensed token libraries—prefer our own tokenization layer or isolate such code behind a service boundary.

> _“Make it beautiful. Make it fast. Make the AI behave.” — also us, also today_
