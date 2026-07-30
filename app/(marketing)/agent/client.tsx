'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, type UIMessage } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { DesignContractAgentUIMessage } from '@/lib/agent/design-contract-agent'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Scan stripe.com and summarize the design system',
  'What roles and components are in the vercel.com graph?',
  'Give me the Design Contract download for example.com after scanning it',
] as const

function partText(part: UIMessage['parts'][number]): string {
  if (part.type === 'text' && 'text' in part) return String(part.text || '')
  return ''
}

function ToolChip({ part }: { part: UIMessage['parts'][number] }) {
  if (!isToolUIPart(part)) return null
  const name = part.type.replace(/^tool-/, '')
  const state = 'state' in part ? String(part.state) : 'unknown'
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{name}</span>
      <span className="mx-2 text-border">·</span>
      <span>{state}</span>
    </div>
  )
}

export function AgentChat() {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error, stop } = useChat<DesignContractAgentUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/agent/chat' }),
  })

  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

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
        {messages.length === 0 ? (
          <div className="space-y-4 border border-[color:var(--soft-border)] bg-card/30 p-5">
            <p className="text-sm text-muted-foreground">Try one of these:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setInput(suggestion)
                    void sendMessage({ text: suggestion })
                  }}
                  className="rounded-md border border-[color:var(--soft-border)] bg-background/60 px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-foreground/25"
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
              'rounded-lg px-4 py-3 text-sm leading-relaxed',
              message.role === 'user'
                ? 'ml-8 bg-primary text-primary-foreground'
                : 'mr-4 border border-[color:var(--soft-border)] bg-card/40 text-foreground'
            )}
          >
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
              {message.role === 'user' ? 'You' : 'Agent'}
            </p>
            <div className="space-y-3 whitespace-pre-wrap">
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  const text = partText(part)
                  return text ? <p key={`${message.id}-t-${index}`}>{text}</p> : null
                }
                if (isToolUIPart(part)) {
                  return <ToolChip key={`${message.id}-tool-${index}`} part={part} />
                }
                return null
              })}
            </div>
          </article>
        ))}

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error.message || 'Something went wrong talking to the agent.'}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 border-t border-border/60 bg-background/95 py-4 backdrop-blur"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Scan a site, ask about roles, or request a contract pack…"
            className="h-11 flex-1 rounded-md border border-[color:var(--soft-border)] bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            disabled={busy}
          />
          {busy ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md"
              onClick={() => stop()}
            >
              Stop
            </Button>
          ) : (
            <Button type="submit" className="h-11 rounded-md" disabled={!input.trim()}>
              Send
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tools call your existing scan pipeline. Accurate mode needs{' '}
          <code className="text-foreground">SCANNER_SERVICE_URL</code>.
        </p>
      </form>
    </div>
  )
}
