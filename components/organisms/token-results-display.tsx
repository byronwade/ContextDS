"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, ChevronDown, ChevronRight, Download, ExternalLink, Search, Filter, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { FontPreview } from "@/components/molecules/font-preview"

type Token = {
  value: string | number
  usage?: number
  percentage?: number
  source?: string
  lineNumber?: number
  confidence?: number
}

type TokenCategory = {
  colors?: Token[]
  typography?: {
    families?: Token[]
  }
  spacing?: Token[]
  radius?: Token[]
  shadows?: Token[]
}

interface TokenResultsDisplayProps {
  tokens: TokenCategory
  domain: string
  onCopy?: (text: string) => void
  onExport?: (category: string) => void
}

type CategoryKey = 'colors' | 'typography' | 'spacing' | 'radius' | 'shadows'

export function TokenResultsDisplay({ tokens, domain, onCopy, onExport }: TokenResultsDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<CategoryKey>>(new Set(['colors', 'typography']))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all'>('all')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const toggleSection = (section: CategoryKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(text)
    onCopy?.(text)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  // Calculate totals and stats
  const stats = useMemo(() => {
    const colorCount = tokens.colors?.length || 0
    const typographyCount = tokens.typography?.families?.length || 0
    const spacingCount = tokens.spacing?.length || 0
    const radiusCount = tokens.radius?.length || 0
    const shadowsCount = tokens.shadows?.length || 0
    const total = colorCount + typographyCount + spacingCount + radiusCount + shadowsCount

    const avgConfidence = 85 // Placeholder - calculate from actual token confidence scores

    return {
      total,
      categories: {
        colors: colorCount,
        typography: typographyCount,
        spacing: spacingCount,
        radius: radiusCount,
        shadows: shadowsCount
      },
      avgConfidence
    }
  }, [tokens])

  const filteredCategories = useMemo(() => {
    const categories: Array<{ key: CategoryKey; label: string; count: number; data: Token[] }> = []

    if (tokens.colors && tokens.colors.length > 0) {
      categories.push({
        key: 'colors',
        label: 'Colors',
        count: tokens.colors.length,
        data: tokens.colors
      })
    }

    if (tokens.typography?.families && tokens.typography.families.length > 0) {
      categories.push({
        key: 'typography',
        label: 'Typography',
        count: tokens.typography.families.length,
        data: tokens.typography.families
      })
    }

    if (tokens.spacing && tokens.spacing.length > 0) {
      categories.push({
        key: 'spacing',
        label: 'Spacing',
        count: tokens.spacing.length,
        data: tokens.spacing
      })
    }

    if (tokens.radius && tokens.radius.length > 0) {
      categories.push({
        key: 'radius',
        label: 'Radius',
        count: tokens.radius.length,
        data: tokens.radius
      })
    }

    if (tokens.shadows && tokens.shadows.length > 0) {
      categories.push({
        key: 'shadows',
        label: 'Shadows',
        count: tokens.shadows.length,
        data: tokens.shadows
      })
    }

    // Filter by category
    const filtered = selectedCategory === 'all'
      ? categories
      : categories.filter(cat => cat.key === selectedCategory)

    // Filter by search query
    if (searchQuery.trim()) {
      return filtered.map(cat => ({
        ...cat,
        data: cat.data.filter(token =>
          String(token.value).toLowerCase().includes(searchQuery.toLowerCase())
        ),
        count: cat.data.filter(token =>
          String(token.value).toLowerCase().includes(searchQuery.toLowerCase())
        ).length
      })).filter(cat => cat.count > 0)
    }

    return filtered
  }, [tokens, selectedCategory, searchQuery])

  return (
    <div className="space-y-6">
      {/* Results Header - grep.app style */}
      <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
        <div className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-grep-2 bg-background">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-foreground font-semibold">{stats.total}</span>
              <span className="text-sm font-mono text-grep-9">tokens</span>
            </div>
            <span className="text-grep-7 hidden sm:inline">·</span>
            <span className="text-sm font-mono text-grep-9">{filteredCategories.length} categories</span>
            <span className="text-grep-7 hidden md:inline">·</span>
            <Badge variant="secondary" className="h-5 font-mono text-[10px] hidden md:inline-flex">
              {stats.avgConfidence}% confidence
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(JSON.stringify(tokens, null, 2))}
              className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">copy all</span>
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="px-3 sm:px-4 py-3 border-b border-grep-2 bg-grep-0 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grep-7" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tokens by value..."
              className="h-9 pl-9 pr-4 text-sm font-mono bg-background border-grep-3 focus-visible:border-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryKey | 'all')}
              className="h-9 px-3 text-sm font-mono bg-background border border-grep-3 rounded-md text-grep-9 hover:text-foreground focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
            >
              <option value="all">All categories ({stats.total})</option>
              {stats.categories.colors > 0 && <option value="colors">Colors ({stats.categories.colors})</option>}
              {stats.categories.typography > 0 && <option value="typography">Typography ({stats.categories.typography})</option>}
              {stats.categories.spacing > 0 && <option value="spacing">Spacing ({stats.categories.spacing})</option>}
              {stats.categories.radius > 0 && <option value="radius">Radius ({stats.categories.radius})</option>}
              {stats.categories.shadows > 0 && <option value="shadows">Shadows ({stats.categories.shadows})</option>}
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 bg-background border-b border-grep-2">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-mono rounded-md transition-all cursor-pointer",
                selectedCategory === 'all'
                  ? "bg-blue-500 text-white shadow-sm font-semibold"
                  : "bg-grep-1 text-grep-9 border border-grep-2 hover:bg-grep-2 hover:border-grep-4 hover:text-foreground"
              )}
            >
              all <span className="opacity-60">·</span> {stats.total}
            </button>
            {Object.entries(stats.categories).map(([key, count]) => (
              count > 0 && (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key as CategoryKey)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono rounded-md transition-all cursor-pointer",
                    selectedCategory === key
                      ? "bg-blue-500 text-white shadow-sm font-semibold"
                      : "bg-grep-1 text-grep-9 border border-grep-2 hover:bg-grep-2 hover:border-grep-4 hover:text-foreground"
                  )}
                >
                  {key} <span className="opacity-60">·</span> {count}
                </button>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Token Categories */}
      <div className="space-y-4">
        {filteredCategories.map((category) => (
          <div key={category.key} className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
            {/* Category Header */}
            <div className="w-full px-4 py-2.5 bg-background border-b border-grep-2 flex items-center justify-between group">
              <button
                onClick={() => toggleSection(category.key)}
                className="flex items-center gap-3 flex-1 hover:text-foreground transition-colors"
              >
                {expandedSections.has(category.key) ? (
                  <ChevronDown className="h-4 w-4 text-grep-9" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-grep-9" />
                )}
                <span className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground">
                  {category.label}
                </span>
                <Badge variant="secondary" className="h-5 font-mono text-[10px]">
                  {category.count}
                </Badge>
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(JSON.stringify(category.data, null, 2))}
                  className="h-6 px-2 text-xs font-mono text-grep-9 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExport?.(category.key)}
                  className="h-6 px-2 text-xs font-mono text-grep-9 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Category Content */}
            {expandedSections.has(category.key) && (
              <div className="divide-y divide-grep-2">
                {category.key === 'colors' && (
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {category.data.map((token, index) => (
                        <TokenCard
                          key={`${category.key}-${index}`}
                          type="color"
                          token={token}
                          domain={domain}
                          onCopy={handleCopy}
                          isCopied={copiedToken === String(token.value)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {category.key === 'typography' && (
                  <div className="divide-y divide-grep-2">
                    {category.data.map((token, index) => (
                      <TokenCard
                        key={`${category.key}-${index}`}
                        type="typography"
                        token={token}
                        domain={domain}
                        onCopy={handleCopy}
                        isCopied={copiedToken === String(token.value)}
                      />
                    ))}
                  </div>
                )}

                {category.key === 'spacing' && (
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {category.data.map((token, index) => (
                        <TokenCard
                          key={`${category.key}-${index}`}
                          type="spacing"
                          token={token}
                          domain={domain}
                          onCopy={handleCopy}
                          isCopied={copiedToken === String(token.value)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {category.key === 'radius' && (
                  <div className="p-4">
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {category.data.map((token, index) => (
                        <TokenCard
                          key={`${category.key}-${index}`}
                          type="radius"
                          token={token}
                          domain={domain}
                          onCopy={handleCopy}
                          isCopied={copiedToken === String(token.value)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {category.key === 'shadows' && (
                  <div className="divide-y divide-grep-2">
                    {category.data.map((token, index) => (
                      <TokenCard
                        key={`${category.key}-${index}`}
                        type="shadow"
                        token={token}
                        domain={domain}
                        onCopy={handleCopy}
                        isCopied={copiedToken === String(token.value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="rounded-md border border-grep-2 bg-grep-0 p-8 text-center">
          <Search className="h-12 w-12 text-grep-7 mx-auto mb-3" />
          <p className="text-sm font-mono text-grep-9">
            No tokens found matching "{searchQuery}"
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}
            className="mt-3 h-7 px-3 text-xs font-mono text-grep-9 hover:text-foreground"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}

function TokenCard({
  type,
  token,
  domain,
  onCopy,
  isCopied
}: {
  type: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow'
  token: Token
  domain: string
  onCopy: (text: string) => void
  isCopied: boolean
}) {
  if (type === 'color') {
    return (
      <button
        onClick={() => onCopy(String(token.value))}
        className="group flex flex-col gap-2 p-2 rounded border border-grep-2 bg-background hover:border-foreground transition-all relative"
        title={`${token.value} · ${token.usage} uses (${token.percentage}%)`}
      >
        {isCopied && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
        <div
          className="w-full h-16 rounded border border-grep-3"
          style={{ backgroundColor: String(token.value) }}
        />
        <div className="text-left w-full">
          <code className="text-xs text-foreground block truncate font-mono">{token.value}</code>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-grep-9 font-mono">{token.usage} uses</span>
            <div className="flex items-center gap-1">
              <div className="w-8 h-0.5 bg-grep-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${token.percentage}%` }}
                />
              </div>
              <span className="text-[9px] text-grep-9 tabular-nums font-mono">{token.percentage}%</span>
            </div>
          </div>
          {token.source && (
            <div className="text-[9px] text-grep-7 mt-1 truncate font-mono">
              {token.source}:{token.lineNumber || 0}
            </div>
          )}
        </div>
      </button>
    )
  }

  if (type === 'typography') {
    return (
      <button
        onClick={() => onCopy(String(token.value))}
        className="w-full px-4 py-3 text-left hover:bg-background transition-colors group relative"
      >
        {isCopied && (
          <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
        <div className="flex items-center justify-between gap-4 mb-2">
          <code className="text-sm text-foreground truncate flex-1 font-mono">{token.value}</code>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-grep-9 font-mono">{token.percentage}%</span>
            <Copy className="h-3.5 w-3.5 text-grep-7 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <FontPreview fontFamily={String(token.value)} className="relative">
          <div className="flex items-baseline gap-4 not-mono">
            <span className="text-2xl text-foreground">Aa</span>
            <span className="text-xl text-grep-9">Bb Cc</span>
            <span className="text-base text-grep-9">123 abc</span>
            <span className="text-sm text-grep-9">The quick brown fox</span>
          </div>
        </FontPreview>
        {token.source && (
          <div className="text-[9px] text-grep-7 mt-2 truncate font-mono">
            {token.source}:{token.lineNumber || 0}
          </div>
        )}
      </button>
    )
  }

  if (type === 'spacing') {
    return (
      <button
        onClick={() => onCopy(String(token.value))}
        className="flex items-center gap-2 px-3 py-2 rounded border border-grep-2 bg-background hover:border-foreground transition-all group relative"
        title={`${token.percentage}% usage`}
      >
        {isCopied && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
        <div className="w-1 h-4 bg-foreground rounded-sm" style={{ width: `${Math.min(parseInt(String(token.value)) / 2, 24)}px` }} />
        <code className="text-xs text-foreground font-mono">{token.value}</code>
      </button>
    )
  }

  if (type === 'radius') {
    return (
      <button
        onClick={() => onCopy(String(token.value))}
        className="flex flex-col items-center gap-2 p-3 rounded border border-grep-2 bg-background hover:border-foreground transition-all relative"
        title={`${token.percentage}% usage`}
      >
        {isCopied && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
        <div className="w-12 h-12 bg-foreground" style={{ borderRadius: String(token.value) }} />
        <code className="text-xs text-foreground font-mono">{token.value}</code>
      </button>
    )
  }

  if (type === 'shadow') {
    return (
      <button
        onClick={() => onCopy(String(token.value))}
        className="w-full px-4 py-3 text-left hover:bg-background transition-colors group relative"
      >
        {isCopied && (
          <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
        <div className="flex items-center justify-between gap-4 mb-2">
          <code className="text-xs text-foreground truncate flex-1 font-mono">{token.value}</code>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-grep-9 font-mono">{token.percentage}%</span>
            <Copy className="h-3.5 w-3.5 text-grep-7 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="w-full h-12 bg-grep-0 rounded border border-grep-3 flex items-center justify-center">
          <div className="w-16 h-8 bg-foreground rounded" style={{ boxShadow: String(token.value) }} />
        </div>
        {token.source && (
          <div className="text-[9px] text-grep-7 mt-2 truncate font-mono">
            {token.source}:{token.lineNumber || 0}
          </div>
        )}
      </button>
    )
  }

  return null
}