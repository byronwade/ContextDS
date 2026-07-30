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
  → DESIGN.md grammar + AGENTS.md + Skill + references
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

## Scripts

```bash
bun dev
bun run build
bun lint
bun run test
bun run scanner:up
bun run scanner:logs
bun run scanner:down
```

---

## License

MIT — see repository license. Design Contract engine: [byronwade/Design](https://github.com/byronwade/Design).
