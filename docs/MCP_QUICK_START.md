# Design Contracts MCP — Quick Start

## 1. Prefer HTTP transport

```bash
claude mcp add --transport http designcontracts https://designcontracts.sh/api/mcp
```

For write tools, generate a Pro key at [designcontracts.sh/mcp](https://designcontracts.sh/mcp) after checkout, then add:

```json
{
  "mcpServers": {
    "designcontracts": {
      "type": "http",
      "url": "https://designcontracts.sh/api/mcp",
      "headers": { "Authorization": "Bearer dc_live_<paste-pro-key>" }
    }
  }
}
```

## 2. Verify tools

```bash
curl -s https://designcontracts.sh/api/mcp | jq '.tools'
```

Expect live names such as:

- `scan_site`
- `get_tokens`
- `get_design_md`
- `get_contract_download`
- `contract_from_screenshot`
- `compose_design_artifacts`

**Not** `scan_tokens`, `layout_profile`, or `compose_pack`.

## 3. Ask your agent

```text
Scan stripe.com with designcontracts, then give me the DESIGN.md and pack download URL.
```

The agent should call `scan_site` → `get_design_md` → `get_contract_download`.

## Rate limits

| Tier | Limit |
|------|-------|
| Anonymous reads | 60/min |
| Pro key | 120/min |
| Write tools | 20/min |

Full reference: [MCP_SETUP.md](./MCP_SETUP.md).
