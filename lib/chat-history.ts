'use client'

/**
 * Local chat history — recent conversations for the sidebar.
 *
 * Chats live in localStorage (no account system yet): a bounded list of
 * { id, title, updatedAt } summaries plus one entry per chat with its
 * UIMessage transcript. Restored via /?chat=<id>.
 */

import type { UIMessage } from 'ai'

const INDEX_KEY = 'dc.chats.index'
const CHAT_KEY = (id: string) => `dc.chat.${id}`
const MAX_CHATS = 10
const MAX_BYTES_PER_CHAT = 400_000

export type ChatSummary = {
  id: string
  title: string
  updatedAt: number
}

export function createChatId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function listChats(): ChatSummary[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    const parsed = raw ? (JSON.parse(raw) as ChatSummary[]) : []
    return Array.isArray(parsed)
      ? parsed
          .filter((chat) => chat && chat.id && chat.title)
          .sort((a, b) => b.updatedAt - a.updatedAt)
      : []
  } catch {
    return []
  }
}

function writeIndex(chats: ChatSummary[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(chats.slice(0, MAX_CHATS)))
  } catch {
    /* storage full or unavailable */
  }
}

function titleFrom(messages: UIMessage[]): string {
  for (const message of messages) {
    if (message.role !== 'user') continue
    for (const part of message.parts) {
      if (part.type === 'text' && 'text' in part) {
        const text = String(part.text || '').trim().replace(/\s+/g, ' ')
        if (text) return text.length > 44 ? `${text.slice(0, 44)}…` : text
      }
    }
  }
  return 'New chat'
}

/** Persist a transcript; evicts the oldest chats beyond MAX_CHATS. */
export function saveChat(id: string, messages: UIMessage[]): void {
  if (typeof window === 'undefined' || messages.length === 0) return
  try {
    let payload = JSON.stringify(messages)
    if (payload.length > MAX_BYTES_PER_CHAT) {
      // Drop bulky tool outputs first; keep the conversational shape.
      const slim = messages.map((message) => ({
        ...message,
        parts: message.parts.map((part) =>
          'output' in part ? { ...part, output: undefined } : part
        ),
      }))
      payload = JSON.stringify(slim)
      if (payload.length > MAX_BYTES_PER_CHAT) return
    }
    localStorage.setItem(CHAT_KEY(id), payload)

    const rest = listChats().filter((chat) => chat.id !== id)
    const next = [{ id, title: titleFrom(messages), updatedAt: Date.now() }, ...rest]
    for (const evicted of next.slice(MAX_CHATS)) {
      localStorage.removeItem(CHAT_KEY(evicted.id))
    }
    writeIndex(next)
    window.dispatchEvent(new CustomEvent('dc:chats-updated'))
  } catch {
    /* storage full — chat stays in memory only */
  }
}

export function loadChat(id: string): UIMessage[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CHAT_KEY(id))
    const parsed = raw ? (JSON.parse(raw) as UIMessage[]) : null
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

// --- useSyncExternalStore adapter (cached snapshot) ---------------------------

let chatsCache: ChatSummary[] | null = null
const EMPTY_CHATS: ChatSummary[] = []

export function subscribeChats(onStoreChange: () => void): () => void {
  const refresh = () => {
    chatsCache = null
    onStoreChange()
  }
  window.addEventListener('dc:chats-updated', refresh)
  window.addEventListener('storage', refresh)
  return () => {
    window.removeEventListener('dc:chats-updated', refresh)
    window.removeEventListener('storage', refresh)
  }
}

export function getChatsSnapshot(): ChatSummary[] {
  if (chatsCache === null) chatsCache = listChats()
  return chatsCache
}

export function getChatsServerSnapshot(): ChatSummary[] {
  return EMPTY_CHATS
}

export function deleteChat(id: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CHAT_KEY(id))
    writeIndex(listChats().filter((chat) => chat.id !== id))
  } catch {
    /* ignore */
  }
}
