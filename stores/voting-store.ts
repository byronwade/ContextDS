import { create } from "zustand"

type VotedSite = {
  siteId: string
  votedAt: string
}

interface VotingState {
  votedSites: VotedSite[]
  hasVoted: (siteId: string) => boolean
  addVote: (siteId: string) => void
  removeVote: (siteId: string) => void
  loadVotes: () => void
}

const STORAGE_KEY = "contextds_voted_sites"

export const useVotingStore = create<VotingState>((set, get) => ({
  votedSites: [],

  hasVoted: (siteId: string) => {
    const { votedSites } = get()
    return votedSites.some((vote) => vote.siteId === siteId)
  },

  addVote: (siteId: string) => {
    const votedSite: VotedSite = {
      siteId,
      votedAt: new Date().toISOString(),
    }

    set((state) => {
      const newVotedSites = [...state.votedSites, votedSite]

      // Persist to localStorage with error handling
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newVotedSites))
        } catch (error) {
          console.error("Failed to save vote to localStorage:", error)
          // Vote still persists in memory for current session
        }
      }

      return { votedSites: newVotedSites }
    })
  },

  removeVote: (siteId: string) => {
    set((state) => {
      const newVotedSites = state.votedSites.filter(
        (vote) => vote.siteId !== siteId
      )

      // Persist to localStorage with error handling
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newVotedSites))
        } catch (error) {
          console.error("Failed to remove vote from localStorage:", error)
          // Vote removal still persists in memory for current session
        }
      }

      return { votedSites: newVotedSites }
    })
  },

  loadVotes: () => {
    if (typeof window === "undefined") return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const votedSites = JSON.parse(stored) as VotedSite[]
        set({ votedSites })
      }
    } catch (error) {
      console.error("Error loading voted sites:", error)
    }
  },
}))