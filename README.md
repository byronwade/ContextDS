# Design Contracts

_Scan any public site → download an installable Design Contract → agents uphold that design forever._

Better than a prompt pack. Stronger than a token dump. Compatible with the open-source [Design Contract engine](https://github.com/byronwade/Design).

---

## What this is

**Design Contracts** (formerly ContextDS) turns a live website into a project pack your AI coding tools can enforce:

```text
public URL
  → W3C tokens + layout DNA
  → DESIGN.md grammar (Google + Design engine sections)
  → AGENTS.md + universal design Skill
  → design/references/ (structured visual memory)
  → ZIP you drop into a repo
  → npx github:byronwade/Design init / resolve / check / verify
```

The end goal: someone downloads a contract into their project, and **every new component stays on-brand** — not because the model remembered a vibe, but because `resolve → check → verify` refuses unreviewed drift.

This product is the **scanner + contract library**. The **enforcement engine** lives in [`byronwade/Design`](https://github.com/byronwade/Design).

Vs [TypeUI](https://www.typeui.sh/): we generate contracts from real sites (and, next, images/structured references), then hand them to an open local compiler with receipts — not only a hosted MCP catalog of skills.

---

## Quick start

```bash
bun install
cp .env.example .env.local   # optional Blob + Upstash for durable storage
bun dev
# open http://localhost:3000/scan
```

Scan a site → **Download Design Contract** → unzip into a project →:

```bash
npx --yes github:byronwade/Design init --profile web-marketing
npx --yes github:byronwade/Design resolve --request "Add a pricing section"
npx --yes github:byronwade/Design check
```

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
DISABLE_COMPUTED_CSS=1
```

---

## Scripts

```bash
bun dev
bun run build
bun lint
bun run test
```

---

## License

MIT — see repository license. Design Contract engine: [byronwade/Design](https://github.com/byronwade/Design).
