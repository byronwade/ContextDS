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
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-16 animate-fade-in">
      <h1 className="font-serif text-[clamp(2.5rem,7vw,3.75rem)] leading-[0.95] tracking-[-0.03em] text-foreground">
        designcontracts
        <span className="font-mono text-[0.5em] tracking-normal text-[oklch(0.78_0.08_185)]">
          .sh
        </span>
      </h1>
      <p className="mt-4 max-w-md text-center text-[15px] leading-relaxed text-muted-foreground">
        Paste a URL. Get an installable Design Contract.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {EXAMPLES.map((example, index) => (
          <button
            key={example.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(example.prompt)}
            className={cn(
              'rounded-md border border-[color:var(--soft-border)] bg-transparent px-3 py-1.5 font-mono text-xs text-muted-foreground transition',
              'hover:border-foreground/25 hover:text-foreground disabled:opacity-50',
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
    void sendMessage({
      text: `Scan ${domain} and show me the Design Contract — summarize the system and how to install it.`,
    })
  }, [searchParams, messages.length, busy, sendMessage])

  const onSubmit = (message: PromptInputMessage) => {
    const next = message.text?.trim()
    if (!next || busy) return
    setText('')
    void sendMessage({ text: next })
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* Soft atmosphere — not a marketing hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(720px 360px at 50% 0%, oklch(0.42 0.035 185 / 0.10), transparent 60%)',
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Conversation className="min-h-0 flex-1">
          <ConversationContent
            className={cn(
              'mx-auto w-full max-w-2xl gap-5 px-4 py-6 sm:px-6',
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
                      'rounded-2xl bg-secondary/80 px-4 py-2.5 text-[15px] leading-relaxed',
                    message.role === 'assistant' &&
                      'w-full max-w-none gap-3 text-[15px] leading-relaxed'
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
              <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground animate-fade-in">
                <span className="inline-flex gap-1">
                  <span className="size-1.5 animate-pulse rounded-full bg-[oklch(0.78_0.08_185)]" />
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-[oklch(0.78_0.08_185)]"
                    style={{ animationDelay: '120ms' }}
                  />
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-[oklch(0.78_0.08_185)]"
                    style={{ animationDelay: '240ms' }}
                  />
                </span>
                Working…
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message || 'Something went wrong. Try again.'}
              </div>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Composer dock */}
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-background to-transparent"
          />
          <div className="mx-auto w-full max-w-2xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-6">
            <PromptInput
              onSubmit={onSubmit}
              className="border-[color:var(--soft-border)] bg-card/60 shadow-[0_-1px_0_0_oklch(1_0_0_/_0.03)] backdrop-blur-md"
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Ask about a site — stripe.com, linear.app…"
                  disabled={busy && status === 'submitted'}
                  className="min-h-[52px] text-[15px] leading-relaxed placeholder:text-muted-foreground/70"
                  aria-label="Message"
                />
              </PromptInputBody>
              <PromptInputFooter className="px-1">
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
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
