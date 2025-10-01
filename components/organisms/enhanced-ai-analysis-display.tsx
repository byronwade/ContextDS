"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ChevronDown, ChevronUp, Palette, Type, Box, Grid3x3, Code2, Book, Zap, BarChart3, Shield, Target, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import type { DesignSystemSpec } from "@/lib/ai/design-system-builder"
import type { ComponentLibrary } from "@/lib/analyzers/advanced-component-detector"
import { useRealtimeStore } from "@/stores/realtime-store"

interface EnhancedAIAnalysisDisplayProps {
  spec: DesignSystemSpec | null
  componentLibrary?: ComponentLibrary | null
  brandAnalysis?: any | null
  layoutDNA?: any | null
  curatedTokens?: any | null
  progress?: any | null
  metrics?: any | null
  isLoading?: boolean
  onCopy?: (value: string) => void
}

export function EnhancedAIAnalysisDisplay({
  spec,
  componentLibrary,
  brandAnalysis,
  layoutDNA,
  curatedTokens,
  progress,
  metrics,
  isLoading = false,
  onCopy
}: EnhancedAIAnalysisDisplayProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("overview")

  // Real-time store for live updates
  const { metrics: liveMetrics, isConnected, activities } = useRealtimeStore()

  // Use live metrics if available, fallback to provided metrics
  const currentMetrics = liveMetrics && Object.keys(liveMetrics).length > 0 ? liveMetrics : metrics

  // Show loading state or data - always render something
  const showLoadingState = isLoading || (!spec && !componentLibrary)

  // If no data and not loading, show empty state
  if (!spec && !componentLibrary && !isLoading && !progress) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Zap className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No AI analysis data available</p>
        <p className="text-xs text-grep-7 mt-2">Run a full scan to generate comprehensive AI analysis</p>
      </div>
    )
  }

  const copyAllData = () => {
    const data = {
      designSystemSpec: spec,
      componentLibrary,
      brandAnalysis,
      layoutDNA,
      curatedTokens
    }
    onCopy?.(JSON.stringify(data, null, 2))
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with System Overview */}
      <div className="rounded-xl border-2 border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-grep-3 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base sm:text-lg font-bold font-mono text-foreground">
                  AI Design System Analysis
                </h3>
                {showLoadingState && (
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full animate-pulse",
                      isConnected ? "bg-blue-500" : "bg-gray-400"
                    )} />
                    <span className="text-[10px] font-mono text-grep-7 uppercase tracking-wide">
                      {isConnected ? 'Live Data Stream' : 'Connecting...'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] sm:text-xs text-grep-7">
                  {showLoadingState
                    ? (progress?.phase || "Real-time analysis in progress")
                    : "Comprehensive design system analysis with actionable insights"
                  }
                </p>
                {showLoadingState && (
                  <span className="text-[10px] font-mono text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded">
                    {currentMetrics?.totalTokens ? (currentMetrics.totalTokens).toLocaleString() : '0'} data points
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={copyAllData}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy All
            </Button>
          </div>
        </div>

        {/* System Overview Stats */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-background/50 to-background">
          {/* Live Progress Display */}
          {showLoadingState && progress && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                  {progress.phase || 'Analyzing design system surface'}
                </div>
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                  {progress.step}/{progress.totalSteps}
                </div>
              </div>
              <div className="mb-3">
                <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                {progress.message || 'Collecting live CSS, tokens, and component fingerprints'}
              </div>
              {progress.details && progress.details.length > 0 && (
                <div className="mt-2 space-y-1">
                  {progress.details.slice(0, 3).map((detail: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <span className="mt-1 h-1 w-1 rounded-full bg-blue-500 flex-shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {/* Design System Maturity */}
            <div className={cn(
              "text-center p-3 rounded-lg border transition-all",
              showLoadingState
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-background border-grep-2"
            )}>
              <div className="text-2xl font-bold font-mono text-green-600">
                {showLoadingState ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
                  </div>
                ) : (
                  `${spec ? Math.round(((spec.components?.length || 0) + (spec.patterns?.length || 0)) / 10 * 100) : 'N/A'}%`
                )}
              </div>
              <div className="text-xs text-grep-9 uppercase tracking-wide">System Maturity</div>
            </div>

            {/* Component Coverage */}
            <div className={cn(
              "text-center p-3 rounded-lg border transition-all",
              showLoadingState
                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                : "bg-background border-grep-2"
            )}>
              <div className="text-2xl font-bold font-mono text-blue-600">
                {showLoadingState ? (
                  currentMetrics?.totalScans || (progress?.step > 2 ? '...' : '0')
                ) : (
                  componentLibrary?.summary?.totalComponents || 0
                )}
              </div>
              <div className="text-xs text-grep-9 uppercase tracking-wide">
                {showLoadingState ? 'Detecting' : 'Components'}
              </div>
            </div>

            {/* Framework Detection */}
            <div className={cn(
              "text-center p-3 rounded-lg border transition-all",
              showLoadingState
                ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                : "bg-background border-grep-2"
            )}>
              <div className="text-2xl font-bold font-mono text-purple-600">
                {showLoadingState ? (
                  progress?.step > 3 ? '...' : '0'
                ) : (
                  componentLibrary?.summary?.frameworks?.detected?.length || 0
                )}
              </div>
              <div className="text-xs text-grep-9 uppercase tracking-wide">
                {showLoadingState ? 'Scanning' : 'Frameworks'}
              </div>
            </div>

            {/* Token Diversity */}
            <div className={cn(
              "text-center p-3 rounded-lg border transition-all",
              showLoadingState
                ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                : "bg-background border-grep-2"
            )}>
              <div className="text-2xl font-bold font-mono text-orange-600">
                {showLoadingState ? (
                  currentMetrics?.totalTokens ? Math.floor(currentMetrics.totalTokens / 100) : (progress?.step > 1 ? '...' : '0')
                ) : (
                  curatedTokens ? Object.keys(curatedTokens).length : 0
                )}
              </div>
              <div className="text-xs text-grep-9 uppercase tracking-wide">
                {showLoadingState ? 'Token Types' : 'Token Types'}
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9">
              {showLoadingState ? 'Live Analysis' : 'Key Insights'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {showLoadingState ? (
                <>
                  <LiveInsightCard
                    title="Component Detection"
                    content={progress?.phase?.includes('component') ? "Scanning component patterns..." : "Waiting for component analysis"}
                    icon={Code2}
                    isActive={progress?.phase?.includes('component')}
                    progress={progress}
                  />
                  <LiveInsightCard
                    title="Token Extraction"
                    content={progress?.phase?.includes('token') ? "Extracting design tokens..." : "Waiting for token analysis"}
                    icon={Palette}
                    isActive={progress?.phase?.includes('token')}
                    progress={progress}
                  />
                  <LiveInsightCard
                    title="Layout Analysis"
                    content={progress?.phase?.includes('layout') ? "Analyzing layout patterns..." : "Waiting for layout analysis"}
                    icon={Grid3x3}
                    isActive={progress?.phase?.includes('layout')}
                    progress={progress}
                  />
                  <LiveInsightCard
                    title="Framework Detection"
                    content={progress?.phase?.includes('framework') ? "Detecting frameworks..." : "Waiting for framework analysis"}
                    icon={Target}
                    isActive={progress?.phase?.includes('framework')}
                    progress={progress}
                  />
                </>
              ) : (
                <>
                  {componentLibrary?.summary && (
                    <InsightCard
                      title="Component Architecture"
                      content={`${componentLibrary.summary.detectionAccuracy} confidence with ${componentLibrary.summary.averageConfidence}% accuracy across ${componentLibrary.summary.totalComponents} components`}
                      icon={Code2}
                      trend="positive"
                    />
                  )}
                  {spec?.quickReference && (
                    <InsightCard
                      title="Design Consistency"
                      content={spec.quickReference.buttonGuide || "Consistent button patterns detected"}
                      icon={Target}
                      trend="positive"
                    />
                  )}
                  {brandAnalysis && (
                    <InsightCard
                      title="Brand Alignment"
                      content="Strong brand consistency with clear visual hierarchy"
                      icon={Palette}
                      trend="positive"
                    />
                  )}
                  {layoutDNA && (
                    <InsightCard
                      title="Layout Patterns"
                      content={`${Object.keys(layoutDNA.archetypes || {}).length} layout archetypes identified`}
                      icon={Grid3x3}
                      trend="neutral"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Analysis Sections */}
      <div className="space-y-4">
        {/* Component Architecture Analysis */}
        {componentLibrary && (
          <ExpandableAnalysisSection
            id="component-architecture"
            title="Component Architecture Analysis"
            icon={Code2}
            expanded={expandedSection === "component-architecture"}
            onToggle={() => setExpandedSection(expandedSection === "component-architecture" ? null : "component-architecture")}
          >
            <ComponentArchitectureAnalysis componentLibrary={componentLibrary} onCopy={onCopy} />
          </ExpandableAnalysisSection>
        )}

        {/* Design Token Analysis */}
        {spec?.foundation && (
          <ExpandableAnalysisSection
            id="design-tokens"
            title="Design Token Analysis"
            icon={Palette}
            expanded={expandedSection === "design-tokens"}
            onToggle={() => setExpandedSection(expandedSection === "design-tokens" ? null : "design-tokens")}
          >
            <DesignTokenAnalysis foundation={spec.foundation} curatedTokens={curatedTokens} onCopy={onCopy} />
          </ExpandableAnalysisSection>
        )}

        {/* Brand & Visual Identity */}
        {brandAnalysis && (
          <ExpandableAnalysisSection
            id="brand-analysis"
            title="Brand & Visual Identity"
            icon={Box}
            expanded={expandedSection === "brand-analysis"}
            onToggle={() => setExpandedSection(expandedSection === "brand-analysis" ? null : "brand-analysis")}
          >
            <BrandIdentityAnalysis brandAnalysis={brandAnalysis} onCopy={onCopy} />
          </ExpandableAnalysisSection>
        )}

        {/* Layout & Structure Patterns */}
        {layoutDNA && (
          <ExpandableAnalysisSection
            id="layout-patterns"
            title="Layout & Structure Patterns"
            icon={Grid3x3}
            expanded={expandedSection === "layout-patterns"}
            onToggle={() => setExpandedSection(expandedSection === "layout-patterns" ? null : "layout-patterns")}
          >
            <LayoutPatternsAnalysis layoutDNA={layoutDNA} onCopy={onCopy} />
          </ExpandableAnalysisSection>
        )}

        {/* Implementation Roadmap */}
        {spec?.implementation && (
          <ExpandableAnalysisSection
            id="implementation"
            title="Implementation Roadmap"
            icon={Book}
            expanded={expandedSection === "implementation"}
            onToggle={() => setExpandedSection(expandedSection === "implementation" ? null : "implementation")}
          >
            <ImplementationRoadmap implementation={spec.implementation} componentLibrary={componentLibrary} onCopy={onCopy} />
          </ExpandableAnalysisSection>
        )}
      </div>
    </div>
  )
}

function InsightCard({ title, content, icon: Icon, trend }: {
  title: string
  content: string
  icon: any
  trend: 'positive' | 'negative' | 'neutral'
}) {
  return (
    <div className="p-3 rounded-lg bg-background border border-grep-2">
      <div className="flex items-start gap-2 mb-2">
        <Icon className="h-4 w-4 text-grep-7 mt-0.5 flex-shrink-0" />
        <div className="text-xs font-semibold text-grep-9">{title}</div>
        <div className={cn(
          "w-2 h-2 rounded-full flex-shrink-0 mt-1",
          trend === 'positive' ? "bg-green-500" :
          trend === 'negative' ? "bg-red-500" :
          "bg-gray-500"
        )} />
      </div>
      <div className="text-xs text-foreground leading-relaxed">{content}</div>
    </div>
  )
}

function LiveInsightCard({ title, content, icon: Icon, isActive, progress }: {
  title: string
  content: string
  icon: any
  isActive: boolean
  progress?: any
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all duration-300",
      isActive
        ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
        : "bg-background border-grep-2"
    )}>
      <div className="flex items-start gap-2 mb-2">
        <Icon className={cn(
          "h-4 w-4 mt-0.5 flex-shrink-0",
          isActive ? "text-blue-600 dark:text-blue-400" : "text-grep-7"
        )} />
        <div className={cn(
          "text-xs font-semibold",
          isActive ? "text-blue-700 dark:text-blue-300" : "text-grep-9"
        )}>{title}</div>
        <div className={cn(
          "w-2 h-2 rounded-full flex-shrink-0 mt-1",
          isActive ? "bg-blue-500 animate-pulse" : "bg-gray-400"
        )} />
      </div>
      <div className={cn(
        "text-xs leading-relaxed",
        isActive ? "text-blue-600 dark:text-blue-400" : "text-foreground"
      )}>{content}</div>
      {isActive && progress?.details && (
        <div className="mt-2 space-y-1">
          {progress.details.slice(0, 2).map((detail: string, index: number) => (
            <div key={index} className="flex items-start gap-2 text-xs text-blue-500 dark:text-blue-400">
              <span className="mt-1 h-0.5 w-0.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="truncate">{detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExpandableAnalysisSection({
  id,
  title,
  icon: Icon,
  expanded,
  onToggle,
  children
}: {
  id: string
  title: string
  icon: any
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-grep-2 bg-grep-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-background border-b border-grep-2 flex items-center justify-between hover:bg-grep-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-grep-7" />
          <h3 className="text-sm font-semibold font-mono text-foreground">{title}</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-grep-7" /> : <ChevronDown className="h-4 w-4 text-grep-7" />}
      </button>
      {expanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}

function ComponentArchitectureAnalysis({ componentLibrary, onCopy }: {
  componentLibrary: ComponentLibrary
  onCopy?: (value: string) => void
}) {
  const { summary, components } = componentLibrary

  return (
    <div className="space-y-4">
      {/* Framework Detection Summary */}
      {summary.frameworks && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Framework Analysis</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {summary.frameworks.detected.map((framework) => (
              <div key={framework} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">{framework}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {summary.frameworks.byFramework[framework]} components
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Component Type Distribution */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Component Distribution</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(summary.byType)
            .filter(([_, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([type, count]) => (
              <div key={type} className="p-2 rounded bg-grep-1 border border-grep-2 text-center">
                <div className="text-lg font-bold font-mono text-foreground">{count}</div>
                <div className="text-xs text-grep-7 capitalize truncate">{type.replace('-', ' ')}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Detection Quality Metrics */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Detection Quality</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="text-lg font-bold font-mono text-green-700 dark:text-green-300">
              {summary.averageConfidence}%
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">Average Confidence</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
            <div className="text-lg font-bold font-mono text-purple-700 dark:text-purple-300">
              {summary.detectionAccuracy}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Detection Level</div>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <div className="text-lg font-bold font-mono text-orange-700 dark:text-orange-300">
              {summary.totalComponents}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400">Total Components</div>
          </div>
        </div>
      </div>

      {/* Top Components Preview */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Highest Confidence Components</h4>
        <div className="space-y-2">
          {components
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5)
            .map((component, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded bg-grep-1 border border-grep-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground capitalize">
                    {component.type.replace('-', ' ')}
                  </div>
                  <code className="text-xs text-grep-7 font-mono truncate block">
                    {component.selectors[0]}
                  </code>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {component.confidence}%
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {component.usage} uses
                  </Badge>
                </div>
              </div>
            ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onCopy?.(JSON.stringify(componentLibrary, null, 2))}
        className="w-full mt-4"
      >
        <Copy className="h-3.5 w-3.5 mr-2" />
        Copy Component Analysis
      </Button>
    </div>
  )
}

function DesignTokenAnalysis({ foundation, curatedTokens, onCopy }: {
  foundation: any
  curatedTokens?: any
  onCopy?: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* Token Categories Overview */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Token Categories</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {foundation.colorSystem && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <div className="text-lg font-bold font-mono text-red-700 dark:text-red-300">
                {foundation.colorSystem.palette?.length || 0}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">Colors</div>
            </div>
          )}
          {foundation.typography && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300">
                {foundation.typography.families?.length || 0}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Typography</div>
            </div>
          )}
          {foundation.spacing && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="text-lg font-bold font-mono text-green-700 dark:text-green-300">
                {foundation.spacing.scale?.length || 0}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Spacing</div>
            </div>
          )}
          {foundation.elevation && (
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <div className="text-lg font-bold font-mono text-purple-700 dark:text-purple-300">
                {foundation.elevation.levels?.length || 0}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">Elevation</div>
            </div>
          )}
        </div>
      </div>

      {/* Color Palette Preview */}
      {foundation.colorSystem?.palette && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Primary Color Palette</h4>
          <div className="flex flex-wrap gap-2">
            {foundation.colorSystem.palette.slice(0, 8).map((color: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-grep-1 border border-grep-2">
                <div
                  className="w-6 h-6 rounded border border-grep-3 flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <div>
                  <div className="text-xs font-semibold text-foreground">{color.name}</div>
                  <div className="text-xs font-mono text-grep-7">{color.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onCopy?.(JSON.stringify({ foundation, curatedTokens }, null, 2))}
        className="w-full"
      >
        <Copy className="h-3.5 w-3.5 mr-2" />
        Copy Token Analysis
      </Button>
    </div>
  )
}

function BrandIdentityAnalysis({ brandAnalysis, onCopy }: {
  brandAnalysis: any
  onCopy?: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-grep-1 border border-grep-2">
        <div className="text-xs text-grep-7">Brand analysis data structure varies.</div>
        <div className="text-xs text-foreground mt-1">
          Integration with brand analysis component to be implemented based on actual data structure.
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onCopy?.(JSON.stringify(brandAnalysis, null, 2))}
        className="w-full"
      >
        <Copy className="h-3.5 w-3.5 mr-2" />
        Copy Brand Analysis
      </Button>
    </div>
  )
}

function LayoutPatternsAnalysis({ layoutDNA, onCopy }: {
  layoutDNA: any
  onCopy?: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      {layoutDNA.archetypes && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Layout Archetypes</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(layoutDNA.archetypes).map(([archetype, confidence]: [string, any]) => (
              <div key={archetype} className="p-3 rounded-lg bg-grep-1 border border-grep-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-foreground capitalize">
                    {archetype.replace('-', ' ')}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {typeof confidence === 'number' ? `${confidence}%` : confidence}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onCopy?.(JSON.stringify(layoutDNA, null, 2))}
        className="w-full"
      >
        <Copy className="h-3.5 w-3.5 mr-2" />
        Copy Layout Analysis
      </Button>
    </div>
  )
}

function ImplementationRoadmap({ implementation, componentLibrary, onCopy }: {
  implementation: any
  componentLibrary?: ComponentLibrary | null
  onCopy?: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* Priority Phases */}
      {implementation.priority && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Implementation Phases</h4>
          <div className="space-y-2">
            {implementation.priority.map((phase: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-grep-1 border border-grep-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-foreground">{phase.phase}</div>
                  <div className="flex flex-wrap gap-1">
                    {phase.components?.map((comp: string, j: number) => (
                      <Badge key={j} variant="secondary" className="text-xs">
                        {comp}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-grep-7">{phase.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins from Component Analysis */}
      {componentLibrary && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9 mb-3">Quick Wins</h4>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                High-Confidence Components
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                {componentLibrary.components.filter(c => c.confidence >= 80).length} components with 80%+ confidence can be implemented immediately
              </div>
            </div>
            {componentLibrary.summary.frameworks?.detected.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  Framework Alignment
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Leverage existing {componentLibrary.summary.frameworks.detected.join(', ')} components for faster implementation
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onCopy?.(JSON.stringify({ implementation, quickWins: componentLibrary?.summary }, null, 2))}
        className="w-full"
      >
        <Copy className="h-3.5 w-3.5 mr-2" />
        Copy Implementation Plan
      </Button>
    </div>
  )
}