# designcontracts.sh

_Scan any public site → download an installable Design Contract → agents uphold that design forever._

Better than a prompt pack. Stronger than a token dump. Compatible with the open-source [Design Contract engine](https://github.com/byronwade/Design).

---

## What this is

**designcontracts.sh** (Design Contracts) turns a live website into a project pack your AI coding tools can enforce:

```text
public URL
  → static CSS (+ Docker Playwright in accurate mode)
  → W3C tokens + Project Wallace merge
  → layout DNA
  → semantic design graph (token↔role↔component↔layout)
  → DESIGN.md + design/graph.json + AGENTS.md + Skill + references
  → ZIP you drop into a repo
  → npx github:byronwade/Design init / resolve / check / verify
```

---

## Quick start

```bash
bun install
bun dev
# open http://localhost:3000/scan
```

### Accurate browser scans (Docker)

Fast mode runs entirely in the Next.js function (static CSS + Wallace).  
Accurate mode uses a Playwright microservice when configured:

```bash
bun run scanner:up
# in .env.local
SCANNER_SERVICE_URL=http://localhost:4040
bun dev
```

On Vercel: deploy `scanner/` to Fly.io / Railway / ECS, then set `SCANNER_SERVICE_URL` to that HTTPS URL. The Next.js app stays on Vercel; only the heavy browser work runs in Docker.

---

## Contract pack contents

| Path | Role |
|------|------|
| `DESIGN.md` | Authored grammar + YAML tokens |
| `design/graph.json` | Canonical semantic graph (nodes + edges) |
| `design/GRAPH.md` | AI-readable narrative of the graph |
| `AGENTS.md` | Agent router (managed block) |
| `.agents/skills/design/SKILL.md` | Universal design Skill |
| `design/references/manifest.json` | Structured visual reference index |
| `.design/config.json` | Profile targets for the Design engine |
| `INSTALL.md` | Human install steps |
| `contract.json` | Scan provenance |

Download API: `GET /api/contracts/download?domain=stripe.com`

---

## Storage (no paid database)

| Layer | Role |
|-------|------|
| Vercel Blob | Scan + contract JSON |
| Upstash Redis | Directory index + rate limits |
| Memory | Local/dev fallback |

```ini
BLOB_READ_WRITE_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SCANNER_SERVICE_URL=http://localhost:4040
DISABLE_COMPUTED_CSS=1
```

---

## Tooling

| Tool | Role |
|------|------|
| **Biome** | Fast format + lint |
| **ESLint** (`eslint-config-next`) | Next.js Core Web Vitals rules |
| **Knip** | Unused deps / exports / files |
| **Vitest** | Unit tests (scanner, contracts) |
| **Playwright** | E2E / a11y / stress |
| **Bundle Analyzer** | `bun run analyze` |

```bash
bun run check          # typecheck + lint + unit + knip
bun run test:unit
bun run test:unit:coverage
bun run knip
bun run analyze        # @next/bundle-analyzer
```

## Scripts

```bash
bun dev
bun run build          # Turbopack production build
bun lint
bun run test
bun run scanner:up
bun run scanner:logs
bun run scanner:down
```

## Performance (Next 16 canary-grade)

Already enabled in `next.config.ts`:

- React Compiler
- Turbopack (dev + build) + filesystem cache for dev
- `inlineCss` for critical CSS
- Expanded `optimizePackageImports`
- `serverExternalPackages` for Playwright / Wallace / Chromium
- Stable `generateBuildId` (git SHA) for CDN reuse
- Image AVIF/WebP + long cache TTL
- Router `staleTimes` for snappy soft navigations
- Typed routes
- Vercel Analytics + Speed Insights

`cacheComponents` is intentionally deferred until API routes migrate to `connection()` / `"use cache"`.

---

## License

MIT — see repository license. Design Contract engine: [byronwade/Design](https://github.com/byronwade/Design).
