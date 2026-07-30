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
  ConversationEmptyState,
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
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
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

const SUGGESTIONS = [
  'Scan stripe.com and install the Design Contract',
  'Pull the design system from linear.app',
  'Compare type + color on vercel.com',
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
    return <ScanResultWidget data={payload} state={state} className="mb-2" />
  }

  return (
    <Tool defaultOpen={state === 'output-error'}>
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

export function ScanChat() {
  const searchParams = useSearchParams()
  const startedUrl = useRef<string | null>(null)
  const [text, setText] = useState('')

  const { messages, sendMessage, status, error, stop } = useChat<DesignContractAgentUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/agent/chat' }),
  })

  const busy = status === 'submitted' || status === 'streaming'

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
    <div className="relative flex min-h-[65vh] flex-1 flex-col overflow-hidden border border-[color:var(--soft-border)] bg-background/40">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-6 px-4 py-5 sm:px-5">
          {messages.length === 0 && !searchParams.get('url') ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5 px-2 text-center">
              <ConversationEmptyState
                title="Scan a public site"
                description="Paste a URL or pick a suggestion. Scan gathers tokens and drops an installable Design Contract inline."
                className="min-h-0 p-0"
              />
              <Suggestions className="w-full max-w-lg justify-center px-1">
                {SUGGESTIONS.map((suggestion) => (
                  <Suggestion
                    key={suggestion}
                    suggestion={suggestion}
                    onClick={(value) => void sendMessage({ text: value })}
                    className="rounded-md"
                    variant="outline"
                  />
                ))}
              </Suggestions>
            </div>
          ) : null}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (part.type === 'text') {
                    const content = partText(part)
                    if (!content) return null
                    return message.role === 'assistant' ? (
                      <MessageResponse key={`${message.id}-t-${index}`}>
                        {content}
                      </MessageResponse>
                    ) : (
                      <p key={`${message.id}-t-${index}`} className="whitespace-pre-wrap">
                        {content}
                      </p>
                    )
                  }
                  if (isToolUIPart(part)) {
                    return <ToolPart key={`${message.id}-tool-${index}`} part={part} />
                  }
                  return null
                })}
              </MessageContent>
            </Message>
          ))}

          {error ? (
            <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error.message || 'Something went wrong during scan.'}
            </div>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 border-t border-[color:var(--soft-border)] bg-background/90 p-3 backdrop-blur sm:p-4">
        {messages.length > 0 ? (
          <Suggestions className="mb-3 px-0.5">
            {SUGGESTIONS.map((suggestion) => (
              <Suggestion
                key={suggestion}
                suggestion={suggestion}
                onClick={(value) => void sendMessage({ text: value })}
                className="rounded-md"
                variant="outline"
                disabled={busy}
              />
            ))}
          </Suggestions>
        ) : null}

        <PromptInput onSubmit={onSubmit} className="border-[color:var(--soft-border)]">
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="stripe.com — or ask how to rebuild a screen from the contract…"
              disabled={busy}
              className="min-h-12"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <span className="px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Design Contracts · Scan
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
  )
}

/** @deprecated Use ScanChat — kept for imports during rename */
export const AgentChat = ScanChat
