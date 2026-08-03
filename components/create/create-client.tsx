'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwiseIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  ImageIcon,
  LockIcon,
  MagnifyingGlassIcon,
  PenNibIcon,
  SparkleIcon,
  StackIcon,
  SwapIcon,
  WrenchIcon,
} from '@/lib/phosphor'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Overline } from '@/components/dossier/shared'
import { useEntitlements } from '@/lib/premium'
import { cn } from '@/lib/utils'

type Tab = 'brief' | 'recipes' | 'import' | 'blend' | 'restyle' | 'mutate' | 'scan'

type RecipeMeta = {
  id: string
  label: string
  blurb: string
  profile: string
  appType: string
}

async function downloadZip(response: Response, fallbackName: string) {
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = match?.[1] || fallbackName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(href)
}

export default function CreateClient() {
  const { isPro, ready, appPackCredits } = useEntitlements()
  const [tab, setTab] = useState<Tab>('brief')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const [brief, setBrief] = useState(
    'A dense dark ops workbench for infrastructure teams — teal accents, IBM Plex, 4px grid, sharp corners.'
  )
  const [briefName, setBriefName] = useState('Ops Workbench')

  const [recipes, setRecipes] = useState<RecipeMeta[]>([])
  const [recipeId, setRecipeId] = useState('saas-workbench')
  const [recipeName, setRecipeName] = useState('')

  const [importText, setImportText] = useState('')
  const [importName, setImportName] = useState('')
  const [importFormat, setImportFormat] = useState<
    'auto' | 'dtcg' | 'design-md' | 'css' | 'tailwind'
  >('auto')

  const [blendDomains, setBlendDomains] = useState('stripe.com, linear.app')
  const [blendName, setBlendName] = useState('')

  const [structureDomain, setStructureDomain] = useState('stripe.com')
  const [skinDomain, setSkinDomain] = useState('linear.app')
  const [restyleName, setRestyleName] = useState('')

  const [mutateOp, setMutateOp] = useState<'contrast-fix' | 'polarity' | 'evolve'>(
    'contrast-fix'
  )
  const [mutateDomain, setMutateDomain] = useState('example.com')
  const [mutateTarget, setMutateTarget] = useState<'AA' | 'AAA'>('AA')
  const [mutateDirective, setMutateDirective] = useState(
    'Make it denser and sharper with a terminal ops feel'
  )

  useEffect(() => {
    void fetch('/api/contracts/from-recipe')
      .then((response) => response.json())
      .then((data: { recipes?: RecipeMeta[] }) => {
        if (Array.isArray(data.recipes) && data.recipes.length) {
          setRecipes(data.recipes)
          setRecipeId(data.recipes[0].id)
        }
      })
      .catch(() => {
        /* offline Create still works with hardcoded ids */
      })
  }, [])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof SparkleIcon }> = [
    { id: 'brief', label: 'Brief', icon: SparkleIcon },
    { id: 'recipes', label: 'Recipes', icon: StackIcon },
    { id: 'import', label: 'Import', icon: FileTextIcon },
    { id: 'blend', label: 'Blend', icon: ArrowsClockwiseIcon },
    { id: 'restyle', label: 'Restyle', icon: SwapIcon },
    { id: 'mutate', label: 'Mutate', icon: WrenchIcon },
    { id: 'scan', label: 'Scan', icon: MagnifyingGlassIcon },
  ]

  return (
    <AppShell currentPage="create">
      <PageCanvas>
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Overline>Create · advanced generators</Overline>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground">
            Generate a Design Contract
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Production paths into the same installable pack grammar — scan, vision
            App Pack, Studio, NL brief, industry recipes, import, blend, structure×skin
            restyle, and directed mutations (contrast / polarity / evolve).
          </p>

          <div className="mt-8 flex flex-wrap gap-1 rounded-xl border border-[color:var(--soft-border)] bg-secondary/30 p-1">
            {tabs.map((entry) => {
              const Icon = entry.icon
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] transition-colors sm:text-xs',
                    tab === entry.id
                      ? 'bg-[var(--ui-paper)] text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                  {entry.label}
                </button>
              )
            })}
          </div>

          {error ? (
            <p className="mt-4 text-sm text-[var(--ui-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          {note ? (
            <p className="mt-4 text-sm text-[var(--ui-success)]" role="status">
              {note}
            </p>
          ) : null}

          <div className="mt-8 space-y-6">
            {tab === 'brief' ? (
              <section className="space-y-4" data-testid="create-brief">
                <p className="text-sm text-muted-foreground">
                  Describe product personality, density, and materials. We synthesize
                  a full Studio system and ZIP pack.
                  {!isPro && ready ? ' Pro required.' : null}
                </p>
                <Input
                  value={briefName}
                  onChange={(event) => setBriefName(event.target.value)}
                  placeholder="System name"
                  className="rounded-xl"
                />
                <textarea
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-[color:var(--soft-border)] bg-card/40 px-3 py-2 text-sm leading-relaxed text-foreground"
                />
                <Button
                  disabled={busy || !isPro}
                  className="gap-2"
                  data-testid="create-brief-submit"
                  onClick={() =>
                    void run(async () => {
                      const response = await fetch('/api/contracts/from-brief', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ brief, name: briefName || undefined }),
                      })
                      if (!response.ok) {
                        const data = (await response.json().catch(() => null)) as {
                          error?: string
                        } | null
                        throw new Error(data?.error || `Brief failed (${response.status})`)
                      }
                      await downloadZip(response, 'brief-design-contract.zip')
                      setNote('Pack downloaded — install with the emitted npx command.')
                    })
                  }
                >
                  {isPro ? (
                    <DownloadSimpleIcon className="size-3.5" />
                  ) : (
                    <LockIcon className="size-3.5" />
                  )}
                  {busy ? 'Generating…' : 'Generate pack ZIP'}
                </Button>
              </section>
            ) : null}

            {tab === 'recipes' ? (
              <section className="space-y-4" data-testid="create-recipes">
                <p className="text-sm text-muted-foreground">
                  Start from an industry recipe with the correct engine{' '}
                  <span className="font-mono text-[12px]">--profile</span> /{' '}
                  <span className="font-mono text-[12px]">--app-type</span>. Free —
                  deterministic, no scan required.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(recipes.length
                    ? recipes
                    : [
                        {
                          id: 'saas-workbench',
                          label: 'SaaS workbench',
                          blurb: 'Dense product chrome',
                          profile: 'web-app',
                          appType: 'saas-workbench',
                        },
                      ]
                  ).map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => setRecipeId(recipe.id)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-colors',
                        recipeId === recipe.id
                          ? 'border-[var(--ui-accent)] bg-card/60'
                          : 'border-[color:var(--soft-border)] bg-card/30 hover:bg-[var(--ui-paper-hover)]'
                      )}
                      data-testid={`create-recipe-${recipe.id}`}
                    >
                      <p className="text-sm font-medium text-foreground">{recipe.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{recipe.blurb}</p>
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                        {recipe.profile} · {recipe.appType}
                      </p>
                    </button>
                  ))}
                </div>
                <Input
                  value={recipeName}
                  onChange={(event) => setRecipeName(event.target.value)}
                  placeholder="Optional rename"
                  className="rounded-xl"
                />
                <Button
                  disabled={busy}
                  className="gap-2"
                  data-testid="create-recipe-submit"
                  onClick={() =>
                    void run(async () => {
                      const response = await fetch('/api/contracts/from-recipe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recipeId,
                          name: recipeName || undefined,
                        }),
                      })
                      if (!response.ok) {
                        const data = (await response.json().catch(() => null)) as {
                          error?: string
                        } | null
                        throw new Error(data?.error || `Recipe failed (${response.status})`)
                      }
                      await downloadZip(response, 'recipe-design-contract.zip')
                      setNote('Recipe pack downloaded.')
                    })
                  }
                >
                  <StackIcon className="size-3.5" />
                  {busy ? 'Building…' : 'Recipe → pack ZIP'}
                </Button>
              </section>
            ) : null}

            {tab === 'import' ? (
              <section className="space-y-4" data-testid="create-import">
                <p className="text-sm text-muted-foreground">
                  Paste W3C tokens.json, DESIGN.md, CSS variables, or a Tailwind theme
                  snippet. Pro unlocks pack export.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['auto', 'dtcg', 'design-md', 'css', 'tailwind'] as const).map(
                    (format) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => setImportFormat(format)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 font-mono text-[11px]',
                          importFormat === format
                            ? 'border-[var(--ui-accent)] text-[var(--ui-accent)]'
                            : 'border-[color:var(--soft-border)] text-muted-foreground'
                        )}
                      >
                        {format}
                      </button>
                    )
                  )}
                </div>
                <Input
                  value={importName}
                  onChange={(event) => setImportName(event.target.value)}
                  placeholder="Optional system name"
                  className="rounded-xl"
                />
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  rows={10}
                  placeholder='{ "$metadata": { "name": "Acme" }, "color": { "primary": { "$value": "#2563eb" } } }'
                  className="w-full rounded-xl border border-[color:var(--soft-border)] bg-card/40 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground"
                  data-testid="create-import-input"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="file"
                    accept=".json,.md,.css,.js,.ts,.cjs,.mjs,text/plain"
                    className="text-xs"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      void file.text().then((text) => {
                        setImportText(text)
                        if (!importName) {
                          setImportName(file.name.replace(/\.[^.]+$/, ''))
                        }
                      })
                    }}
                  />
                  or choose a file
                </label>
                <Button
                  disabled={busy || !isPro || importText.trim().length < 8}
                  className="gap-2"
                  data-testid="create-import-submit"
                  onClick={() =>
                    void run(async () => {
                      const response = await fetch('/api/contracts/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          content: importText,
                          format: importFormat,
                          name: importName || undefined,
                        }),
                      })
                      if (!response.ok) {
                        const data = (await response.json().catch(() => null)) as {
                          error?: string
                        } | null
                        throw new Error(data?.error || `Import failed (${response.status})`)
                      }
                      await downloadZip(response, 'imported-design-contract.zip')
                      setNote('Imported pack downloaded.')
                    })
                  }
                >
                  {isPro ? (
                    <FileTextIcon className="size-3.5" />
                  ) : (
                    <LockIcon className="size-3.5" />
                  )}
                  {busy ? 'Importing…' : 'Import → pack ZIP'}
                </Button>
              </section>
            ) : null}

            {tab === 'blend' ? (
              <section className="space-y-4" data-testid="create-blend">
                <p className="text-sm text-muted-foreground">
                  Merge 2–10 already-scanned domains into one coherent system and
                  download the installable ZIP. Free — scan sources first.
                </p>
                <Input
                  value={blendDomains}
                  onChange={(event) => setBlendDomains(event.target.value)}
                  placeholder="stripe.com, linear.app, vercel.com"
                  className="rounded-xl"
                  data-testid="create-blend-domains"
                />
                <Input
                  value={blendName}
                  onChange={(event) => setBlendName(event.target.value)}
                  placeholder="Optional blend name"
                  className="rounded-xl"
                />
                <Button
                  disabled={busy}
                  className="gap-2"
                  data-testid="create-blend-submit"
                  onClick={() =>
                    void run(async () => {
                      const domains = blendDomains
                        .split(/[\s,]+/)
                        .map((entry) => entry.trim())
                        .filter(Boolean)
                      const response = await fetch('/api/contracts/blend', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          domains,
                          name: blendName || undefined,
                          saveToLibrary: true,
                        }),
                      })
                      if (!response.ok) {
                        const data = (await response.json().catch(() => null)) as {
                          error?: string
                          missing?: string[]
                        } | null
                        throw new Error(
                          data?.error ||
                            (data?.missing?.length
                              ? `Scan missing: ${data.missing.join(', ')}`
                              : `Blend failed (${response.status})`)
                        )
                      }
                      await downloadZip(response, 'blend-design-contract.zip')
                      setNote('Blend pack downloaded and saved to the Library.')
                    })
                  }
                >
                  <ArrowsClockwiseIcon className="size-3.5" />
                  {busy ? 'Blending…' : 'Blend → pack ZIP'}
                </Button>
              </section>
            ) : null}

            {tab === 'restyle' ? (
              <section className="space-y-4" data-testid="create-restyle">
                <p className="text-sm text-muted-foreground">
                  Keep one site&apos;s page structure; apply another&apos;s skin. Emits a
                  pack with detected{' '}
                  <span className="font-mono text-[12px]">--profile</span> /{' '}
                  <span className="font-mono text-[12px]">--app-type</span>.
                  {!isPro && ready ? ' Pro required.' : null}
                </p>
                <Input
                  value={structureDomain}
                  onChange={(event) => setStructureDomain(event.target.value)}
                  placeholder="Structure domain (layout)"
                  className="rounded-xl"
                  data-testid="create-restyle-structure"
                />
                <Input
                  value={skinDomain}
                  onChange={(event) => setSkinDomain(event.target.value)}
                  placeholder="Skin domain (tokens)"
                  className="rounded-xl"
                  data-testid="create-restyle-skin"
                />
                <Input
                  value={restyleName}
                  onChange={(event) => setRestyleName(event.target.value)}
                  placeholder="Optional system name"
                  className="rounded-xl"
                />
                <Button
                  disabled={busy || !isPro}
                  className="gap-2"
                  data-testid="create-restyle-submit"
                  onClick={() =>
                    void run(async () => {
                      const response = await fetch('/api/contracts/restyle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          structureDomain,
                          skinDomain,
                          name: restyleName || undefined,
                        }),
                      })
                      if (!response.ok) {
                        const data = (await response.json().catch(() => null)) as {
                          error?: string
                          missing?: string[]
                        } | null
                        throw new Error(
                          data?.error ||
                            (data?.missing?.length
                              ? `Scan missing: ${data.missing.join(', ')}`
                              : `Restyle failed (${response.status})`)
                        )
                      }
                      await downloadZip(response, 'restyle-design-contract.zip')
                      setNote('Restyle pack downloaded.')
                    })
                  }
                >
                  {isPro ? (
                    <SwapIcon className="size-3.5" />
                  ) : (
                    <LockIcon className="size-3.5" />
                  )}
                  {busy ? 'Restyling…' : 'Restyle → pack ZIP'}
                </Button>
              </section>
            ) : null}

            {tab === 'mutate' ? (
              <section className="space-y-4" data-testid="create-mutate">
                <p className="text-sm text-muted-foreground">
                  Directed mutations on a scanned domain: WCAG contrast fix, light↔dark
                  polarity twin, or evolve with a short directive.
                  {!isPro && ready ? ' Pro required.' : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['contrast-fix', 'Contrast fix'],
                      ['polarity', 'Polarity'],
                      ['evolve', 'Evolve'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMutateOp(id)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs',
                        mutateOp === id
                          ? 'border-[var(--ui-accent)] text-[var(--ui-accent)]'
                          : 'border-[color:var(--soft-border)] text-muted-foreground'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Input
                  value={mutateDomain}
                  onChange={(event) => setMutateDomain(event.target.value)}
                  placeholder="Scanned domain"
                  className="rounded-xl"
                  data-testid="create-mutate-domain"
                />
                {mutateOp === 'contrast-fix' ? (
                  <div className="flex gap-2">
                    {(['AA', 'AAA'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setMutateTarget(level)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 font-mono text-[11px]',
                          mutateTarget === level
                            ? 'border-[var(--ui-accent)] text-[var(--ui-accent)]'
                            : 'border-[color:var(--soft-border)] text-muted-foreground'
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                ) : null}
                {mutateOp === 'evolve' ? (
                  <textarea
                    value={mutateDirective}
                    onChange={(event) => setMutateDirective(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[color:var(--soft-border)] bg-card/40 px-3 py-2 text-sm leading-relaxed text-foreground"
                    data-testid="create-mutate-directive"
                  />
                ) : null}
                <Button
                  disabled={busy || !isPro}
                  className="gap-2"
                  data-testid="create-mutate-submit"
                  onClick={() =>
                    void run(async () => {
                      const response = await fetch('/api/contracts/mutate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          op: mutateOp,
                          domain: mutateDomain,
                          target: mutateOp === 'contrast-fix' ? mutateTarget : undefined,
                          directive: mutateOp === 'evolve' ? mutateDirective : undefined,
                        }),
                      })
                      if (!response.ok) {
                        const data = (await response.json().catch(() => null)) as {
                          error?: string
                        } | null
                        throw new Error(data?.error || `Mutate failed (${response.status})`)
                      }
                      await downloadZip(response, 'mutated-design-contract.zip')
                      setNote('Mutated pack downloaded.')
                    })
                  }
                >
                  {isPro ? (
                    <WrenchIcon className="size-3.5" />
                  ) : (
                    <LockIcon className="size-3.5" />
                  )}
                  {busy ? 'Mutating…' : 'Mutate → pack ZIP'}
                </Button>
              </section>
            ) : null}

            {tab === 'scan' ? (
              <section className="space-y-4" data-testid="create-scan">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/?url="
                    className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5 transition-colors hover:bg-[var(--ui-paper-hover)]"
                  >
                    <MagnifyingGlassIcon className="size-5 text-[var(--ui-accent)]" />
                    <p className="mt-3 text-sm font-medium text-foreground">URL scan</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Free public CSS → installable pack. Open Chat and paste a domain.
                    </p>
                  </Link>
                  <Link
                    href="/?hint=app"
                    className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5 transition-colors hover:bg-[var(--ui-paper-hover)]"
                  >
                    <ImageIcon className="size-5 text-[var(--ui-accent)]" />
                    <p className="mt-3 text-sm font-medium text-foreground">
                      App Pack ({appPackCredits} credits)
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Attach ≥5 product UI screenshots in Chat. Credits never expire.
                    </p>
                  </Link>
                  <Link
                    href="/studio"
                    className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5 transition-colors hover:bg-[var(--ui-paper-hover)]"
                  >
                    <PenNibIcon className="size-5 text-[var(--ui-accent)]" />
                    <p className="mt-3 text-sm font-medium text-foreground">Studio</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hand-author tokens and export a full pack ZIP (Pro). Canvas also
                      exports packs.
                    </p>
                  </Link>
                  <Link
                    href="/community"
                    className="rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5 transition-colors hover:bg-[var(--ui-paper-hover)]"
                  >
                    <SparkleIcon className="size-5 text-[var(--ui-accent)]" />
                    <p className="mt-3 text-sm font-medium text-foreground">
                      Fork from Library
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Continue or fork a community system into your canvas, then export.
                    </p>
                  </Link>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </PageCanvas>
    </AppShell>
  )
}
