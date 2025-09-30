import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface TokenSearchResult {
  id: string
  type: 'token'
  name: string
  value: string
  category: string
  site?: string | null
  confidence?: number
  usage?: number
  source?: string
}

interface SearchPreferences {
  caseInsensitive: boolean
  wholeWords: boolean
  useRegex: boolean
}

interface SearchState {
  // Search state
  query: string
  results: TokenSearchResult[]
  isLoading: boolean
  error: string | null

  // Search preferences (persisted)
  preferences: SearchPreferences

  // Actions
  setQuery: (query: string) => void
  setResults: (results: TokenSearchResult[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updatePreferences: (preferences: Partial<SearchPreferences>) => void
  clearSearch: () => void
  performSearch: (query: string, signal?: AbortSignal) => Promise<void>
}

export const useSearchStore = create<SearchState>()(
  devtools(
    persist(
      (set, get) => ({
        query: '',
        results: [],
        isLoading: false,
        error: null,
        preferences: {
          caseInsensitive: false,
          wholeWords: false,
          useRegex: false,
        },

        setQuery: (query) => set({ query }),

        setResults: (results) => set({ results }),

        setLoading: (isLoading) => set({ isLoading }),

        setError: (error) => set({ error }),

        updatePreferences: (preferences) =>
          set((state) => ({
            preferences: { ...state.preferences, ...preferences }
          })),

        clearSearch: () =>
          set({
            query: '',
            results: [],
            error: null,
            isLoading: false,
          }),

        performSearch: async (query, signal) => {
          const trimmed = query.trim()
          if (!trimmed) {
            set({ results: [], error: null })
            return
          }

          set({ isLoading: true, error: null })

          try {
            const { preferences } = get()
            const params = new URLSearchParams({
              query: trimmed,
              mode: 'tokens',
              caseInsensitive: preferences.caseInsensitive ? 'true' : 'false',
              limit: '150'
            })

            const response = await fetch(`/api/search?${params.toString()}`, { signal })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)

            const data = await response.json()
            let items: TokenSearchResult[] = (data.results ?? []).map((item: any) => ({
              id: item.id,
              type: item.type,
              name: item.name,
              value: normalizeTokenValue(item.value),
              category: item.category,
              site: item.site,
              confidence: item.confidence,
              usage: item.usage,
              source: item.source
            }))

            // Apply client-side filters
            if (preferences.useRegex) {
              try {
                const regex = new RegExp(trimmed, preferences.caseInsensitive ? 'i' : undefined)
                items = items.filter(result => regex.test(result.name) || regex.test(result.value))
              } catch (error) {
                set({ error: 'Invalid regular expression', results: [] })
                return
              }
            } else if (preferences.wholeWords) {
              const searchTerm = preferences.caseInsensitive ? trimmed.toLowerCase() : trimmed
              items = items.filter(result => {
                const tokenName = preferences.caseInsensitive ? result.name.toLowerCase() : result.name
                const tokenValue = preferences.caseInsensitive ? result.value.toLowerCase() : result.value
                const wordBoundary = new RegExp(
                  `\\b${escapeRegex(searchTerm)}\\b`,
                  preferences.caseInsensitive ? 'i' : undefined
                )
                return wordBoundary.test(tokenName) || wordBoundary.test(tokenValue)
              })
            }

            set({ results: items, isLoading: false })

          } catch (error) {
            if ((error as Error).name === 'AbortError') return
            set({
              error: error instanceof Error ? error.message : 'Search failed',
              results: [],
              isLoading: false
            })
          }
        },
      }),
      {
        name: 'contextds-search-preferences',
        partialize: (state) => ({ preferences: state.preferences }),
      }
    ),
    { name: 'SearchStore' }
  )
)

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeTokenValue(value?: string | number | string[]): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'number') return value.toString()
  return value ?? ''
}