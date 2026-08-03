'use client'

import { useState } from 'react'
import {
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  PackageIcon,
  SparkleIcon,
  TerminalIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SectionShell, downloadText, useCopy } from './shared'

type Doc = { id: string; label: string; fileName: string; markdown: string; subtitle: string }

export function ArtifactsSection({
  domain,
  designMd,
  designSkill,
  installCommand,
  packFileCount,
  onExportTokens,
  graph,
}: {
  domain: string
  designMd: { markdown: string; fileName: string } | null
  designSkill: { markdown: string; fileName?: string; skillName: string; description: string } | null
  installCommand: string | null
  packFileCount: number | null
  onExportTokens: (format: 'json' | 'css') => void
  graph: unknown | null
}) {
  const { copiedKey, copy } = useCopy()

  const docs: Doc[] = []
  if (designMd) {
    docs.push({
      id: 'design-md',
      label: 'DESIGN.md',
      fileName: designMd.fileName,
      markdown: designMd.markdown,
      subtitle: 'Product grammar + token front matter. Drop at project root.',
    })
  }
  if (designSkill) {
    docs.push({
      id: 'skill',
      label: designSkill.skillName || 'SKILL.md',
      fileName: designSkill.fileName || 'SKILL.md',
      markdown: designSkill.markdown,
      subtitle: designSkill.description,
    })
  }
  const [activeDoc, setActiveDoc] = useState(0)
  const doc = docs[activeDoc] ?? null

  return (
    <SectionShell
      id="files"
      overline="Artifacts"
      title="Take the system with you"
      lede="Everything the scan produced, ready for agents: the installable pack, the grammar, the skill, the graph and raw tokens."
    >
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[color:var(--soft-border)] bg-card/50 p-5">
            <div className="flex items-center gap-2">
              <PackageIcon className="size-4 text-[var(--ui-accent)]" />
              <p className="text-sm font-medium text-foreground">Design Contract pack</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              ZIP with DESIGN.md, AGENTS.md, skills, references and config
              {packFileCount ? ` — ${packFileCount} files` : ''}.
            </p>
            <Button
              size="sm"
              className="mt-4 w-full gap-2"
              onClick={() => {
                window.location.href = `/api/contracts/download?domain=${encodeURIComponent(domain)}`
              }}
            >
              <DownloadSimpleIcon data-icon="inline-start" className="size-3.5" />
              Download ZIP
            </Button>
            {installCommand ? (
              <button
                type="button"
                onClick={() => copy('install', installCommand)}
                className="mt-2 flex w-full items-center gap-2 rounded-lg border border-[color:var(--soft-border)] bg-background/60 px-3 py-2 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                title="Copy install command"
              >
                <TerminalIcon className="size-3.5 shrink-0" />
                <span className="truncate">
                  {copiedKey === 'install' ? 'copied to clipboard' : installCommand}
                </span>
                {copiedKey === 'install' ? (
                  <CheckIcon className="ml-auto size-3 shrink-0 text-[var(--ui-accent)]" />
                ) : (
                  <CopyIcon className="ml-auto size-3 shrink-0 opacity-60" />
                )}
              </button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            {[
              {
                label: 'tokens.json',
                hint: 'W3C design tokens',
                onClick: () => onExportTokens('json'),
              },
              {
                label: 'tokens.css',
                hint: 'CSS custom properties',
                onClick: () => onExportTokens('css'),
              },
              ...(graph
                ? [
                    {
                      label: 'graph.json',
                      hint: 'semantic design graph',
                      onClick: () =>
                        downloadText(
                          `${domain}-graph.json`,
                          JSON.stringify(graph, null, 2),
                          'application/json'
                        ),
                    },
                  ]
                : []),
              ...docs.map((docEntry) => ({
                label: docEntry.fileName,
                hint: docEntry.label === 'DESIGN.md' ? 'grammar for agents' : 'agent skill',
                onClick: () => downloadText(docEntry.fileName, docEntry.markdown),
              })),
            ].map((file) => (
              <button
                key={file.label}
                type="button"
                onClick={file.onClick}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:border-[color:var(--soft-border)] hover:bg-card/50"
              >
                <span className="flex items-center gap-2.5">
                  <FileTextIcon className="size-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs text-foreground">{file.label}</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {file.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {doc ? (
          <div className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--soft-border)] bg-card/40">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-2.5">
              <div className="flex items-center gap-1">
                {docs.map((docEntry, index) => (
                  <button
                    key={docEntry.id}
                    type="button"
                    onClick={() => setActiveDoc(index)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors',
                      index === activeDoc
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {docEntry.id === 'skill' ? (
                      <SparkleIcon className="size-3" />
                    ) : (
                      <FileTextIcon className="size-3" />
                    )}
                    {docEntry.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="ghost"
                  className="gap-1 font-mono"
                  onClick={() => copy(`doc-${doc.id}`, doc.markdown)}
                >
                  {copiedKey === `doc-${doc.id}` ? (
                    <CheckIcon className="size-3" />
                  ) : (
                    <CopyIcon className="size-3" />
                  )}
                  copy
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  className="gap-1 font-mono"
                  onClick={() => downloadText(doc.fileName, doc.markdown)}
                >
                  <DownloadSimpleIcon data-icon="inline-start" className="size-3" />
                  download
                </Button>
              </div>
            </div>
            <p className="border-b border-border/40 px-4 py-2 text-xs text-muted-foreground">
              {doc.subtitle}
            </p>
            <pre className="max-h-[560px] overflow-auto p-5 font-mono text-[11.5px] leading-relaxed text-foreground/90">
              {doc.markdown}
            </pre>
          </div>

          {/* Embeddable card — README-ready */}
          <div className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Embed this contract</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  A live SVG card for READMEs and docs — palette, token count and a link
                  back to this dossier. Updates automatically on each scan.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    copy(
                      'embed-md',
                      `[![${domain} design system](https://designcontracts.sh/api/badge/${domain})](https://designcontracts.sh/site/${domain})`
                    )
                  }
                  className="mt-3 flex w-full max-w-md items-center gap-2 rounded-lg border border-[color:var(--soft-border)] bg-background/60 px-3 py-2 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy Markdown embed"
                >
                  <span className="truncate">
                    {copiedKey === 'embed-md'
                      ? 'copied to clipboard'
                      : `[![${domain}](…/api/badge/${domain})](…/site/${domain})`}
                  </span>
                  {copiedKey === 'embed-md' ? (
                    <CheckIcon className="ml-auto size-3 shrink-0 text-[var(--ui-accent)]" />
                  ) : (
                    <CopyIcon className="ml-auto size-3 shrink-0 opacity-60" />
                  )}
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/badge/${encodeURIComponent(domain)}`}
                alt={`${domain} design system card`}
                width={360}
                height={120}
                className="rounded-xl"
                loading="lazy"
              />
            </div>
          </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 p-12 text-sm text-muted-foreground">
            No generated documents stored for this scan yet.
          </div>
        )}
      </div>
    </SectionShell>
  )
}
