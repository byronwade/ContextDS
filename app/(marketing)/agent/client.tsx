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
import { Button } from '@/components/ui/button'
import {
  ScanResultWidget,
  asScanWidgetPayload,
  isScanResultToolName,
} from '@/components/molecules/scan-result-widget'
import type { DesignContractAgentUIMessage } from '@/lib/agent/design-contract-agent'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Scan stripe.com and install the Design Contract',
  'Pull the design system from linear.app',
  'Compare the type + color systems on vercel.com',
] as const

function partText(part: UIMessage['parts'][number]): string {
  if (part.type === 'text' && 'text' in part) return String(part.text || '')
  return ''
}

function ToolPart({ part }: { part: UIMessage['parts'][number] }) {
  if (!isToolUIPart(part)) return null

  const name = getToolName(part)
  const state = 'state' in part ? String(part.state) : 'unknown'
  const output = 'output' in part ? part.output : undefined
  const input = 'input' in part && part.input && typeof part.input === 'object' ? part.input : null
  const inputDomain =
    input && 'url' in input
      ? String((input as { url?: string }).url || '')
      : input && 'domain' in input
        ? String((input as { domain?: string }).domain || '')
        : ''

  if (isScanResultToolName(name)) {
    const payload = asScanWidgetPayload(output) || {
      domain: inputDomain.replace(/^https?:\/\//, '').split('/')[0] || undefined,
    }
    return <ScanResultWidget data={payload} state={state} />
  }

  return (
    <div className="rounded-md border border-[color:var(--soft-border)] bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
      <span className="text-foreground">{name}</span>
      <span className="mx-2 opacity-40">·</span>
      <span>{state.replace(/-/g, ' ')}</span>
    </div>
  )
}

export function AgentChat() {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const startedUrl = useRef<string | null>(null)
  const searchParams = useSearchParams()

  const { messages, sendMessage, status, error, stop } = useChat<DesignContractAgentUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/agent/chat' }),
  })

  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  // Home / nav "scan" entry: /agent?url=stripe.com → kick off the agent
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

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    void sendMessage({ text })
  }

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pb-4">
        {messages.length === 0 && !searchParams.get('url') ? (
          <div className="space-y-4 border border-[color:var(--soft-border)] bg-card/20 p-5">
            <p className="text-sm text-muted-foreground">
              Paste a URL or ask for a system. The agent runs the scanner as a tool and drops results
              inline.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    void sendMessage({ text: suggestion })
                  }}
                  className="border border-[color:var(--soft-border)] bg-background/60 px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-foreground/25"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            className={cn(
              'px-1 py-1 text-sm leading-relaxed',
              message.role === 'user' ? 'ml-6 sm:ml-12' : 'mr-2 sm:mr-8'
            )}
          >
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {message.role === 'user' ? 'You' : 'Agent'}
            </p>
            <div
              className={cn(
                'space-y-3',
                message.role === 'user'
                  ? 'border border-[color:var(--soft-border)] bg-primary px-4 py-3 text-primary-foreground'
                  : 'text-foreground'
              )}
            >
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  const text = partText(part)
                  return text ? (
                    <p key={`${message.id}-t-${index}`} className="whitespace-pre-wrap">
                      {text}
                    </p>
                  ) : null
                }
                if (isToolUIPart(part)) {
                  return <ToolPart key={`${message.id}-tool-${index}`} part={part} />
                }
                return null
              })}
            </div>
          </article>
        ))}

        {error ? (
          <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error.message || 'Something went wrong talking to the agent.'}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 border-t border-[color:var(--soft-border)] bg-background/95 py-4 backdrop-blur"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="stripe.com — or ask how to rebuild a screen from the contract…"
            className="h-11 flex-1 border border-[color:var(--soft-border)] bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            disabled={busy}
            aria-label="Message the Design Contract agent"
          />
          {busy ? (
            <Button type="button" variant="outline" className="h-11 rounded-md" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <Button type="submit" className="h-11 rounded-md" disabled={!input.trim()}>
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
