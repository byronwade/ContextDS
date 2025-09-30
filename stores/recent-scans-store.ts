import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentScan {
  id: string
  domain: string
  scannedAt: number // timestamp
  tokensExtracted: number
  confidence: number
  url: string // shareable URL
}

interface RecentScansState {
  scans: RecentScan[]
  addScan: (scan: Omit<RecentScan, 'id' | 'scannedAt'>) => void
  removeScan: (id: string) => void
  clearScans: () => void
  getRecentScans: (limit?: number) => RecentScan[]
}

export const useRecentScans = create<RecentScansState>()(
  persist(
    (set, get) => ({
      scans: [],

      addScan: (scan) => {
        const newScan: RecentScan = {
          id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          scannedAt: Date.now(),
          ...scan
        }

        set((state) => {
          // Check if scan already exists (by domain)
          const exists = state.scans.some(s => s.domain === scan.domain)

          if (exists) {
            // Update existing scan with new data
            return {
              scans: [
                newScan,
                ...state.scans.filter(s => s.domain !== scan.domain)
              ].slice(0, 20) // Keep max 20 scans
            }
          }

          // Add new scan at the beginning
          return {
            scans: [newScan, ...state.scans].slice(0, 20) // Keep max 20 scans
          }
        })
      },

      removeScan: (id) => {
        set((state) => ({
          scans: state.scans.filter((scan) => scan.id !== id)
        }))
      },

      clearScans: () => {
        set({ scans: [] })
      },

      getRecentScans: (limit = 10) => {
        return get().scans.slice(0, limit)
      }
    }),
    {
      name: 'contextds-recent-scans', // localStorage key
      version: 1,
    }
  )
)