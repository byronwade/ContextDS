"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ChevronDown, ChevronUp, Code2, Zap, Shield, Box } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import type { ComponentLibrary, ExtractedComponent } from "@/lib/analyzers/advanced-component-detector"

interface AdvancedComponentLibraryProps {
  componentLibrary: ComponentLibrary | null
  onCopy?: (value: string) => void
}

export function AdvancedComponentLibrary({ componentLibrary, onCopy }: AdvancedComponentLibraryProps) {
  const [filter, setFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'confidence' | 'usage' | 'type'>('confidence')

  if (!componentLibrary) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Code2 className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No component library data available</p>
        <p className="text-xs text-grep-7 mt-2">Enable computed CSS mode to extract component patterns</p>
      </div>
    )
  }

  const { components, summary } = componentLibrary

  if (components.length === 0) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Code2 className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No components detected</p>
        <p className="text-xs text-grep-7 mt-2">This site may not use standard component patterns</p>
      </div>
    )
  }

  // Filter and sort components
  const filteredComponents = components
    .filter(c => !filter || c.type === filter)
    .sort((a, b) => {
      if (sortBy === 'confidence') return b.confidence - a.confidence
      if (sortBy === 'usage') return b.usage - a.usage
      return a.type.localeCompare(b.type)
    })

  // Get unique component types for filtering
  const componentTypes = Object.entries(summary.byType)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="rounded-xl border-2 border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-grep-3 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-foreground">
                Advanced Component Library
              </h3>
              <p className="text-[10px] sm:text-xs text-grep-7 mt-0.5">
                58 component types • Multi-strategy detection
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                {summary.totalComponents} detected
              </Badge>
              <Badge
                variant={
                  summary.detectionAccuracy === 'very-high' ? 'default' :
                  summary.detectionAccuracy === 'high' ? 'secondary' :
                  'outline'
                }
                className="font-mono text-xs px-2 py-0.5"
              >
                {summary.averageConfidence}% accuracy
              </Badge>
            </div>
          </div>
        </div>

        {/* Framework Summary */}
        {summary.frameworks && summary.frameworks.detected.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-b-2 border-grep-3 bg-background/60">
            <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">
              Detected Frameworks ({summary.frameworks.detected.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.frameworks.detected.map((framework) => (
                <div key={framework} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{framework}</span>
                  <span className="text-xs font-mono text-grep-7">
                    {summary.frameworks.byFramework[framework]}
                  </span>
                </div>
              ))}
              {summary.frameworks.utilityFirstCount > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20">
                  <span className="text-xs text-purple-600 dark:text-purple-400">Utility-First</span>
                  <span className="text-xs font-mono text-grep-7">{summary.frameworks.utilityFirstCount}</span>
                </div>
              )}
              {summary.frameworks.customDesignSystemCount > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                  <span className="text-xs text-green-600 dark:text-green-400">Custom</span>
                  <span className="text-xs font-mono text-grep-7">{summary.frameworks.customDesignSystemCount}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Component Type Grid */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-background/50 to-background">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <button
              onClick={() => setFilter(null)}
              className={cn(
                "p-2 rounded-lg border transition-all text-left",
                !filter
                  ? "bg-blue-500 border-blue-600 text-white"
                  : "bg-background border-grep-2 hover:border-grep-4"
              )}
            >
              <div className="text-lg font-bold font-mono">{summary.totalComponents}</div>
              <div className="text-xs opacity-90">All Types</div>
            </button>
            {componentTypes.slice(0, 11).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={cn(
                  "p-2 rounded-lg border transition-all text-left",
                  filter === type
                    ? "bg-blue-500 border-blue-600 text-white"
                    : "bg-background border-grep-2 hover:border-grep-4"
                )}
              >
                <div className="text-lg font-bold font-mono">{count}</div>
                <div className="text-xs opacity-90 capitalize truncate">{type.replace('-', ' ')}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-grep-9">
          Showing {filteredComponents.length} {filter ? `${filter} components` : 'components'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-grep-7">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-grep-2 rounded px-2 py-1 bg-background"
          >
            <option value="confidence">Confidence</option>
            <option value="usage">Usage</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      {/* Component Cards */}
      <div className="space-y-3">
        {filteredComponents.map((component, index) => (
          <ComponentCard key={index} component={component} onCopy={onCopy} />
        ))}
      </div>
    </div>
  )
}

function ComponentCard({ component, onCopy }: {
  component: ExtractedComponent
  onCopy?: (value: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'tokens' | 'states' | 'metadata'>('tokens')

  const copyComponentData = () => {
    const data = JSON.stringify(component, null, 2)
    onCopy?.(data)
  }

  return (
    <div className="rounded-lg border border-grep-2 bg-grep-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-grep-2 bg-background">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-foreground capitalize font-mono">
                {component.type.replace('-', ' ')}
              </h4>
              {component.variant && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                  {component.variant}
                </Badge>
              )}
              <Badge
                variant={
                  component.confidenceLevel === 'very-high' ? 'default' :
                  component.confidenceLevel === 'high' ? 'secondary' :
                  'outline'
                }
                className="text-[10px] px-1.5 py-0"
              >
                {component.confidence}% {component.confidenceLevel}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {component.usage} uses
              </Badge>
            </div>
            <code className="text-xs text-grep-9 font-mono">
              {component.selectors[0]}
            </code>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={copyComponentData}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview - Key Tokens */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(component.tokens)
          .filter(([key, value]) => value)
          .slice(0, 8)
          .map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-grep-7 font-mono">{key}:</span>{' '}
              <span className="text-foreground font-mono font-medium truncate block">{String(value)}</span>
            </div>
          ))}
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="border-t border-grep-2 bg-grep-0">
          {/* Tabs */}
          <div className="flex border-b border-grep-2 bg-background">
            {(['tokens', 'states', 'metadata'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                  activeTab === tab
                    ? "text-foreground border-b-2 border-blue-500"
                    : "text-grep-7 hover:text-grep-9"
                )}
              >
                {tab === 'tokens' && <Box className="h-3.5 w-3.5 inline mr-1.5" />}
                {tab === 'states' && <Zap className="h-3.5 w-3.5 inline mr-1.5" />}
                {tab === 'metadata' && <Shield className="h-3.5 w-3.5 inline mr-1.5" />}
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'tokens' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(component.tokens)
                  .filter(([_, value]) => value)
                  .map(([key, value]) => (
                    <div key={key} className="p-2 rounded bg-background border border-grep-2">
                      <div className="text-[10px] text-grep-7 uppercase tracking-wide mb-0.5">{key}</div>
                      <div className="text-xs text-foreground font-mono truncate">{String(value)}</div>
                    </div>
                  ))}
              </div>
            )}

            {activeTab === 'states' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(component.states)
                  .filter(([_, stateProps]) => stateProps && Object.keys(stateProps).length > 0)
                  .map(([stateName, stateProps]) => (
                    <div key={stateName} className="p-3 rounded bg-background border border-grep-2">
                      <div className="text-xs font-semibold text-foreground capitalize mb-2">{stateName}</div>
                      <div className="space-y-1">
                        {Object.entries(stateProps!)
                          .filter(([_, value]) => value)
                          .map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="text-grep-7 font-mono">{key}:</span>{' '}
                              <span className="text-foreground font-mono">{String(value)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                {Object.keys(component.states).length === 0 && (
                  <div className="text-xs text-grep-7 p-4 text-center">No state variations detected</div>
                )}
              </div>
            )}

            {activeTab === 'metadata' && (
              <div className="space-y-4">
                {/* Framework Detection */}
                {component.metadata.detectedFrameworks && component.metadata.detectedFrameworks.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">
                      Detected Frameworks
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {component.metadata.detectedFrameworks.map((framework) => (
                        <div key={framework} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{framework}</span>
                          {component.metadata.frameworkConfidence?.[framework] && (
                            <span className="text-xs font-mono text-grep-7">
                              {component.metadata.frameworkConfidence[framework]}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {component.metadata.isUtilityFirst && (
                        <div className="inline-flex items-center px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-xs text-purple-600 dark:text-purple-400">
                          Utility-First CSS
                        </div>
                      )}
                      {component.metadata.isCustomDesignSystem && (
                        <div className="inline-flex items-center px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-400">
                          Custom Design System
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cross-Element Validation */}
                {(component.metadata.clusterSize || component.metadata.consistencyScore) && (
                  <div>
                    <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">
                      Pattern Validation
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {component.metadata.clusterSize && (
                        <div className="p-2 rounded bg-background border border-grep-2">
                          <div className="text-[10px] text-grep-7 uppercase tracking-wide mb-0.5">Cluster Size</div>
                          <div className="text-xs text-foreground font-mono font-semibold">{component.metadata.clusterSize} instances</div>
                        </div>
                      )}
                      {component.metadata.consistencyScore !== undefined && (
                        <div className="p-2 rounded bg-background border border-grep-2">
                          <div className="text-[10px] text-grep-7 uppercase tracking-wide mb-0.5">Consistency</div>
                          <div className="text-xs text-foreground font-mono font-semibold">{Math.round(component.metadata.consistencyScore)}%</div>
                        </div>
                      )}
                      {component.metadata.repetitionBoost !== undefined && (
                        <div className="p-2 rounded bg-background border border-grep-2">
                          <div className="text-[10px] text-grep-7 uppercase tracking-wide mb-0.5">Boost Applied</div>
                          <div className="text-xs text-foreground font-mono font-semibold">+{Math.round(component.metadata.repetitionBoost)}%</div>
                        </div>
                      )}
                      {component.metadata.isVariantFamily && (
                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">Variant Family</div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold">Multiple variants</div>
                        </div>
                      )}
                    </div>
                    {component.metadata.isOutlier && (
                      <div className="mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">⚠️ Low Confidence Outlier</div>
                        <div className="text-xs text-grep-7 mt-0.5">This detection has lower confidence than similar components</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ARIA Attributes */}
                {(component.metadata.role || component.metadata.ariaLabel) && (
                  <div>
                    <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">
                      Accessibility (ARIA)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(component.metadata)
                        .filter(([key, value]) => key.startsWith('aria') || key === 'role')
                        .filter(([_, value]) => value)
                        .map(([key, value]) => (
                          <div key={key} className="p-2 rounded bg-background border border-grep-2 text-xs">
                            <span className="text-grep-7 font-mono">{key}:</span>{' '}
                            <span className="text-foreground font-mono">{String(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Detection Strategies */}
                <div>
                  <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">
                    Detection Strategy Scores
                  </div>
                  <div className="space-y-2">
                    {Object.entries(component.metadata.detectionStrategies).map(([strategy, score]) => (
                      <div key={strategy} className="flex items-center gap-2">
                        <div className="text-xs text-grep-7 capitalize w-32">{strategy.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="flex-1 bg-grep-2 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <div className="text-xs font-mono text-foreground w-12 text-right">{score}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Selectors */}
                <div>
                  <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">
                    CSS Selectors ({component.selectors.length})
                  </div>
                  <div className="space-y-1">
                    {component.selectors.slice(0, 10).map((selector, i) => (
                      <code key={i} className="block text-xs text-grep-9 font-mono bg-background px-2 py-1 rounded border border-grep-2">
                        {selector}
                      </code>
                    ))}
                    {component.selectors.length > 10 && (
                      <div className="text-xs text-grep-7 px-2">
                        +{component.selectors.length - 10} more selectors
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
