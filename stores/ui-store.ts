import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type ViewMode = 'search' | 'scan'

interface UIState {
  // View mode
  viewMode: ViewMode

  // UI states
  isSearchActive: boolean
  hasResults: boolean
  showDiff: boolean
  expandedSections: Set<string>
  copied: boolean

  // Actions
  setViewMode: (mode: ViewMode) => void
  setSearchActive: (active: boolean) => void
  setHasResults: (hasResults: boolean) => void
  setShowDiff: (show: boolean) => void
  toggleSection: (section: string) => void
  setCopied: (copied: boolean) => void
  resetUI: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        viewMode: 'search',
        isSearchActive: false,
        hasResults: false,
        showDiff: false,
        expandedSections: new Set<string>(),
        copied: false,

        setViewMode: (viewMode) => set({ viewMode }),

        setSearchActive: (isSearchActive) => set({ isSearchActive }),

        setHasResults: (hasResults) => set({ hasResults }),

        setShowDiff: (showDiff) => set({ showDiff }),

        toggleSection: (section) => {
          const { expandedSections } = get()
          const next = new Set(expandedSections)
          if (next.has(section)) {
            next.delete(section)
          } else {
            next.add(section)
          }
          set({ expandedSections: next })
        },

        setCopied: (copied) => {
          set({ copied })
          if (copied) {
            setTimeout(() => set({ copied: false }), 2000)
          }
        },

        resetUI: () => set({
          showDiff: false,
          expandedSections: new Set(),
          copied: false,
        }),
      }),
      {
        name: 'contextds-ui-state',
        partialize: (state) => ({ viewMode: state.viewMode }),
      }
    ),
    { name: 'UIStore' }
  )
)