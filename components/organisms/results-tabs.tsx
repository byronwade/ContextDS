"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  Palette,
  Code2,
  Zap,
  Grid3x3,
  Target,
  Eye,
  FileText
} from "lucide-react"

export type TabId = "overview" | "tokens" | "components" | "analysis" | "layout" | "recommendations" | "screenshots"

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
    components?: number
    insights?: number
    screenshots?: number
  }
}

export function ResultsTabs({ activeTab, onTabChange, counts }: ResultsTabsProps) {
  const tabs: Tab[] = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3
    },
    {
      id: "tokens",
      label: "Tokens",
      icon: Palette,
      count: counts?.tokens
    },
    {
      id: "components",
      label: "Components",
      icon: Code2,
      count: counts?.components
    },
    {
      id: "analysis",
      label: "AI Analysis",
      icon: Zap,
      count: counts?.insights
    },
    {
      id: "layout",
      label: "Layout",
      icon: Grid3x3
    },
    {
      id: "recommendations",
      label: "Recommendations",
      icon: Target
    },
    {
      id: "screenshots",
      label: "Screenshots",
      icon: Eye,
      count: counts?.screenshots
    }
  ]

  return (
    <div className="border-b border-grep-2 bg-grep-0">
      <div className="flex items-center overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 shrink-0",
                isActive
                  ? "border-blue-600 text-foreground bg-background"
                  : "border-transparent text-grep-9 hover:text-foreground hover:bg-grep-1"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "text-xs font-mono px-1.5 py-0.5 rounded",
                  isActive
                    ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
                    : "bg-grep-2 text-grep-7"
                )}>
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
