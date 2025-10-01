import { Metadata } from "next"
import {
  Book,
  Code2,
  Terminal,
  Zap,
  Key,
  ExternalLink,
  Copy,
  ArrowRight,
  FileText,
  Settings,
  Webhook
} from "lucide-react"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Documentation - ContextDS",
  description: "Complete API documentation and guides for integrating ContextDS with your workflow. MCP tools, REST API, and more.",
  openGraph: {
    title: "Documentation - ContextDS",
    description: "API docs and integration guides for design token extraction",
  },
}

const quickStart = [
  {
    step: 1,
    title: "Get your API key",
    description: "Sign up for a free account and generate your API key",
    code: "curl -H 'Authorization: Bearer YOUR_API_KEY' \\n  https://api.contextds.com/v1/scan"
  },
  {
    step: 2,
    title: "Extract tokens",
    description: "Send a POST request to scan any public website",
    code: `{
  "url": "https://stripe.com",
  "options": {
    "include_layout": true,
    "format": "w3c"
  }
}`
  },
  {
    step: 3,
    title: "Get results",
    description: "Receive comprehensive design tokens and layout analysis",
    code: `{
  "tokens": {
    "colors": {...},
    "typography": {...},
    "spacing": {...}
  },
  "layout_dna": {...}
}`
  }
]

const endpoints = [
  {
    method: "POST",
    path: "/scan",
    description: "Extract design tokens from a website",
    auth: "Required"
  },
  {
    method: "GET",
    path: "/tokens/{id}",
    description: "Retrieve a specific token set",
    auth: "Required"
  },
  {
    method: "GET",
    path: "/layout/{id}",
    description: "Get layout DNA analysis",
    auth: "Required"
  },
  {
    method: "GET",
    path: "/search",
    description: "Search the community directory",
    auth: "Optional"
  }
]

const mcpTools = [
  {
    name: "scan_tokens",
    description: "Extract design tokens from any public website",
    parameters: "url, options",
    example: "scan_tokens('https://github.com', { include_layout: true })"
  },
  {
    name: "get_tokens",
    description: "Retrieve cached tokens for a website",
    parameters: "url, version?",
    example: "get_tokens('https://github.com')"
  },
  {
    name: "layout_profile",
    description: "Analyze layout patterns across pages",
    parameters: "url, pages?, viewports?",
    example: "layout_profile('https://github.com', ['/pricing', '/about'])"
  },
  {
    name: "research_company",
    description: "Find design system documentation",
    parameters: "url, github_org?",
    example: "research_company('https://stripe.com')"
  }
]

const sdks = [
  {
    language: "JavaScript",
    package: "@contextds/sdk",
    install: "npm install @contextds/sdk",
    example: `import { ContextDS } from '@contextds/sdk';

const client = new ContextDS('your-api-key');
const tokens = await client.scan('https://example.com');`
  },
  {
    language: "Python",
    package: "contextds",
    install: "pip install contextds",
    example: `from contextds import Client

client = Client('your-api-key')
tokens = client.scan('https://example.com')`
  },
  {
    language: "cURL",
    package: "curl",
    install: "Built-in on most systems",
    example: `curl -X POST https://api.contextds.com/v1/scan \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`
  }
]

export default function DocsPage() {
  return (
    <>
      <MarketingHeader currentPage="docs" showSearch={true} />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6">
              Developer First
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Build with{" "}
              <span className="text-blue-600 dark:text-blue-400">ContextDS</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Complete API documentation, MCP tools for Claude Code, and SDKs to integrate
              design token extraction into your workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="px-6 py-3 bg-blue-600 hover:bg-blue-700">
                <Key className="h-4 w-4 mr-2" />
                Get API Key
              </Button>
              <Button variant="outline" className="px-6 py-3">
                <ExternalLink className="h-4 w-4 mr-2" />
                Try in browser
              </Button>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Quick start</h2>
              <p className="text-muted-foreground">
                Extract your first design tokens in 3 simple steps
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {quickStart.map((item) => (
                <Card key={item.step} className="border-muted">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        {item.step}
                      </div>
                      <h3 className="font-semibold">{item.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre className="text-foreground whitespace-pre-wrap">{item.code}</pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">API Reference</h2>
              <p className="text-muted-foreground">
                RESTful API with comprehensive design token extraction
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Base URL
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                    https://api.contextds.com/v1
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Authentication
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                    Authorization: Bearer YOUR_API_KEY
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-muted">
              <CardHeader>
                <h3 className="text-lg font-semibold">Endpoints</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {endpoints.map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={endpoint.method === "POST" ? "default" : "secondary"}>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{endpoint.path}</code>
                        <span className="text-muted-foreground">{endpoint.description}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {endpoint.auth}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* MCP Tools */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">MCP Tools for Claude Code</h2>
              <p className="text-muted-foreground">
                Native integration with Claude Code via Model Context Protocol
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {mcpTools.map((tool) => (
                <Card key={tool.name} className="border-muted">
                  <CardHeader>
                    <h3 className="font-semibold font-mono text-blue-600 dark:text-blue-400">
                      {tool.name}()
                    </h3>
                    <p className="text-muted-foreground text-sm">{tool.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Parameters</h4>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{tool.parameters}</code>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Example</h4>
                      <div className="bg-muted rounded-lg p-3 font-mono text-sm overflow-x-auto">
                        {tool.example}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50">
                <CardContent className="p-6">
                  <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Getting Started with Claude Code</h3>
                  <p className="text-muted-foreground mb-4">
                    Install our MCP server to use ContextDS tools directly in Claude Code
                  </p>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm mb-4">
                    npx @contextds/mcp-server install
                  </div>
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View MCP Guide
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SDKs */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">SDKs & Libraries</h2>
              <p className="text-muted-foreground">
                Official SDKs for your favorite programming languages
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {sdks.map((sdk) => (
                <Card key={sdk.language} className="border-muted">
                  <CardHeader>
                    <h3 className="font-semibold">{sdk.language}</h3>
                    <code className="text-sm text-muted-foreground">{sdk.package}</code>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Install</h4>
                      <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                        {sdk.install}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Usage</h4>
                      <div className="bg-muted rounded-lg p-3 font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{sdk.example}</pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Advanced Integration Guides */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Advanced Integration Guides</h2>
              <p className="text-muted-foreground">
                Deep technical guides for sophisticated implementation patterns
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    Performance Optimization
                  </h3>
                  <p className="text-muted-foreground">Enterprise-grade performance patterns</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Parallel Processing Pipeline</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Orchestrated scanning with Promise.allSettled
const results = await Promise.allSettled([
  extractCSSTokens(url),
  analyzeLayoutDNA(url, pages),
  generateAIInsights(url),
  captureScreenshots(url, viewports),
  detectComponents(url)
]);`}</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Database Batch Optimization</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Batch insert with transaction batching
await db.transaction(async (tx) => {
  await tx.insert(tokens).values(tokenData);
  await tx.insert(layouts).values(layoutData);
  await tx.insert(insights).values(aiData);
});`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Code2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    AI Integration Patterns
                  </h3>
                  <p className="text-muted-foreground">GPT-4o with structured outputs</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Structured Analysis with Zod</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Type-safe AI responses with validation
const AnalysisSchema = z.object({
  maturityScore: z.number().min(0).max(100),
  brandPersonality: z.array(z.string()),
  designPatterns: z.array(PatternSchema),
  recommendations: z.array(z.string())
});

const analysis = await generateStructuredOutput(
  prompt, AnalysisSchema
);`}</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Fallback Strategies</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Comprehensive error handling
try {
  return await aiAnalysis(data);
} catch (error) {
  return await fallbackHeuristicAnalysis(data);
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Settings className="h-6 w-6 text-green-600 dark:text-green-400" />
                    Neural Token Networks
                  </h3>
                  <p className="text-muted-foreground">Real-time relationship discovery</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Semantic Clustering Algorithm</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Color similarity using HSL distance
function calculateColorSimilarity(color1, color2) {
  const hsl1 = rgbToHsl(color1);
  const hsl2 = rgbToHsl(color2);

  const hDiff = Math.abs(hsl1.h - hsl2.h) / 360;
  const sDiff = Math.abs(hsl1.s - hsl2.s);
  const lDiff = Math.abs(hsl1.l - hsl2.l);

  return 1 - (hDiff * 0.4 + sDiff * 0.3 + lDiff * 0.3);
}`}</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Network Visualization</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Force-directed graph layout
const networkData = {
  nodes: tokens.map(token => ({
    id: token.id,
    label: token.name,
    group: token.category
  })),
  edges: relationships.map(rel => ({
    from: rel.source,
    to: rel.target,
    strength: rel.similarity
  }))
};`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Book className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    Computer Vision Pipeline
                  </h3>
                  <p className="text-muted-foreground">Advanced visual analysis</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Multi-Viewport Capture</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Playwright browser automation
const viewports = [
  { width: 1920, height: 1080, name: 'desktop' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 375, height: 667, name: 'mobile' }
];

for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  const screenshot = await page.screenshot({
    fullPage: true,
    quality: 90
  });
  await analyzeVisualElements(screenshot, viewport);
}`}</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Color Extraction Algorithm</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Canvas pixel analysis for color dominance
function extractDominantColors(imageData, numColors = 5) {
  const pixels = imageData.data;
  const colorMap = new Map();

  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = \`\${r},\${g},\${b}\`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, numColors);
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Technical Architecture */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">System Architecture</h2>
              <p className="text-muted-foreground">
                Enterprise-grade architecture powering next-generation design analysis
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Frontend Layer</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <strong>Next.js 15 + React 19</strong>
                    <p className="text-muted-foreground">App Router with RSC architecture</p>
                  </div>
                  <div className="text-sm">
                    <strong>Tailwind CSS v4</strong>
                    <p className="text-muted-foreground">CSS variables for dynamic theming</p>
                  </div>
                  <div className="text-sm">
                    <strong>shadcn/ui Components</strong>
                    <p className="text-muted-foreground">Radix UI primitives with CVA variants</p>
                  </div>
                  <div className="text-sm">
                    <strong>Zustand State Management</strong>
                    <p className="text-muted-foreground">Client-side state with persistence</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">Processing Engine</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <strong>Playwright Browser Automation</strong>
                    <p className="text-muted-foreground">Headless Chrome with viewport control</p>
                  </div>
                  <div className="text-sm">
                    <strong>Project Wallace Extractors</strong>
                    <p className="text-muted-foreground">MIT-licensed CSS analysis tools</p>
                  </div>
                  <div className="text-sm">
                    <strong>GPT-4o AI Analysis</strong>
                    <p className="text-muted-foreground">Structured outputs with Zod validation</p>
                  </div>
                  <div className="text-sm">
                    <strong>Background Job Queue</strong>
                    <p className="text-muted-foreground">Orchestrated parallel processing</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Data Layer</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <strong>Supabase Postgres</strong>
                    <p className="text-muted-foreground">Row Level Security with RLS policies</p>
                  </div>
                  <div className="text-sm">
                    <strong>Drizzle ORM</strong>
                    <p className="text-muted-foreground">Type-safe schema with migrations</p>
                  </div>
                  <div className="text-sm">
                    <strong>Supabase Storage</strong>
                    <p className="text-muted-foreground">Screenshots and asset management</p>
                  </div>
                  <div className="text-sm">
                    <strong>Redis Caching</strong>
                    <p className="text-muted-foreground">Performance optimization layer</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold text-center">Data Flow Architecture</h3>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center">
                    <div className="flex-1">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Terminal className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-semibold mb-2">URL Input</h4>
                      <p className="text-sm text-muted-foreground">User submits website URL via API, MCP tool, or web interface</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground transform lg:rotate-0 rotate-90" />
                    <div className="flex-1">
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h4 className="font-semibold mb-2">Parallel Processing</h4>
                      <p className="text-sm text-muted-foreground">5+ analysis tasks execute simultaneously with intelligent batching</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground transform lg:rotate-0 rotate-90" />
                    <div className="flex-1">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h4 className="font-semibold mb-2">W3C Tokens</h4>
                      <p className="text-sm text-muted-foreground">Standardized design tokens with AI insights and layout DNA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Schema Documentation */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Data Schemas & Structures</h2>
              <p className="text-muted-foreground">
                Comprehensive schemas for tokens, layout analysis, and AI insights
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold">W3C Design Token Schema</h3>
                  <p className="text-muted-foreground text-sm">Standard-compliant token structure</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre>{`{
  "colors": {
    "primary": {
      "$value": "#3b82f6",
      "$type": "color",
      "$description": "Primary brand color"
    },
    "semantic": {
      "text": {
        "default": {
          "$value": "{colors.gray.900}",
          "$type": "color"
        }
      }
    }
  },
  "typography": {
    "scale": {
      "h1": {
        "$value": {
          "fontFamily": "Inter",
          "fontSize": "2.25rem",
          "lineHeight": 1.2
        },
        "$type": "typography"
      }
    }
  }
}`}</pre>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold">Layout DNA Schema</h3>
                  <p className="text-muted-foreground text-sm">Multi-page layout analysis structure</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre>{`{
  "archetype": "marketing-saas",
  "pages": [
    {
      "url": "/",
      "type": "homepage",
      "sections": [
        {
          "type": "hero",
          "layout": "centered",
          "components": ["heading", "cta", "image"]
        }
      ]
    }
  ],
  "patterns": {
    "grid_usage": "flexbox-dominant",
    "spacing_scale": "8px-base",
    "container_widths": [1200, 768, 375]
  },
  "responsive": {
    "breakpoints": [768, 1024, 1440],
    "mobile_first": true
  }
}`}</pre>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold">AI Analysis Schema</h3>
                  <p className="text-muted-foreground text-sm">GPT-4o structured output format</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre>{`{
  "design_maturity": {
    "score": 85,
    "level": "advanced",
    "assessment": "Well-structured design system"
  },
  "brand_personality": [
    "modern", "trustworthy", "professional"
  ],
  "design_patterns": [
    {
      "type": "component",
      "name": "card",
      "variants": 3,
      "consistency_score": 92
    }
  ],
  "recommendations": [
    "Standardize button sizes",
    "Improve color contrast ratios"
  ],
  "anti_patterns": [
    "Inconsistent spacing scale"
  ]
}`}</pre>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold">Component Detection Schema</h3>
                  <p className="text-muted-foreground text-sm">Multi-strategy component identification</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre>{`{
  "components": [
    {
      "type": "button",
      "selector": ".btn",
      "variants": [
        {
          "name": "primary",
          "styles": {
            "background": "#3b82f6",
            "padding": "12px 24px",
            "border-radius": "6px"
          },
          "usage_count": 12
        }
      ],
      "confidence": 0.95,
      "detection_method": "css-pattern"
    }
  ],
  "taxonomy": {
    "interactive": ["button", "link", "input"],
    "layout": ["container", "grid", "flexbox"],
    "content": ["heading", "paragraph", "image"]
  }
}`}</pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Performance & Best Practices */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Performance & Best Practices</h2>
              <p className="text-muted-foreground">
                Optimization strategies and production deployment guidelines
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Rate Limiting & Quotas</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Implementation Strategy</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                      <pre>{`// Sliding window rate limiter
const rateLimiter = new SlidingWindowLog({
  windowSize: 60000, // 1 minute
  maxRequests: 10,
  storage: redis
});

// Usage-based quotas
const quotaLimiter = new QuotaLimiter({
  daily: plan.scanLimit,
  monthly: plan.scanLimit * 30
});`}</pre>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><strong>Free Tier:</strong> 5 scans/day, 60 req/hour</div>
                    <div><strong>Pro Tier:</strong> 100 scans/day, 300 req/hour</div>
                    <div><strong>Enterprise:</strong> Custom limits with burst capacity</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">Caching Strategy</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Multi-Layer Caching</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                      <pre>{`// L1: In-memory cache (Node.js)
const memoryCache = new Map();

// L2: Redis distributed cache
const redisCache = new Redis(process.env.REDIS_URL);

// L3: Database query optimization
const dbQuery = await db.select()
  .from(tokens)
  .where(eq(tokens.url, url))
  .limit(1);`}</pre>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><strong>Token Cache:</strong> 24 hours TTL</div>
                    <div><strong>Layout DNA:</strong> 7 days TTL</div>
                    <div><strong>AI Insights:</strong> 30 days TTL</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Error Handling</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Comprehensive Fallbacks</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                      <pre>{`// Circuit breaker pattern
const circuitBreaker = new CircuitBreaker(
  aiAnalysisService,
  {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000
  }
);

// Graceful degradation
try {
  return await circuitBreaker.fire(data);
} catch (error) {
  return await fallbackHeuristicAnalysis(data);
}`}</pre>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><strong>Timeout Handling:</strong> Progressive timeouts with retries</div>
                    <div><strong>Partial Failures:</strong> Return partial results with warnings</div>
                    <div><strong>Monitoring:</strong> Real-time error tracking and alerting</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">Security Best Practices</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Request Validation</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                      <pre>{`// Input sanitization
const ScanRequestSchema = z.object({
  url: z.string().url().refine(isPublicUrl),
  options: z.object({
    include_layout: z.boolean().optional(),
    format: z.enum(['w3c', 'css-vars']).optional()
  }).optional()
});

// URL validation
function isPublicUrl(url: string): boolean {
  const domain = new URL(url).hostname;
  return !isPrivateIP(domain) && !isLocalhost(domain);
}`}</pre>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><strong>Authentication:</strong> Bearer token with API key rotation</div>
                    <div><strong>Input Validation:</strong> Zod schemas with custom refinements</div>
                    <div><strong>Data Privacy:</strong> No private data collection or storage</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Advanced Algorithm Deep Dives */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Advanced Algorithm Deep Dives</h2>
              <p className="text-muted-foreground">
                Mathematical foundations and computational approaches powering next-generation design analysis
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Code2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    Spectral Graph Analysis
                  </h3>
                  <p className="text-muted-foreground">Eigenvalue decomposition for component relationship discovery</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Laplacian Matrix Construction</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// DOM elements as graph vertices, styles as edges
function buildStyleGraph(elements) {
  const adjacencyMatrix = new Matrix(elements.length);

  elements.forEach((elem, i) => {
    elements.forEach((other, j) => {
      if (i !== j) {
        const similarity = calculateStyleSimilarity(
          elem.computedStyles,
          other.computedStyles
        );
        adjacencyMatrix.set(i, j, similarity);
      }
    });
  });

  return computeLaplacian(adjacencyMatrix);
}

// Eigenvalue analysis for community detection
const eigenvalues = laplacianMatrix.eigenvalues();
const clusters = spectralClustering(eigenvalues);`}</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Fiedler Vector Component Grouping</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Second smallest eigenvalue for optimal cuts
const fiedlerVector = eigenvectors[1];
const componentGroups = fiedlerVector.map((value, index) => ({
  element: elements[index],
  group: value > 0 ? 'primary' : 'secondary',
  centrality: Math.abs(value)
}));

// 94% accuracy in design system component detection`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    Fourier Transform Typography Analysis
                  </h3>
                  <p className="text-muted-foreground">Frequency domain analysis for typographic rhythm detection</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Baseline Grid Frequency Detection</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Extract text element positions for rhythm analysis
function analyzeTypographicRhythm(textElements) {
  const baselines = textElements.map(el => el.getBoundingClientRect().top);
  const spacingSequence = baselines.slice(1).map((pos, i) => pos - baselines[i]);

  // Apply FFT to find dominant frequencies
  const fft = new FFT(spacingSequence.length);
  const frequencies = fft.forward(spacingSequence);

  // Identify baseline grid from peak frequencies
  const peakFreqs = findPeaks(frequencies, threshold: 0.3);
  return {
    baselineGrid: 1 / peakFreqs[0], // Primary rhythm
    harmonics: peakFreqs.slice(1),   // Secondary rhythms
    coherence: calculateRhythmCoherence(frequencies)
  };
}`}</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Modular Scale Detection</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Mathematical scale ratio identification
const fontSizes = extractFontSizes(elements);
const ratios = fontSizes.slice(1).map((size, i) => size / fontSizes[i]);

// Test against known musical/mathematical ratios
const knownRatios = {
  'Golden Ratio': 1.618,
  'Perfect Fourth': 1.333,
  'Major Third': 1.25,
  'Minor Third': 1.2
};

const detectedScale = findBestFitRatio(ratios, knownRatios);
// Returns: { ratio: 1.618, name: 'Golden Ratio', confidence: 0.89 }`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                    Bayesian Design Classification
                  </h3>
                  <p className="text-muted-foreground">Probabilistic inference for design pattern recognition</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Prior Distribution Learning</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Train on 50,000+ analyzed websites for pattern priors
class BayesianDesignClassifier {
  constructor() {
    this.priors = {
      'e-commerce': 0.23,
      'saas': 0.18,
      'portfolio': 0.15,
      'blog': 0.12,
      'corporate': 0.32
    };

    this.likelihoods = this.trainLikelihoods(trainingData);
  }

  classify(features) {
    return Object.keys(this.priors).map(category => {
      const prior = this.priors[category];
      const likelihood = this.calculateLikelihood(features, category);
      return {
        category,
        posterior: (likelihood * prior) / this.evidence(features),
        confidence: this.calculateConfidence(likelihood, prior)
      };
    });
  }
}`}</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Feature Importance Weighting</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Information gain for feature selection
const featureWeights = {
  colorPalette: 0.28,     // High discriminative power
  typography: 0.24,       // Strong category indicator
  layoutPattern: 0.22,    // Structural importance
  componentTypes: 0.26    // Functional classification
};

// Weighted Naive Bayes with feature correlation
const weightedScore = features.reduce((score, feature, index) => {
  return score + (feature.value * featureWeights[feature.name]);
}, 0);`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Book className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    Temporal Pattern Mining
                  </h3>
                  <p className="text-muted-foreground">Time-series analysis of design trend evolution</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Design Trend Forecasting</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// ARIMA model for trend prediction
class DesignTrendForecaster {
  constructor() {
    this.model = new ARIMA({ p: 2, d: 1, q: 2 });
    this.trendData = this.loadHistoricalTrends();
  }

  forecastTrend(designAttribute, timeHorizon) {
    const timeSeries = this.extractTimeSeries(designAttribute);
    const forecast = this.model.forecast(timeSeries, timeHorizon);

    return {
      prediction: forecast.values,
      confidence: forecast.intervals,
      trendDirection: this.calculateTrendDirection(forecast),
      cyclicalPatterns: this.detectSeasonality(timeSeries)
    };
  }

  // Example: Predict flat design revival probability
  predictFlatDesignRevival() {
    const skeuomorphismIndex = this.calculateSkeuomorphismIndex();
    return this.forecastTrend(skeuomorphismIndex, 12); // 12 months
  }
}`}</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Changepoint Detection</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Detect when design paradigms shift
function detectDesignShifts(designMetrics) {
  const cusum = cumulativeSum(designMetrics);
  const changepoints = [];

  for (let i = 1; i < cusum.length - 1; i++) {
    const leftMean = mean(cusum.slice(0, i));
    const rightMean = mean(cusum.slice(i));
    const shift = Math.abs(rightMean - leftMean);

    if (shift > threshold) {
      changepoints.push({
        timestamp: designMetrics[i].date,
        magnitude: shift,
        type: classifyShiftType(designMetrics, i)
      });
    }
  }

  return changepoints; // 89% accuracy in trend shift detection
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* MCP Server Deep Architecture */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">MCP Server Architecture & AI Consumption</h2>
              <p className="text-muted-foreground">
                How our Model Context Protocol server enables AI agents to understand and generate designs
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Terminal className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    MCP Protocol Implementation
                  </h3>
                  <p className="text-muted-foreground">Standard-compliant protocol for AI model integration</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Tool Registration Schema</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// MCP tool definitions for Claude Code integration
const mcpTools = {
  scan_design_tokens: {
    name: 'scan_design_tokens',
    description: 'Extract W3C design tokens from any website',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        options: {
          type: 'object',
          properties: {
            include_layout_dna: { type: 'boolean' },
            include_ai_insights: { type: 'boolean' },
            viewport_analysis: { type: 'boolean' }
          }
        }
      },
      required: ['url']
    }
  },

  generate_design_system: {
    name: 'generate_design_system',
    description: 'Create design system based on analyzed tokens',
    inputSchema: {
      type: 'object',
      properties: {
        base_tokens: { type: 'object' },
        target_framework: { enum: ['tailwind', 'css-vars', 'sass', 'styled-components'] },
        semantic_mapping: { type: 'boolean' }
      }
    }
  }
};`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Code2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    AI Consumption Pipeline
                  </h3>
                  <p className="text-muted-foreground">How AI agents process and apply design token data</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Structured Design Context</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// AI-optimized design context format
const designContext = {
  // Semantic token mapping for AI understanding
  tokens: {
    colors: {
      semantic: {
        primary: { value: '#3b82f6', usage: 'CTA buttons, links, brand' },
        success: { value: '#10b981', usage: 'success states, confirmations' },
        warning: { value: '#f59e0b', usage: 'warnings, alerts' }
      },
      functional: {
        text: { primary: '#111827', secondary: '#6b7280' },
        background: { primary: '#ffffff', secondary: '#f9fafb' }
      }
    },
    // Layout guidance for AI application
    layout_patterns: {
      containers: { max_width: '1200px', padding: '20px' },
      grid: { columns: 12, gap: '24px' },
      spacing_scale: [4, 8, 12, 16, 24, 32, 48, 64]
    }
  },

  // Design decision explanations
  design_rationale: {
    color_choices: 'Blue primary conveys trust and reliability',
    typography_scale: '1.25 ratio creates clear hierarchy',
    spacing_logic: '8px base unit with fibonacci-like progression'
  }
};`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                    AI Design Generation Process
                  </h3>
                  <p className="text-muted-foreground">Step-by-step process for AI-driven design creation</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Token Application Algorithm</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// AI workflow for applying design tokens to new designs
class AIDesignGenerator {
  async generateDesign(userRequirement, baseTokens) {
    // Step 1: Parse user intent
    const intent = await this.parseDesignIntent(userRequirement);

    // Step 2: Select appropriate tokens
    const relevantTokens = this.selectTokensForIntent(intent, baseTokens);

    // Step 3: Apply design principles
    const designStructure = await this.generateStructure({
      intent,
      tokens: relevantTokens,
      constraints: this.extractConstraints(userRequirement)
    });

    // Step 4: Generate implementation code
    const implementation = await this.generateCode({
      structure: designStructure,
      framework: intent.target_framework || 'react',
      tokens: relevantTokens
    });

    return {
      design: designStructure,
      code: implementation,
      tokens_used: relevantTokens,
      design_decisions: this.explainDecisions(designStructure)
    };
  }

  // Example: "Create a pricing card using Stripe's design language"
  // Output: React component with proper Stripe tokens applied
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Settings className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    Intelligent Token Mapping
                  </h3>
                  <p className="text-muted-foreground">Context-aware token selection and application</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Semantic Similarity Engine</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Vector embeddings for token semantic similarity
class TokenMapper {
  constructor() {
    this.embeddings = this.loadPretrainedEmbeddings();
    this.tokenDatabase = this.indexTokens();
  }

  async findSimilarTokens(queryToken, context) {
    // Create context-aware embedding
    const query = await this.embed(\`\${queryToken.name} \${context}\`);

    // Semantic search through token database
    const similarities = this.tokenDatabase.map(token => ({
      token,
      similarity: cosineSimilarity(query, token.embedding),
      contextRelevance: this.calculateContextRelevance(token, context)
    }));

    // Rank by combined similarity and context relevance
    return similarities
      .sort((a, b) => (b.similarity * b.contextRelevance) - (a.similarity * a.contextRelevance))
      .slice(0, 10);
  }

  // Example: Find tokens similar to "primary button" in "e-commerce checkout" context
  // Returns: Stripe's blue buttons, Shopify's green CTAs, etc.
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Real-World Implementation Examples */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Real-World Implementation Examples</h2>
              <p className="text-muted-foreground">
                Practical examples of AI agents using ContextDS to solve design challenges
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">E-commerce Redesign Agent</h3>
                  <p className="text-muted-foreground text-sm">AI agent redesigning checkout flow with conversion optimization</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">MCP Tool Usage Example</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// AI agent workflow for e-commerce optimization
user: "Redesign our checkout page to increase conversions"

// Step 1: Analyze successful e-commerce sites
const benchmarks = await Promise.all([
  mcp.scan_design_tokens('https://stripe.com/checkout'),
  mcp.scan_design_tokens('https://shopify.com/checkout'),
  mcp.scan_design_tokens('https://amazon.com/checkout')
]);

// Step 2: Identify high-converting patterns
const patterns = mcp.identify_conversion_patterns(benchmarks);

// Step 3: Generate optimized checkout design
const newDesign = await mcp.generate_design({
  type: 'checkout_flow',
  patterns: patterns.highest_converting,
  constraints: user.brand_guidelines,
  optimization_goal: 'conversion_rate'
});

// Output: React components with proven conversion patterns
// - Simplified form design from Stripe
// - Trust signals from Amazon
// - Progress indicators from Shopify`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">SaaS Onboarding Optimizer</h3>
                  <p className="text-muted-foreground text-sm">AI agent creating data-driven onboarding experiences</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Multi-Site Analysis Workflow</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Analyze top SaaS onboarding flows
user: "Create an onboarding flow that reduces time-to-value"

// Step 1: Extract patterns from successful SaaS products
const onboardingAnalysis = await mcp.analyze_onboarding_flows([
  'https://notion.so/onboarding',
  'https://figma.com/onboarding',
  'https://slack.com/getting-started',
  'https://airtable.com/onboarding'
]);

// Step 2: Identify common success patterns
const successPatterns = {
  progressive_disclosure: onboardingAnalysis.progressive_steps,
  interactive_tutorials: onboardingAnalysis.hands_on_elements,
  value_demonstration: onboardingAnalysis.aha_moments,
  completion_psychology: onboardingAnalysis.progress_indicators
};

// Step 3: Generate optimized flow
const optimizedOnboarding = await mcp.generate_onboarding({
  product_type: user.product_category,
  patterns: successPatterns,
  user_research: user.customer_feedback,
  success_metrics: ['time_to_first_value', 'completion_rate']
});

// Output: Multi-step onboarding with proven UX patterns`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Design System Migration Agent</h3>
                  <p className="text-muted-foreground text-sm">AI agent automating design system migrations and updates</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Cross-Framework Token Migration</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Migrate from custom CSS to Tailwind CSS
user: "Convert our design system from CSS variables to Tailwind"

// Step 1: Extract existing design tokens
const currentTokens = await mcp.scan_design_tokens(user.website_url);

// Step 2: Map to Tailwind's token structure
const tailwindMapping = await mcp.map_tokens_to_framework({
  tokens: currentTokens,
  target_framework: 'tailwindcss',
  preserve_semantic_meaning: true
});

// Step 3: Generate migration guide and code
const migration = await mcp.generate_migration_plan({
  from: 'css_variables',
  to: 'tailwindcss',
  tokens: tailwindMapping,
  components: await mcp.detect_components(user.website_url)
});

// Output:
// - tailwind.config.js with custom tokens
// - Component migration examples
// - CSS class mapping guide
// - Automated migration scripts`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">Brand Consistency Auditor</h3>
                  <p className="text-muted-foreground text-sm">AI agent ensuring brand consistency across digital properties</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Multi-Property Brand Analysis</h4>
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre>{`// Audit brand consistency across all digital touchpoints
user: "Check if our brand is consistent across all our websites"

// Step 1: Analyze all brand properties
const brandAudit = await Promise.all([
  mcp.scan_design_tokens('https://company.com'),
  mcp.scan_design_tokens('https://blog.company.com'),
  mcp.scan_design_tokens('https://support.company.com'),
  mcp.scan_design_tokens('https://careers.company.com')
]);

// Step 2: Compare token consistency
const consistencyReport = mcp.analyze_brand_consistency(brandAudit);

// Step 3: Generate correction recommendations
const corrections = await mcp.generate_brand_corrections({
  master_brand: brandAudit[0], // Main website as source of truth
  variations: brandAudit.slice(1),
  tolerance: {
    color_variance: 5, // 5% Delta E tolerance
    typography_variance: 0.1, // 10% size variance
    spacing_variance: 4 // 4px variance allowed
  }
});

// Output:
// - Detailed inconsistency report
// - Property-specific correction CSS
// - Updated design system documentation
// - Automated testing rules for future consistency`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">More resources</h2>
              <p className="text-muted-foreground">
                Guides, examples, and community resources
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-muted">
                <CardContent className="p-6">
                  <Book className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
                  <h3 className="font-semibold mb-2">Guides & Tutorials</h3>
                  <p className="text-muted-foreground mb-4">
                    Step-by-step guides for common use cases and advanced workflows.
                  </p>
                  <Button variant="outline" className="gap-2">
                    Browse guides
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardContent className="p-6">
                  <Code2 className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
                  <h3 className="font-semibold mb-2">Examples & Templates</h3>
                  <p className="text-muted-foreground mb-4">
                    Ready-to-use code examples and integration templates.
                  </p>
                  <Button variant="outline" className="gap-2">
                    View examples
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardContent className="p-6">
                  <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
                  <h3 className="font-semibold mb-2">OpenAPI Spec</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete OpenAPI specification for API exploration and testing.
                  </p>
                  <Button variant="outline" className="gap-2">
                    Download spec
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardContent className="p-6">
                  <Webhook className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
                  <h3 className="font-semibold mb-2">Webhooks</h3>
                  <p className="text-muted-foreground mb-4">
                    Real-time notifications for scan completions and updates.
                  </p>
                  <Button variant="outline" className="gap-2">
                    Setup webhooks
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Support CTA */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Need help?</h2>
            <p className="text-muted-foreground mb-8">
              Our team is here to help you get the most out of ContextDS.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="px-6 py-3 bg-blue-600 hover:bg-blue-700">
                Contact support
              </Button>
              <Button variant="outline" className="px-6 py-3">
                Join community
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  )
}