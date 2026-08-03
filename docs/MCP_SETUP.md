# Design Contracts MCP Setup

The live MCP server is the Streamable HTTP endpoint:

```text
https://designcontracts.sh/api/mcp
```

Tool names are **derived from the same `designContractTools` the Scan agent uses** (`lib/agent/tools.ts` → `lib/mcp/protocol.ts`). Adding a tool for chat adds it for MCP.

---

## Live tools (current)

| Tool | Access | Purpose |
|------|--------|---------|
| `scan_site` | Pro MCP key | Scan a public URL into a Design Contract |
| `get_tokens` | Public (rate-limited) | Curated tokens for a scanned domain |
| `get_design_md` | Public | DESIGN.md grammar for a domain |
| `get_contract_download` | Public | Installable pack download URL |
| `resolve_graph` | Public | Semantic token↔component graph |
| `compare_systems` | Public | Diff two scanned systems |
| `find_similar_systems` | Public | Library similarity search |
| `check_contrast` | Public | WCAG contrast check |
| `generate_theme_css` | Public | Theme CSS from a scanned system |
| `critique_design` | Public | Critique against a contract |
| `contract_from_screenshot` | Pro + credits | Multi-image App Pack (≥5 screenshots) |
| `refine_design_md` | Pro | AI refine of DESIGN.md |
| `compose_design_artifacts` | Pro | Compose pack artifacts |
| `blend_systems` | Pro | Blend multiple scanned systems → pack |
| `generate_from_brief` | Pro | NL brief → Design Contract |
| `import_design_tokens` | Pro | Import DTCG / DESIGN.md / CSS / Tailwind |
| `restyle_page` | Pro | Restyle guidance |
| `open_canvas` / `update_canvas` | Pro | Studio canvas tools |

### Retired names (do not use)

These never ship on the live server:

- `scan_tokens` → use `scan_site`
- `layout_profile` → use `scan_site` + `get_tokens` / `resolve_graph`
- `compose_pack` → use `get_contract_download` / `compose_design_artifacts`

---

## Auth + rate limits

| Tier | Limit |
|------|-------|
| Anonymous reads | 60 req/min |
| Pro key (`dc_live_…`) or `MCP_API_KEY` | 120 req/min |
| Write tools | 20 req/min |

- Public read tools work without a key when `MCP_API_KEY` is unset.
- Write tools require Pro: `Authorization: Bearer dc_live_…` (generate at `/mcp` after checkout).
- Ops can set shared `MCP_API_KEY` to require a Bearer for all traffic.

---

## Claude / Cursor (HTTP — preferred)

```bash
claude mcp add --transport http designcontracts https://designcontracts.sh/api/mcp
```

Config JSON:

```json
{
  "mcpServers": {
    "designcontracts": {
      "type": "http",
      "url": "https://designcontracts.sh/api/mcp",
      "headers": {
        "Authorization": "Bearer dc_live_<paste-pro-key>"
      }
    }
  }
}
```

---

## Stdio bridge (legacy hosts)

`mcp-server-wrapper.js` proxies JSON-RPC to `/api/mcp` — it does **not** invent its own tool list.

```json
{
  "mcpServers": {
    "designcontracts": {
      "command": "node",
      "args": ["/path/to/mcp-server-wrapper.js"],
      "env": {
        "DESIGNCONTRACTS_API_URL": "https://designcontracts.sh/api/mcp",
        "DESIGNCONTRACTS_API_KEY": "dc_live_<paste-pro-key>"
      }
    }
  }
}
```

---

## Quick agent workflow

1. `scan_site({ url: "https://stripe.com" })` (Pro key)
2. `get_tokens({ domain: "stripe.com" })`
3. `get_design_md({ domain: "stripe.com" })`
4. `get_contract_download({ domain: "stripe.com" })` → install with `npx github:byronwade/Design init --profile … --app-type …`

For App Packs from product UI screenshots (≥5 images): `contract_from_screenshot` (credits).

---

## Verify

```bash
curl -s https://designcontracts.sh/api/mcp | jq '.tools'
curl -s -X POST https://designcontracts.sh/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'
```

You should see `scan_site`, `get_tokens`, `get_design_md`, `get_contract_download` — never `scan_tokens` / `layout_profile` / `compose_pack`.
