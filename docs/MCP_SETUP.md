# ContextDS Model Context Protocol (MCP) Server Setup

## Overview

ContextDS provides a **Model Context Protocol (MCP) server** that allows AI agents like Claude Code to extract and analyze design tokens from any website. This enables AI-powered design system analysis, token extraction, and automated component generation.

---

## 🎯 What You Can Do with the MCP Server

### Available Tools

1. **`scan_tokens`** - Extract design tokens from any website
   - Colors, typography, spacing, shadows, radii, motion
   - Brand analysis and consistency scoring
   - Layout DNA profiling
   - W3C design token format output

2. **`get_tokens`** - Retrieve cached tokens from previously scanned sites
   - Fast token lookup without re-scanning
   - Includes AI prompt packs for implementation
   - Version-aware token retrieval

3. **`layout_profile`** - Get layout DNA analysis
   - Container patterns and max-widths
   - Grid/Flexbox system analysis
   - Spacing scales and breakpoints
   - Layout archetypes (hero, pricing, docs)

4. **`research_artifacts`** - Discover design system documentation
   - Find Storybook instances
   - Locate design system docs
   - Discover Figma files and GitHub repos

5. **`compose_pack`** - Generate AI-readable implementation guides
   - Tailwind config mappings
   - CSS variable recommendations
   - Framework-specific hints
   - Common pitfalls and best practices

6. **`vote_token`** - Community validation of extracted tokens
   - Mark tokens as correct/incorrect
   - Suggest aliases and improvements
   - Improve consensus scoring

---

## 🚀 Quick Start (3 Steps)

### Step 1: Get Your API Key

**Option A: Via Dashboard (Recommended)**
```bash
# Coming soon: Dashboard UI for API key management
# Visit: http://localhost:3000/dashboard/api-keys
```

**Option B: Direct Database Insert (Development Only)**
```bash
# Generate a secure API key
openssl rand -hex 32

# Insert into database (replace with your key)
bun run scripts/create-api-key.ts --user-id="your-user-id" --key="your-generated-key"
```

### Step 2: Configure Claude Desktop

Add the MCP server to your Claude Desktop configuration:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "contextds": {
      "command": "node",
      "args": [
        "/path/to/designer/mcp-server-wrapper.js"
      ],
      "env": {
        "CONTEXTDS_API_KEY": "your-api-key-here",
        "CONTEXTDS_API_URL": "https://contextds.com/api/mcp"
      }
    }
  }
}
```

**For local development:**
```json
{
  "mcpServers": {
    "contextds-local": {
      "command": "node",
      "args": [
        "/Users/byronwade/designer/mcp-server-wrapper.js"
      ],
      "env": {
        "CONTEXTDS_API_KEY": "dev-key-for-testing",
        "CONTEXTDS_API_URL": "http://localhost:3000/api/mcp"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

Restart Claude Desktop to load the new MCP server configuration.

---

## 📝 Usage Examples

### Example 1: Extract Design Tokens

```typescript
// In Claude Code or Claude Desktop
scan_tokens({
  url: "https://vercel.com",
  depth: "2",
  prettify: false
})

// Response:
{
  status: "fresh",
  site: { domain: "vercel.com" },
  token_set: {
    colors: {
      "color-primary": { value: "#0070f3", type: "color" },
      "color-background": { value: "#000000", type: "color" }
    },
    typography: {
      "font-family-base": { value: "Inter, sans-serif", type: "fontFamily" }
    },
    spacing: {
      "spacing-sm": { value: "8px", type: "dimension" },
      "spacing-md": { value: "16px", type: "dimension" }
    }
  },
  brand_analysis: {
    style: "modern",
    maturity: "established",
    consistency: 0.92
  },
  ai_metadata: {
    models_used: ["gpt-4o-mini"],
    total_cost: 0.0023,
    confidence: 88,
    quality_score: 92
  }
}
```

### Example 2: Get Cached Tokens

```typescript
get_tokens({
  url: "https://stripe.com"
})

// Response:
{
  token_set: { /* W3C design tokens */ },
  pack: {
    instructions: "# Stripe Design System Implementation...",
    mapping_hints: { /* Tailwind, CSS vars */ },
    pitfalls: [ /* Common mistakes */ ]
  },
  consensus: 0.94,
  statistics: {
    totalTokens: 247,
    categories: {
      colors: 64,
      typography: 12,
      spacing: 32
    }
  }
}
```

### Example 3: Analyze Layout Patterns

```typescript
layout_profile({
  url: "https://github.com",
  pages: ["/", "/pricing", "/features"],
  viewports: [375, 768, 1440]
})

// Response:
{
  containers: {
    maxWidth: "1280px",
    pattern: "centered"
  },
  gridSystem: "flexbox-dominant",
  spacingScale: {
    base: 8,
    values: [8, 16, 24, 32, 48, 64]
  },
  archetypes: ["marketing-hero", "feature-grid", "pricing-table"]
}
```

### Example 4: Generate Implementation Pack

```typescript
compose_pack({
  token_set: { /* tokens from scan */ },
  layout_profile: { /* layout data */ },
  intent: "component-authoring"
})

// Response:
{
  prompt_pack: {
    instructions: "# Component Library Setup with Extracted Tokens...",
    mapping_hints: {
      tailwind: {
        colors: "Add to tailwind.config.js theme.colors",
        spacing: "Configure theme.spacing with extracted values"
      }
    },
    pitfalls: [
      "Verify color contrast meets WCAG AA standards",
      "Test typography stack fallbacks",
      "Validate spacing scale consistency"
    ]
  },
  confidence: 0.88
}
```

---

## 🔧 Advanced Configuration

### Rate Limiting

Default rate limits per API key tier:

| Tier | scan_tokens | get_tokens | Other Tools |
|------|-------------|------------|-------------|
| **Free** | 5/min | 20/min | 10/min |
| **Pro** | 20/min | 100/min | 60/min |
| **Enterprise** | Unlimited | Unlimited | Unlimited |

### Caching Strategy

- **scan_tokens**: Cached for 24 hours (configurable)
- **get_tokens**: Cached for 1 hour
- **layout_profile**: Cached for 12 hours

### Custom MCP Server Wrapper

Create `/Users/byronwade/designer/mcp-server-wrapper.js`:

```javascript
#!/usr/bin/env node
const { stdin, stdout } = require('process');
const https = require('https');
const http = require('http');

const API_KEY = process.env.CONTEXTDS_API_KEY;
const API_URL = process.env.CONTEXTDS_API_URL || 'https://contextds.com/api/mcp';

let buffer = '';

stdin.on('data', async (chunk) => {
  buffer += chunk.toString();

  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const request = JSON.parse(line);

      if (request.method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: 'scan_tokens',
                description: 'Extract design tokens from any website',
                inputSchema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    depth: { type: 'string', enum: ['1', '2', '3'], default: '1' },
                    prettify: { type: 'boolean', default: false }
                  },
                  required: ['url']
                }
              },
              {
                name: 'get_tokens',
                description: 'Retrieve cached design tokens',
                inputSchema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' }
                  },
                  required: ['url']
                }
              },
              {
                name: 'layout_profile',
                description: 'Get layout DNA analysis',
                inputSchema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    pages: { type: 'array', items: { type: 'string' } },
                    viewports: { type: 'array', items: { type: 'number' } }
                  },
                  required: ['url']
                }
              }
            ]
          }
        };
        stdout.write(JSON.stringify(response) + '\n');
      }

      else if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        const endpoint = `${API_URL}/${name.replace('_', '-')}`;

        const response = await makeRequest(endpoint, args);

        stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2)
              }
            ]
          }
        }) + '\n');
      }

    } catch (error) {
      stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32603,
          message: error.message
        }
      }) + '\n');
    }
  }
});

function makeRequest(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
```

Make it executable:
```bash
chmod +x mcp-server-wrapper.js
```

---

## 🧪 Testing the MCP Server

### Test with curl

```bash
# Test scan_tokens endpoint
curl -X POST http://localhost:3000/api/mcp/scan-tokens \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://stripe.com",
    "depth": "1",
    "prettify": false
  }'

# Test get_tokens endpoint
curl -X POST http://localhost:3000/api/mcp/get-tokens \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://stripe.com"
  }'

# Test layout_profile endpoint
curl -X POST http://localhost:3000/api/mcp/layout-profile \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com",
    "pages": ["/", "/pricing"],
    "viewports": [375, 1440]
  }'
```

### Test with Claude Code

Once configured, use in Claude Code:

```
@contextds scan https://tailwindcss.com and generate a component using their design tokens
```

---

## 🔐 Security & Authentication

### API Key Format

API keys are:
- **64 characters** (hex-encoded)
- **SHA-256 hashed** before storage
- **Rate limited** per tier
- **Revocable** via dashboard

### Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for configuration
3. **Rotate keys** every 90 days
4. **Monitor usage** via dashboard analytics
5. **Revoke compromised keys** immediately

### Environment Variables

Required for production:

```bash
# .env.local
CONTEXTDS_API_KEY=your-64-char-hex-key
REDIS_URL=https://your-upstash-redis-url
REDIS_TOKEN=your-redis-token
DATABASE_URL=postgresql://user:pass@host:5432/contextds
```

---

## 📊 Monitoring & Observability

### Usage Tracking

All MCP operations are logged with:
- Request timestamp
- Tool name and parameters
- API key (hashed)
- Response time
- Token usage
- Cost calculations
- Success/failure status

### Metrics Dashboard

Access usage metrics at:
- **Local:** http://localhost:3000/dashboard/api-usage
- **Production:** https://contextds.com/dashboard/api-usage

Tracks:
- Requests per day/week/month
- Average response times
- Success/error rates
- Token extraction counts
- Cost per operation

---

## 🛠️ Troubleshooting

### Common Issues

**Issue 1: "Invalid or missing API key"**
```
Solution: Verify CONTEXTDS_API_KEY is set in environment variables
Check: echo $CONTEXTDS_API_KEY
```

**Issue 2: "Rate limit exceeded"**
```
Solution: Upgrade to Pro tier or wait for rate limit reset
Current limits: 5/min (Free), 20/min (Pro)
```

**Issue 3: "No tokens found for domain"**
```
Solution: Scan the site first using scan_tokens
The site may exist but hasn't been scanned yet
```

**Issue 4: MCP server not appearing in Claude Desktop**
```
Solution:
1. Check config file path is correct
2. Verify JSON syntax is valid
3. Restart Claude Desktop completely
4. Check Claude Desktop logs: ~/Library/Logs/Claude/
```

**Issue 5: Connection refused to localhost:3000**
```
Solution: Ensure ContextDS is running locally
Run: bun run dev
Check: curl http://localhost:3000/api/health
```

### Debug Mode

Enable verbose logging:

```json
{
  "mcpServers": {
    "contextds": {
      "command": "node",
      "args": ["/path/to/mcp-server-wrapper.js"],
      "env": {
        "CONTEXTDS_API_KEY": "your-key",
        "CONTEXTDS_DEBUG": "true",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

Check logs:
```bash
# Claude Desktop logs
tail -f ~/Library/Logs/Claude/mcp*.log

# ContextDS server logs
bun run dev
```

---

## 🌐 Production Deployment

### Deploy to Vercel

```bash
# 1. Deploy to Vercel
vercel deploy --prod

# 2. Set environment variables
vercel env add REDIS_URL
vercel env add REDIS_TOKEN
vercel env add DATABASE_URL

# 3. Update MCP config to use production URL
# In claude_desktop_config.json:
"CONTEXTDS_API_URL": "https://contextds.com/api/mcp"
```

### Self-Hosted Deployment

```bash
# 1. Build the application
bun run build

# 2. Set production environment variables
export CONTEXTDS_API_KEY=production-key
export REDIS_URL=redis://...
export DATABASE_URL=postgresql://...

# 3. Start production server
bun run start

# 4. Configure reverse proxy (nginx/caddy)
# Example nginx config:
# location /api/mcp {
#   proxy_pass http://localhost:3000/api/mcp;
#   proxy_set_header Authorization $http_authorization;
# }
```

---

## 🎓 Advanced Usage

### Custom MCP Client (TypeScript)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/mcp-server-wrapper.js'],
  env: {
    CONTEXTDS_API_KEY: process.env.CONTEXTDS_API_KEY,
    CONTEXTDS_API_URL: 'https://contextds.com/api/mcp'
  }
});

const client = new Client({
  name: 'my-design-tool',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// Scan a website
const result = await client.callTool('scan_tokens', {
  url: 'https://example.com',
  depth: '2',
  prettify: false
});

console.log('Extracted tokens:', result);
```

### Batch Token Extraction

```typescript
// Extract tokens from multiple sites
const sites = [
  'https://stripe.com',
  'https://github.com',
  'https://vercel.com'
];

const results = await Promise.all(
  sites.map(url =>
    client.callTool('scan_tokens', { url, depth: '1' })
  )
);

// Combine into unified design system
const combinedTokens = results.reduce((acc, result) => {
  return mergeTokenSets(acc, result.token_set);
}, {});
```

---

## 📚 API Reference

### scan_tokens

**Parameters:**
- `url` (string, required): Website URL to scan
- `depth` (enum, optional): Scan depth - "1", "2", or "3" (default: "1")
- `pages` (string[], optional): Specific pages to analyze
- `viewports` (number[], optional): Viewport widths for responsive analysis
- `prettify` (boolean, optional): Format CSS output (default: false)

**Returns:**
```typescript
{
  status: 'fresh' | 'cached' | 'failed',
  site: { domain: string },
  token_set: W3CDesignTokens,
  pack: AIPromptPack,
  layout_dna: LayoutProfile,
  brand_analysis: BrandAnalysis,
  ai_metadata: AIMetadata,
  last_scanned: string
}
```

### get_tokens

**Parameters:**
- `url` (string, required): Website URL
- `version` (string, optional): Token set version

**Returns:**
```typescript
{
  token_set: W3CDesignTokens,
  pack: AIPromptPack,
  consensus: number,
  statistics: TokenStatistics,
  metadata: QueryMetadata
}
```

### layout_profile

**Parameters:**
- `url` (string, required): Website URL
- `pages` (string[], optional): Pages to analyze
- `viewports` (number[], optional): Breakpoints

**Returns:**
```typescript
{
  containers: ContainerPatterns,
  gridSystem: 'flexbox' | 'grid' | 'mixed',
  spacingScale: SpacingScale,
  archetypes: LayoutArchetype[],
  accessibility: AccessibilityMetrics
}
```

---

## 🎯 Use Cases

### 1. AI-Powered Component Generation

```typescript
// Claude Code workflow:
// 1. Scan target website
const tokens = await scan_tokens({ url: 'https://stripe.com' });

// 2. Generate implementation pack
const pack = await compose_pack({
  token_set: tokens.token_set,
  intent: 'component-authoring'
});

// 3. Use pack to generate components
// Claude Code uses the pack.mapping_hints to create:
// - Tailwind config with extracted colors
// - Component library matching design system
// - CSS variables for theming
```

### 2. Design System Auditing

```typescript
// Compare your implementation to original
const original = await get_tokens({ url: 'https://stripe.com' });
const yours = await scan_tokens({ url: 'https://yourdomain.com' });

// AI compares token sets and identifies:
// - Missing tokens
// - Inconsistent values
// - Accessibility issues
// - Implementation gaps
```

### 3. Multi-Site Research

```typescript
// Research design systems for inspiration
const competitors = [
  'https://stripe.com',
  'https://linear.app',
  'https://notion.so'
];

const analysis = await Promise.all(
  competitors.map(async (url) => ({
    site: url,
    tokens: await scan_tokens({ url }),
    layout: await layout_profile({ url })
  }))
);

// AI analyzes patterns across all sites
// Generates recommendations for your design system
```

---

## 📦 Package Distribution (Coming Soon)

### npm Package

```bash
# Install MCP client SDK
npm install @contextds/mcp-client

# Usage:
import { ContextDSMCP } from '@contextds/mcp-client';

const client = new ContextDSMCP({
  apiKey: process.env.CONTEXTDS_API_KEY
});

const tokens = await client.scanTokens('https://example.com');
```

### Claude Code Integration

```bash
# Auto-discovery in Claude Code
# Add to .claude/config.json:
{
  "mcp": {
    "servers": ["@contextds/mcp-server"]
  }
}
```

---

## 🤝 Support

### Documentation
- **API Docs:** https://contextds.com/docs/api
- **MCP Guide:** https://contextds.com/docs/mcp
- **Examples:** https://contextds.com/examples

### Community
- **GitHub Issues:** https://github.com/contextds/contextds/issues
- **Discord:** https://discord.gg/contextds
- **Email:** support@contextds.com

### Enterprise Support
- **SLA:** 99.9% uptime
- **Priority Support:** 24/7 availability
- **Custom Integrations:** Available
- **Contact:** enterprise@contextds.com

---

## 🚀 Roadmap

- [ ] **Dashboard API Key Management** (Sprint 1)
- [ ] **Usage Analytics Dashboard** (Sprint 1)
- [ ] **WebSocket Support** for real-time scanning (Sprint 2)
- [ ] **npm Package** `@contextds/mcp-client` (Sprint 2)
- [ ] **Figma Plugin Integration** (Sprint 3)
- [ ] **GitHub Action** for CI/CD token validation (Sprint 3)
- [ ] **VSCode Extension** with MCP integration (Sprint 4)

---

**Last Updated:** 2025-09-29
**Version:** 1.0.0
**Status:** Production Ready (with limitations noted in comprehensive review)