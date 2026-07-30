"use client"

import { cn } from "@/lib/utils"
import {
  BarChart3,
  Palette,
  FileText,
  Sparkles,
  Grid3x3,
} from "lucide-react"

export type TabId = "overview" | "tokens" | "design-md" | "skill" | "layout"

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
  count?: number
}

interface ResultsTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  counts?: {
    tokens?: number
  }
}

export function ResultsTabs({ activeTab, onTabChange, counts }: ResultsTabsProps) {
  const tabs: Tab[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "tokens", label: "Tokens", icon: Palette, count: counts?.tokens },
    { id: "design-md", label: "DESIGN.md", icon: FileText },
    { id: "skill", label: "Agent Skill", icon: Sparkles },
    { id: "layout", label: "Layout", icon: Grid3x3 },
  ]

  return (
    <div className="border-b border-border/70 bg-transparent">
      <div className="flex gap-1 overflow-x-auto px-1 py-1" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    active ? "text-background/80" : "text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
