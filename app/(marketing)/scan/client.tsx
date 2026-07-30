'use client'

import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type UIMessage,
} from 'ai'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from '@/components/ai-elements/tool'
import {
  ScanResultWidget,
  asScanWidgetPayload,
  isScanResultToolName,
} from '@/components/molecules/scan-result-widget'
import type { DesignContractAgentUIMessage } from '@/lib/agent/design-contract-agent'
import { trackClientEvent } from '@/lib/analytics/track-client'
import { pushRecent } from '@/lib/recents'
import { cn } from '@/lib/utils'

const EXAMPLES = [
  { label: 'stripe.com', prompt: 'Scan stripe.com and install the Design Contract' },
  { label: 'linear.app', prompt: 'Pull the design system from linear.app' },
  { label: 'vercel.com', prompt: 'Compare type + color on vercel.com' },
  { label: 'cursor.com', prompt: 'Scan cursor.com and summarize the Design Contract' },
] as const

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

  return (
    <Tool defaultOpen={state === 'output-error'} className="mt-1">
      <ToolHeader
        title={name}
        type={part.type as `tool-${string}`}
        state={state}
      />
      <ToolContent>
        {input !== undefined ? <ToolInput input={input} /> : null}
        {errorText ? (
          <p className="text-sm text-destructive">{errorText}</p>
        ) : output !== undefined ? (
          <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[11px] text-muted-foreground">
            {typeof output === 'string' ? output : JSON.stringify(output, null, 2).slice(0, 1200)}
          </pre>
        ) : null}
      </ToolContent>
    </Tool>
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
    <div className="mx-auto flex w-full max-w-[712px] flex-1 flex-col items-center justify-center px-4 pb-10 pt-14 animate-fade-in">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ui-ink-muted)]">
        Design Contract workbench
      </p>
      <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-tight tracking-[-0.02em] text-[var(--ui-ink)]">
        designcontracts
        <span className="font-mono text-[0.5em] font-medium tracking-normal text-[var(--ui-accent)]">
          .sh
        </span>
      </h1>
      <p className="mt-3 max-w-md text-center text-[15px] leading-relaxed text-[var(--ui-ink-secondary)]">
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
              'h-7 rounded-[7px] bg-[var(--ui-paper)] px-2.5 font-mono text-[12px] text-[var(--ui-ink-secondary)] shadow-[var(--shadow-control)] transition',
              'hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)] hover:shadow-[var(--shadow-control-hover)] disabled:opacity-50',
              'animate-slide-in'
            )}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {example.label}
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

  const { messages, sendMessage, status, error, stop } = useChat<DesignContractAgentUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/agent/chat' }),
  })

  const busy = status === 'submitted' || status === 'streaming'
  const hasMessages = messages.length > 0 || Boolean(searchParams.get('url'))

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

  const onSubmit = (message: PromptInputMessage) => {
    const next = message.text?.trim()
    if (!next || busy) return
    setText('')
    trackClientEvent('chat_message')
    // Best-effort: if the message looks like a bare domain, stash it in Recents.
    const maybeDomain = next
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split(/[\s/?#]/)[0]
    if (maybeDomain && /\./.test(maybeDomain) && !maybeDomain.includes(' ')) {
      pushRecent(maybeDomain)
    }
    void sendMessage({ text: next })
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ui-paper)]">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
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

            {messages.map((message) => (
              <Message
                from={message.role}
                key={message.id}
                className={cn(
                  'max-w-full animate-slide-in',
                  message.role === 'user' ? 'max-w-[85%]' : 'max-w-full'
                )}
              >
                <MessageContent
                  className={cn(
                    message.role === 'user' &&
                      'rounded-[10px] bg-[var(--ui-paper-subtle)] px-3.5 py-2 text-[14px] leading-relaxed text-[var(--ui-ink)] shadow-[var(--shadow-control)]',
                    message.role === 'assistant' &&
                      'w-full max-w-none gap-3 text-[14px] leading-relaxed text-[var(--ui-ink)]'
                  )}
                >
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      const content = partText(part)
                      if (!content) return null
                      return message.role === 'assistant' ? (
                        <MessageResponse key={`${message.id}-t-${index}`}>
                          {content}
                        </MessageResponse>
                      ) : (
                        <p
                          key={`${message.id}-t-${index}`}
                          className="whitespace-pre-wrap"
                        >
                          {content}
                        </p>
                      )
                    }
                    if (isToolUIPart(part)) {
                      return (
                        <ToolPart key={`${message.id}-tool-${index}`} part={part} />
                      )
                    }
                    return null
                  })}
                </MessageContent>
              </Message>
            ))}

            {busy && messages.at(-1)?.role === 'user' ? (
              <div className="flex items-center gap-2 px-1 text-[13px] text-[var(--ui-ink-secondary)] animate-fade-in">
                <span className="inline-flex gap-1">
                  <span className="size-1.5 animate-pulse rounded-full bg-[var(--ui-accent)]" />
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-[var(--ui-accent)]"
                    style={{ animationDelay: '120ms' }}
                  />
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-[var(--ui-accent)]"
                    style={{ animationDelay: '240ms' }}
                  />
                </span>
                Working…
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ui-danger)]">
                {error.message || 'Something went wrong. Try again.'}
              </div>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Composer — integrated paper footer feel */}
        <div className="relative shrink-0 border-t border-[var(--ui-border-soft)] bg-[color-mix(in_srgb,var(--ui-paper)_76%,var(--ui-paper-subtle))]">
          <div className="mx-auto w-full max-w-[712px] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
            <PromptInput
              onSubmit={onSubmit}
              className="overflow-hidden rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-paper)] shadow-[var(--shadow-control)]"
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Ask about a site — stripe.com, linear.app…"
                  disabled={busy && status === 'submitted'}
                  className="min-h-[48px] text-[14px] leading-relaxed placeholder:text-[var(--ui-ink-muted)]"
                  aria-label="Message"
                />
              </PromptInputBody>
              <PromptInputFooter className="px-1.5">
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-ink-muted)]">
                  Design Contract
                </span>
                <PromptInputSubmit
                  status={status}
                  disabled={!busy && !text.trim()}
                  onStop={() => stop()}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  )
}

/** @deprecated Use ScanChat — kept for imports during rename */
export const AgentChat = ScanChat
