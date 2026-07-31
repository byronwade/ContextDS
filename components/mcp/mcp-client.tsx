'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckIcon,
  CopyIcon,
  KeyIcon,
  LockIcon,
  PlugsIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { AppShell } from '@/components/organisms/app-shell'
import { Button } from '@/components/ui/button'
import { Overline, useCopy } from '@/components/dossier/shared'
import { useEntitlements } from '@/lib/premium'
import { cn } from '@/lib/utils'

const TOOLS = [
  {
    name: 'scan_tokens',
    description: 'Scan a public site and extract its full token set on demand.',
    auth: 'API key',
  },
  {
    name: 'get_tokens',
    description: 'Fetch the cached Design Contract tokens for a domain, instantly.',
    auth: 'public',
  },
  {
    name: 'layout_profile',
    description: 'Layout DNA — containers, breakpoints, grid system, archetypes.',
    auth: 'public',
  },
  {
    name: 'research_artifacts',
    description: 'Find official design-system repos, Figma files and docs for a brand.',
    auth: 'API key',
  },
  {
    name: 'compose_pack',
    description: 'Compose a full installable Design Contract pack from a scan.',
    auth: 'API key',
  },
]

function configSnippet(apiKey: string | null): string {
  return `{
  "mcpServers": {
    "designcontracts": {
      "command": "npx",
      "args": ["-y", "github:byronwade/designcontracts.sh#mcp-server-wrapper.js"],
      "env": {
        "DESIGNCONTRACTS_API_KEY": "${apiKey ?? '<your-pro-api-key>'}",
        "DESIGNCONTRACTS_API_URL": "https://designcontracts.sh/api/mcp"
      }
    }
  }
}`
}

export default function McpClient() {
  const { isPro } = useEntitlements()
  const { copiedKey, copy } = useCopy()
  const [apiKey, setApiKey] = useState<string | null>(null)

  const snippet = useMemo(() => configSnippet(apiKey), [apiKey])

  const generateKey = () => {
    const random = crypto
      .getRandomValues(new Uint8Array(18))
      .reduce((acc, byte) => acc + byte.toString(36).padStart(2, '0'), '')
      .slice(0, 32)
    setApiKey(`dc_live_${random}`)
  }

  return (
    <AppShell currentPage="mcp">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <Overline>MCP server · Pro</Overline>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
            Design systems, inside your agent
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            The Design Contracts MCP server puts every scanned system — and your own
            authored contracts — one tool call away in Claude Code, Claude Desktop,
            Cursor and any MCP-compatible client. Ask for a site&apos;s tokens mid-build
            and the agent answers with the real system, not a guess.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0 space-y-8">
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Tools
                </p>
                <div className="overflow-hidden rounded-2xl border border-[color:var(--soft-border)]">
                  {TOOLS.map((tool, index) => (
                    <div
                      key={tool.name}
                      className={cn(
                        'flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4',
                        index > 0 && 'border-t border-border/40'
                      )}
                    >
                      <code className="w-44 shrink-0 font-mono text-[13px] text-[var(--ui-accent)]">
                        {tool.name}
                      </code>
                      <p className="flex-1 text-sm text-muted-foreground">{tool.description}</p>
                      <span
                        className={cn(
                          'shrink-0 rounded-full border px-2 py-px font-mono text-[10px]',
                          tool.auth === 'public'
                            ? 'border-border/60 text-muted-foreground'
                            : 'border-[color-mix(in_oklab,var(--ui-accent)_40%,transparent)] text-[var(--ui-accent)]'
                        )}
                      >
                        {tool.auth}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Client config · Claude Desktop / Claude Code / Cursor
                  </p>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="gap-1 font-mono"
                    onClick={() => copy('mcp-config', snippet)}
                  >
                    {copiedKey === 'mcp-config' ? (
                      <CheckIcon className="size-3" />
                    ) : (
                      <CopyIcon className="size-3" />
                    )}
                    copy
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5 font-mono text-[12px] leading-relaxed text-foreground/90">
                  {snippet}
                </pre>
              </div>

              <div className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5">
                <p className="text-sm font-medium text-foreground">How agents use it</p>
                <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <span className="font-mono text-[11px] text-muted-foreground/70">01 </span>
                    You ask: &ldquo;build this dashboard in stripe.com&apos;s design language.&rdquo;
                  </li>
                  <li>
                    <span className="font-mono text-[11px] text-muted-foreground/70">02 </span>
                    The agent calls <code className="font-mono text-xs">get_tokens</code> and{' '}
                    <code className="font-mono text-xs">layout_profile</code>.
                  </li>
                  <li>
                    <span className="font-mono text-[11px] text-muted-foreground/70">03 </span>
                    It builds with the site&apos;s real palette, scale and grid — and{' '}
                    <code className="font-mono text-xs">compose_pack</code> pins the contract
                    into your repo so it stays true over time.
                  </li>
                </ol>
              </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-2xl border border-[color-mix(in_oklab,var(--ui-accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--ui-accent)_5%,transparent)] p-5">
                <div className="flex items-center gap-2">
                  <KeyIcon className="size-4 text-[var(--ui-accent)]" />
                  <p className="text-sm font-medium text-foreground">API key</p>
                  <span className="ml-auto rounded-full border border-[color-mix(in_oklab,var(--ui-accent)_40%,transparent)] px-2 py-px font-mono text-[10px] text-[var(--ui-accent)]">
                    Pro
                  </span>
                </div>
                {isPro ? (
                  <div className="mt-4 space-y-3">
                    {apiKey ? (
                      <button
                        type="button"
                        onClick={() => copy('api-key', apiKey)}
                        className="flex w-full items-center gap-2 rounded-lg border border-[color:var(--soft-border)] bg-background/60 px-3 py-2 text-left font-mono text-[11px] text-foreground"
                        title="Copy API key"
                      >
                        <span className="truncate">{apiKey}</span>
                        {copiedKey === 'api-key' ? (
                          <CheckIcon className="ml-auto size-3 shrink-0 text-[var(--ui-accent)]" />
                        ) : (
                          <CopyIcon className="ml-auto size-3 shrink-0 opacity-60" />
                        )}
                      </button>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Generate a key and drop it into the config on the left.
                      </p>
                    )}
                    <Button size="sm" className="w-full gap-2" onClick={generateKey}>
                      <PlugsIcon className="size-3.5" />
                      {apiKey ? 'Rotate key' : 'Generate API key'}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      The MCP server ships with Pro. Public read tools stay free —
                      scanning, research and pack composition need a key.
                    </p>
                    <Button asChild size="sm" className="w-full gap-2">
                      <Link href="/pricing">
                        <SparkleIcon className="size-3.5" />
                        Upgrade to Pro
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5">
                <div className="flex items-center gap-2">
                  <LockIcon className="size-3.5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Rate limits</p>
                </div>
                <dl className="mt-3 space-y-1.5 font-mono text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>get_tokens</dt>
                    <dd>60 req/min</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>layout_profile</dt>
                    <dd>30 req/min</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>scan_tokens</dt>
                    <dd>10 req/min</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
