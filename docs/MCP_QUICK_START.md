# Design Contracts MCP Server - Quick Start Guide

Get started with the Design Contracts Model Context Protocol server in 5 minutes.

---

## ⚡ 5-Minute Setup

### 1️⃣ Generate an API Key (30 seconds)

```bash
cd /Users/byronwade/designer
bun run scripts/create-api-key.ts --name="Claude Desktop" --tier="pro"
```

**Output:**
```
✅ API Key Created Successfully!

📝 Name:        Claude Desktop
🎫 Tier:        pro
🔑 API Key:     a1b2c3d4e5f6... (save this!)
📅 Expires:     2026-09-29
```

**💾 Save the API key!** You won't be able to see it again.

---

### 2️⃣ Configure Claude Desktop (2 minutes)

**Open config file:**
```bash
# macOS
open ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Linux
nano ~/.config/Claude/claude_desktop_config.json

# Windows
notepad %APPDATA%\Claude\claude_desktop_config.json
```

**Add this configuration:**
```json
{
  "mcpServers": {
    "designcontracts": {
      "command": "node",
      "args": [
        "/Users/byronwade/designer/mcp-server-wrapper.js"
      ],
      "env": {
        "DESIGNCONTRACTS_API_KEY": "paste-your-api-key-here",
        "DESIGNCONTRACTS_API_URL": "http://localhost:3000/api/mcp"
      }
    }
  }
}
```

---

### 3️⃣ Start Design Contracts Server (30 seconds)

```bash
cd /Users/byronwade/designer
bun run dev
```

Wait for:
```
✓ Ready in 1218ms
- Local: http://localhost:3000
```

---

### 4️⃣ Restart Claude Desktop (1 minute)

Completely quit and restart Claude Desktop to load the MCP server.

**Verify it's working:**
- Open Claude Desktop
- Look for "designcontracts" in available tools
- You should see: scan_tokens, get_tokens, layout_profile, etc.

---

### 5️⃣ Test It! (1 minute)

In Claude Desktop, try:

```
Use the designcontracts MCP server to scan https://stripe.com and show me their color palette
```

Claude will:
1. Call `scan_tokens({ url: "https://stripe.com" })`
2. Extract design tokens (takes ~60 seconds)
3. Display color palette with hex values
4. Show brand analysis and usage statistics

---

## 🎯 Common Use Cases

### Extract Design Tokens
```
Scan https://tailwindcss.com and create a Tailwind config with their exact colors
```

### Compare Design Systems
```
Compare the design tokens from https://stripe.com and https://linear.app
What are the key differences in their color systems?
```

### Generate Components
```
Scan https://vercel.com and create a React button component
using their exact design tokens
```

### Audit Implementation
```
Scan https://mydomain.com and check if my color palette
matches Stripe's design system
```

---

## 🔍 Verify Setup

### Check 1: API Key Works

```bash
curl -X POST http://localhost:3000/api/mcp/get-tokens \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://stripe.com"}'
```

**Expected:** JSON response with tokens (or "No site found" if not scanned yet)
**Error:** 401 = Invalid API key, 429 = Rate limited

### Check 2: MCP Server Responds

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp-server-wrapper.js
```

**Expected:** JSON-RPC response with tool list
**Error:** Check DESIGNCONTRACTS_API_KEY is set

### Check 3: Claude Desktop Logs

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-designcontracts.log

# Linux
tail -f ~/.config/Claude/logs/mcp-server-designcontracts.log
```

**Expected:** "Design Contracts MCP Server ready and listening on stdin..."

---

## ⚠️ Troubleshooting

### "Invalid or missing API key"

**Fix:**
```bash
# Verify API key is set
echo $DESIGNCONTRACTS_API_KEY

# If empty, export it:
export DESIGNCONTRACTS_API_KEY="your-64-char-key"

# Or add to Claude Desktop config env
```

### "Connection refused"

**Fix:**
```bash
# Make sure Design Contracts is running
bun run dev

# Check it's accessible
curl http://localhost:3000/api/health
```

### "Tools not appearing in Claude Desktop"

**Fix:**
1. Check config file path is correct
2. Verify JSON is valid (use JSONLint)
3. Check wrapper script path is absolute
4. Restart Claude Desktop COMPLETELY (Cmd+Q, then reopen)
5. Check logs: `~/Library/Logs/Claude/`

### "Rate limit exceeded"

**Fix:**
```bash
# Free tier: 5 scans/minute
# Pro tier: 20 scans/minute

# Upgrade your API key tier:
bun run scripts/upgrade-api-key.ts --key-id="your-key-id" --tier="pro"

# Or wait 1 minute for rate limit to reset
```

---

## 🎓 Next Steps

1. **Read full documentation:** `/docs/MCP_SETUP.md`
2. **Try example workflows:** `/docs/MCP_EXAMPLES.md`
3. **API reference:** `/docs/API_REFERENCE.md`
4. **Join community:** https://designcontracts.sh

---

## 💡 Pro Tips

### Tip 1: Cache Results
```
First scan takes ~60s. Subsequent get_tokens calls are instant (<200ms).
```

### Tip 2: Batch Scanning
```
Scan multiple sites at once for comparison:
- scan_tokens("https://stripe.com")
- scan_tokens("https://linear.app")
- scan_tokens("https://vercel.com")
```

### Tip 3: Use Compose Pack
```
After scanning, use compose_pack to get Tailwind config mappings
and implementation best practices
```

### Tip 4: Layout DNA
```
Use layout_profile to understand responsive patterns and spacing scales
Great for matching implementation to design
```

---

**Setup Time:** ~5 minutes
**First Scan:** ~60 seconds
**Cached Lookups:** <200ms
**Support:** support@designcontracts.sh

**Ready to build? Scan your first site!** 🚀