'use client'

import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type UIMessage,
} from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DesignCanvas } from '@/components/canvas/design-canvas'
import { useCanvasStore } from '@/stores/canvas-store'
import { extractCanvasDirectives } from '@/lib/design-system/canvas-sync'
import {
  expandForSend,
  matchSlashCommands,
  parseSlashCommand,
  type SlashCommand,
} from '@/lib/chat/slash-commands'
import type { WorkingSystem } from '@/lib/design-system/working-system'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { InputGroupAddon } from '@/components/ui/input-group'
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
} from '@/components/ui/bubble'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
import {
  CheckIcon,
  CircleNotchIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  WarningCircleIcon,
} from '@/lib/phosphor'
import {
  ScanResultWidget,
  asScanWidgetPayload,
  isScanResultToolName,
} from '@/components/molecules/scan-result-widget'
import type { DesignContractAgentUIMessage } from '@/lib/agent/design-contract-agent'
import { trackClientEvent } from '@/lib/analytics/track-client'
import { createChatId, loadChat, saveChat } from '@/lib/chat-history'
import { pushRecent } from '@/lib/recents'
import { cn } from '@/lib/utils'

const EXAMPLES = [
  { label: 'stripe.com', prompt: 'Scan stripe.com and install the Design Contract' },
  { label: 'linear.app', prompt: 'Pull the design system from linear.app' },
  { label: 'vercel.com', prompt: 'Scan vercel.com and summarize the Design Contract' },
  { label: 'cursor.com', prompt: 'Scan cursor.com and summarize the Design Contract' },
] as const

const CAPABILITIES = [
  { label: 'Critique a system', prompt: "Critique stripe.com's design system — how consistent is it?" },
  { label: 'Compare two sites', prompt: 'Compare the design systems of linear.app and vercel.com' },
  { label: 'Theme CSS', prompt: 'Generate a Tailwind theme from cursor.com' },
  { label: 'Check contrast', prompt: 'Check the contrast of #ffffff text on #c08a5f' },
  { label: 'Find similar', prompt: 'Find sites in the library with a design system similar to stripe.com' },
  { label: 'Blend systems', prompt: 'Blend stripe.com, linear.app and vercel.com into one design system for me' },
  { label: 'Restyle a page', prompt: "Rebuild vercel.com's page structure in stripe.com's design system" },
] as const

const TOOL_LABELS: Record<string, string> = {
  scan_site: 'Scanning site',
  get_tokens: 'Reading cached contract',
  get_design_md: 'Reading DESIGN.md',
  resolve_graph: 'Walking the semantic graph',
  get_contract_download: 'Fetching contract pack',
  critique_design: 'Design critique',
  compare_systems: 'Comparing systems',
  generate_theme_css: 'Generating theme CSS',
  compose_design_artifacts: 'Composing design artifacts',
  blend_systems: 'Blending systems',
  restyle_page: 'Composing rebuild guide',
  find_similar_systems: 'Searching the Library',
  check_contrast: 'Checking contrast',
}

function partText(part: UIMessage['parts'][number]): string {
  if (part.type === 'text' && 'text' in part) return String(part.text || '')
  return ''
}

function ToolPart({ part }: { part: UIMessage['parts'][number] }) {
  if (!isToolUIPart(part)) return null

  const name = getToolName(part)
  const state = part.state
  const output = 'output' in part ? part.output : undefined
  const input = 'input' in part ? part.input : undefined
  const errorText = 'errorText' in part ? part.errorText : undefined

  const inputDomain =
    input && typeof input === 'object'
      ? String(
          ('url' in input && (input as { url?: string }).url) ||
            ('domain' in input && (input as { domain?: string }).domain) ||
            ''
        )
      : ''

  if (isScanResultToolName(name)) {
    const payload =
      asScanWidgetPayload(output) ||
      ({
        domain: inputDomain.replace(/^https?:\/\//, '').split('/')[0] || undefined,
      } as const)
    return <ScanResultWidget data={payload} state={state} className="mt-1" />
  }

  // Non-scan tools render as quiet conversation markers — click to inspect.
  // File-bearing results (DESIGN.md, themes, briefs) get real document cards.
  const files = state === 'output-available' ? extractFiles(output) : []
  return (
    <div className="flex flex-col">
      <ToolMarker
        label={TOOL_LABELS[name] ?? name}
        detail={inputDomain || undefined}
        state={state}
        input={input}
        output={files.length > 0 ? undefined : output}
        errorText={errorText}
      />
      {files.map((file, index) => (
        <FileCard key={`${file.name}-${index}`} file={file} defaultOpen={index === 0} />
      ))}
    </div>
  )
}

function ToolMarker({
  label,
  detail,
  state,
  input,
  output,
  errorText,
}: {
  label: string
  detail?: string
  state: string
  input?: unknown
  output?: unknown
  errorText?: string
}) {
  const [open, setOpen] = useState(false)
  const running = state === 'input-streaming' || state === 'input-available'
  const failed = state === 'output-error'

  return (
    <div className="mt-0.5 flex flex-col">
      <Marker
        role={running ? 'status' : undefined}
        render={<button type="button" onClick={() => setOpen((value) => !value)} />}
        aria-expanded={open}
      >
        <MarkerIcon>
          {running ? (
            <CircleNotchIcon className="animate-spin" />
          ) : failed ? (
            <WarningCircleIcon className="text-[var(--ui-danger)]" />
          ) : (
            <CheckIcon className="text-[var(--ui-success)]" />
          )}
        </MarkerIcon>
        <MarkerContent className={cn(running && 'shimmer')}>
          {running ? `${label}…` : label}
        </MarkerContent>
        {detail ? (
          <span className="truncate font-mono text-[11px] text-[var(--ui-ink-muted)]">
            {detail.replace(/^https?:\/\//, '')}
          </span>
        ) : null}
      </Marker>

      {open ? (
        <div className="mb-1 ml-6 mt-1 overflow-hidden rounded-[10px] border border-[var(--ui-border-soft)] bg-[var(--ui-paper-subtle)]">
          {errorText ? (
            <p className="px-3 py-2 text-[13px] text-[var(--ui-danger)]">{errorText}</p>
          ) : (
            <pre className="max-h-64 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--ui-ink-secondary)]">
              {output !== undefined
                ? typeof output === 'string'
                  ? output
                  : JSON.stringify(output, null, 2).slice(0, 2000)
                : input !== undefined
                  ? JSON.stringify(input, null, 2).slice(0, 800)
                  : 'No output yet.'}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  )
}

type ChatFile = { name: string; content: string }

/** Pull renderable file artifacts out of a tool result. */
function extractFiles(output: unknown): ChatFile[] {
  if (!output || typeof output !== 'object') return []
  const record = output as Record<string, unknown>
  const files: ChatFile[] = []
  const push = (name: unknown, content: unknown) => {
    if (typeof content === 'string' && content.trim().length > 0) {
      files.push({ name: typeof name === 'string' && name ? name : 'file.md', content })
    }
  }

  // get_design_md → { fileName, markdown, skill? }
  if (typeof record.markdown === 'string') push(record.fileName ?? 'DESIGN.md', record.markdown)
  const skill = record.skill as { fileName?: string; markdown?: string } | undefined
  if (skill && typeof skill.markdown === 'string') push(skill.fileName ?? 'SKILL.md', skill.markdown)
  // compose_design_artifacts / blend_systems → { designMd, tailwindTheme, cssTokens }
  if (typeof record.designMd === 'string') push('DESIGN.md', record.designMd)
  if (typeof record.tailwindTheme === 'string') push('theme.tailwind.css', record.tailwindTheme)
  if (typeof record.cssTokens === 'string') push('tokens.css', record.cssTokens)
  // generate_theme_css → { css, tailwind }
  if (typeof record.css === 'string' && record.roles) push('tokens.css', record.css)
  if (typeof record.tailwind === 'string') push('theme.tailwind.css', record.tailwind)
  // restyle_page → { brief }
  if (typeof record.brief === 'string') push('REBUILD.md', record.brief)
  return files
}

/** In-chat document card: file name header, scrollable body, copy + download. */
function FileCard({ file, defaultOpen }: { file: ChatFile; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-1 overflow-hidden rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)]">
      <div className="flex items-center gap-2 border-b border-[var(--ui-border-soft)] px-3 py-2">
        <FileTextIcon className="size-4 shrink-0 text-[var(--ui-accent)]" />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 truncate text-left font-mono text-[12px] font-medium text-[var(--ui-ink)]"
          aria-expanded={open}
          title={open ? 'Collapse' : 'Expand'}
        >
          {file.name}
        </button>
        <span className="font-mono text-[10px] text-[var(--ui-ink-muted)]">
          {(file.content.length / 1024).toFixed(1)}kb
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(file.content).catch(() => {})
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1400)
          }}
          aria-label={`Copy ${file.name}`}
          className="inline-flex size-6 items-center justify-center rounded-[6px] text-[var(--ui-ink-muted)] transition-colors hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-[var(--ui-success)]" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = file.name
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            URL.revokeObjectURL(url)
          }}
          aria-label={`Download ${file.name}`}
          className="inline-flex size-6 items-center justify-center rounded-[6px] text-[var(--ui-ink-muted)] transition-colors hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]"
        >
          <DownloadSimpleIcon className="size-3.5" />
        </button>
      </div>
      {open ? (
        <pre className="max-h-80 overflow-auto px-4 py-3 font-mono text-[11.5px] leading-relaxed text-[var(--ui-ink-secondary)]">
          {file.content.length > 24000
            ? `${file.content.slice(0, 24000)}\n… (${file.content.length.toLocaleString()} chars — download for the rest)`
            : file.content}
        </pre>
      ) : null}
    </div>
  )
}

/** Quiet footer actions for the latest assistant turn. */
function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null
  return (
    <div className="-ml-1 flex items-center gap-1 opacity-60 transition-opacity hover:opacity-100">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(text).catch(() => {})
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1400)
        }}
        aria-label="Copy response"
        title="Copy response"
        className="inline-flex size-7 items-center justify-center rounded-[7px] text-[var(--ui-ink-muted)] transition-colors hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]"
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-[var(--ui-success)]" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </div>
  )
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void
  disabled?: boolean
}) {
  return (
    <div className="mx-auto flex w-full max-w-[712px] flex-1 flex-col items-center justify-center px-1 pb-10 pt-14 animate-fade-in">
      <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-normal leading-[1.15] tracking-[-0.04em] text-[var(--ui-ink)]">
        designcontracts
        <span className="text-[var(--ui-accent)]">.sh</span>
      </h1>
      <p className="mt-3 max-w-sm text-center text-[15px] leading-relaxed text-[var(--ui-ink-secondary)]">
        Paste a URL. Get an installable Design Contract.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5">
        {EXAMPLES.map((example, index) => (
          <button
            key={example.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(example.prompt)}
            className={cn(
              'h-8 rounded-[var(--radius-md)] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] px-2.5 text-[13px] text-[var(--ui-ink-secondary)] transition',
              'hover:border-[var(--ui-border-edge)] hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)] disabled:opacity-50',
              'animate-slide-in'
            )}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {CAPABILITIES.map((capability) => (
          <button
            key={capability.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(capability.prompt)}
            className="text-[13px] text-[var(--ui-ink-muted)] underline-offset-4 transition-colors hover:text-[var(--ui-ink)] hover:underline disabled:opacity-50"
          >
            {capability.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ScanChat() {
  const searchParams = useSearchParams()
  const startedUrl = useRef<string | null>(null)
  const [text, setText] = useState('')

  // Stable conversation id — restored from ?chat=, minted otherwise.
  const [chatId] = useState(() => searchParams.get('chat') || createChatId())
  const [initialMessages] = useState(() => {
    const fromStore = searchParams.get('chat') ? loadChat(chatId) : null
    return (fromStore ?? []) as DesignContractAgentUIMessage[]
  })

  const { messages, sendMessage, status, error, stop } = useChat<DesignContractAgentUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/agent/chat' }),
  })

  // Persist the transcript for the sidebar's recent chats once a turn settles.
  useEffect(() => {
    if (messages.length === 0 || status === 'streaming' || status === 'submitted') return
    saveChat(chatId, messages)
    const url = new URL(window.location.href)
    if (url.searchParams.get('chat') !== chatId) {
      url.searchParams.set('chat', chatId)
      window.history.replaceState(null, '', url.toString())
    }
  }, [messages, status, chatId])

  const busy = status === 'submitted' || status === 'streaming'
  const hasMessages = messages.length > 0 || Boolean(searchParams.get('url'))

  // --- Canvas ------------------------------------------------------------
  const canvasOpen = useCanvasStore((state) => state.open)
  const openCanvas = useCanvasStore((state) => state.openCanvas)
  const patchSystem = useCanvasStore((state) => state.patchSystem)
  const markSaved = useCanvasStore((state) => state.markSaved)
  const [savingSystem, setSavingSystem] = useState(false)
  const appliedDirectives = useRef<Set<string>>(new Set())
  const loadedSystemId = useRef<string | null>(null)

  // The agent drives the canvas through its tool results; each directive is
  // applied exactly once, in transcript order.
  const directives = useMemo(() => extractCanvasDirectives(messages), [messages])
  useEffect(() => {
    for (const directive of directives) {
      if (appliedDirectives.current.has(directive.id)) continue
      appliedDirectives.current.add(directive.id)
      if (directive.kind === 'open') openCanvas(directive.system)
      else patchSystem(directive.patch, directive.reason)
    }
  }, [directives, openCanvas, patchSystem])

  // "Continue editing" from the Library arrives as ?system=<id>.
  useEffect(() => {
    const systemId = searchParams.get('system')
    if (!systemId || loadedSystemId.current === systemId) return
    loadedSystemId.current = systemId
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(`/api/systems/${encodeURIComponent(systemId)}`)
        if (!response.ok) return
        const stored = (await response.json()) as { system?: WorkingSystem }
        if (!cancelled && stored.system) openCanvas(stored.system)
      } catch {
        // A missing or unreachable system just leaves the canvas closed.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, openCanvas])

  const onSaveSystem = async (system: WorkingSystem) => {
    setSavingSystem(true)
    try {
      const response = await fetch('/api/systems', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: system.id ?? undefined, system, visibility: 'public' }),
      })
      if (!response.ok) return
      const stored = (await response.json()) as { id?: string }
      if (stored.id) {
        markSaved(stored.id)
        trackClientEvent('system_saved')
      }
    } finally {
      setSavingSystem(false)
    }
  }

  useEffect(() => {
    const raw = searchParams.get('url')?.trim()
    if (!raw || startedUrl.current === raw || messages.length > 0 || busy) return
    startedUrl.current = raw
    const domain = raw
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
    if (!domain) return
    pushRecent(domain)
    void sendMessage({
      text: `Scan ${domain} and show me the Design Contract — summarize the system and how to install it.`,
    })
  }, [searchParams, messages.length, busy, sendMessage])

  // Slash commands are pure shorthand: they expand to a sentence the agent
  // already understands, so there is only ever one execution path.
  const slashMatches = useMemo(() => matchSlashCommands(text), [text])
  const [slashIndex, setSlashIndex] = useState(0)
  const activeSlash = slashMatches[Math.min(slashIndex, slashMatches.length - 1)] ?? null

  const send = (raw: string) => {
    const next = raw.trim()
    if (!next || busy) return
    setText('')
    setSlashIndex(0)
    trackClientEvent('chat_message')
    const outgoing = expandForSend(next)
    // Best-effort: if the message looks like a bare domain, stash it in Recents.
    const maybeDomain = (parseSlashCommand(next)?.args ?? next)
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split(/[\s/?#]/)[0]
    if (maybeDomain && /\./.test(maybeDomain) && !maybeDomain.includes(' ')) {
      pushRecent(maybeDomain)
    }
    void sendMessage({ text: outgoing })
  }

  const onSubmit = (message: PromptInputMessage) => {
    send(message.text ?? '')
  }

  /** Complete the highlighted command instead of sending a bare "/sc". */
  const completeSlash = (command: SlashCommand) => {
    setText(command.args ? `/${command.name} ` : `/${command.name}`)
    setSlashIndex(0)
  }

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMatches.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSlashIndex((index) => (index + 1) % slashMatches.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSlashIndex((index) => (index - 1 + slashMatches.length) % slashMatches.length)
    } else if (event.key === 'Tab' || (event.key === 'Enter' && activeSlash)) {
      // A command still being typed completes; it does not send half a command.
      event.preventDefault()
      if (activeSlash) completeSlash(activeSlash)
    } else if (event.key === 'Escape') {
      setSlashIndex(0)
      setText('')
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ui-paper)] lg:flex-row">
      <div
        className={cn(
          'relative z-10 flex min-h-0 flex-1 flex-col',
          // Canvas open: side by side on wide screens, stacked below on narrow
          // ones — the conversation never gets squeezed into a column.
          canvasOpen && 'lg:max-w-[560px] lg:border-r lg:border-[var(--ui-border-soft)]'
        )}
      >
        <Conversation className="min-h-0 flex-1">
          <ConversationContent
            className={cn(
              'mx-auto w-full max-w-[712px] gap-4 px-4 py-5 sm:px-6',
              !hasMessages && 'flex min-h-full flex-col'
            )}
          >
            {!hasMessages ? (
              <EmptyState
                disabled={busy}
                onPick={(prompt) => void sendMessage({ text: prompt })}
              />
            ) : null}

            {messages.map((message, messageIndex) => {
              const isLastAssistant =
                message.role === 'assistant' && messageIndex === messages.length - 1

              if (message.role === 'user') {
                return (
                  <Message from="user" key={message.id} className="animate-slide-in">
                    <BubbleGroup className="items-end">
                      {message.parts.map((part, index) => {
                        const content = partText(part)
                        if (!content) return null
                        return (
                          <Bubble
                            key={`${message.id}-t-${index}`}
                            variant="default"
                            align="end"
                          >
                            <BubbleContent>{content}</BubbleContent>
                          </Bubble>
                        )
                      })}
                    </BubbleGroup>
                  </Message>
                )
              }

              return (
                <Message
                  from={message.role}
                  key={message.id}
                  className="max-w-full animate-slide-in"
                >
                  <div className="flex w-full flex-col gap-2 text-[14px] leading-relaxed text-[var(--ui-ink)]">
                    {message.parts.map((part, index) => {
                      if (part.type === 'text') {
                        const content = partText(part)
                        if (!content) return null
                        return (
                          <Bubble
                            key={`${message.id}-t-${index}`}
                            variant="ghost"
                            className="w-full"
                          >
                            <BubbleContent className="w-full">
                              <MessageResponse>{content}</MessageResponse>
                            </BubbleContent>
                          </Bubble>
                        )
                      }
                      if (isToolUIPart(part)) {
                        return (
                          <ToolPart key={`${message.id}-tool-${index}`} part={part} />
                        )
                      }
                      return null
                    })}
                    {isLastAssistant && !busy ? (
                      <MessageActions
                        text={message.parts.map(partText).filter(Boolean).join('\n\n')}
                      />
                    ) : null}
                  </div>
                </Message>
              )
            })}

            {busy && messages.at(-1)?.role === 'user' ? (
              <Marker role="status" className="animate-fade-in px-1">
                <MarkerIcon>
                  <CircleNotchIcon className="animate-spin text-[var(--ui-accent)]" />
                </MarkerIcon>
                <MarkerContent className="shimmer">Working…</MarkerContent>
              </Marker>
            ) : null}

            {error ? (
              <Bubble variant="destructive" className="max-w-full">
                <BubbleContent>
                  {error.message || 'Something went wrong. Try again.'}
                </BubbleContent>
              </Bubble>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Composer — single-row Cursor-style field, send inline */}
        <div className="relative shrink-0 bg-[var(--ui-paper)]">
          <div className="mx-auto w-full max-w-[712px] px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
            {slashMatches.length > 0 ? (
              <div
                role="listbox"
                aria-label="Slash commands"
                className="mb-2 overflow-hidden rounded-[10px] border border-[var(--ui-border-edge)] bg-[var(--ui-paper)]"
              >
                {slashMatches.map((command) => {
                  const active = command.name === activeSlash?.name
                  return (
                    <button
                      key={command.name}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => completeSlash(command)}
                      className={cn(
                        'flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors',
                        active
                          ? 'bg-[var(--ui-accent-soft)]'
                          : 'hover:bg-[var(--ui-paper-subtle)]'
                      )}
                    >
                      <span className="font-mono text-[12px] text-[var(--ui-ink)]">
                        /{command.name}
                      </span>
                      {command.args ? (
                        <span className="font-mono text-[11px] text-[var(--ui-ink-muted)]">
                          {command.args}
                        </span>
                      ) : null}
                      <span className="ml-auto truncate text-[11px] text-[var(--ui-ink-muted)]">
                        {command.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}
            <PromptInput
              onSubmit={onSubmit}
              className={cn(
                'items-end overflow-hidden rounded-[10px] border border-[var(--ui-border-edge)] bg-[var(--ui-paper)] shadow-none',
                'has-[[data-slot=input-group-control]:focus-visible]:border-[var(--ui-ink-muted)]'
              )}
            >
              <PromptInputTextarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder="Ask about a site, or type / for commands"
                disabled={busy && status === 'submitted'}
                className="min-h-[40px] max-h-40 px-3.5 py-2.5 text-[14px] leading-snug placeholder:text-[var(--ui-ink-muted)]"
                aria-label="Message"
              />
              <InputGroupAddon
                align="inline-end"
                className="self-end py-1.5 pr-1.5"
              >
                <PromptInputSubmit
                  status={status}
                  disabled={!busy && !text.trim()}
                  onStop={() => stop()}
                  size="icon-xs"
                  variant={busy || text.trim() ? 'default' : 'secondary'}
                  className="rounded-[8px]"
                />
              </InputGroupAddon>
            </PromptInput>
          </div>
        </div>
      </div>

      {canvasOpen ? (
        <DesignCanvas
          className="min-h-[55vh] shrink-0 border-t border-[var(--ui-border-soft)] lg:min-h-0 lg:flex-1 lg:shrink lg:border-t-0"
          onSave={(system) => void onSaveSystem(system)}
          saving={savingSystem}
        />
      ) : null}
    </div>
  )
}

/** @deprecated Use ScanChat — kept for imports during rename */
export const AgentChat = ScanChat
