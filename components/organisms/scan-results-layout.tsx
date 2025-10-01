"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  Copy,
  Download,
  Share2,
  History,
  TrendingUp,
  Target,
  Zap,
  Shield,
  Lightbulb,
  AlertCircle,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultsTabs, type TabId } from "./results-tabs"
import { MetricCard } from "@/components/molecules/metric-card"
import { TokenGrid } from "@/components/molecules/token-grid"
import { InsightCard } from "@/components/molecules/insight-card"
import { ComponentShowcase } from "@/components/molecules/component-showcase"
import { ScreenshotGallery } from "@/components/molecules/screenshot-gallery"
import { FontPreviewCard } from "@/components/molecules/font-preview"

type ScanResult = any

interface ScanProgress {
  step: number
  totalSteps: number
  phase: string
  message: string
  details?: string[]
  timestamp: number
}

interface ScanResultsLayoutProps {
  result: ScanResult
  isLoading: boolean
  scanId?: string | null
  progress?: ScanProgress | null
  metrics?: any | null
  error?: string | null
  onCopy: (value: string) => void
  onExport: (format: string) => void
  onShare: () => void
  showDiff?: boolean
  onToggleDiff?: () => void
  onNewScan?: () => void
  onScanHistory?: () => void
}

export function ScanResultsLayout({
  result,
  isLoading,
  scanId,
  progress,
  metrics,
  error,
  onCopy,
  onExport,
  onShare,
  showDiff,
  onToggleDiff,
  onNewScan,
  onScanHistory
}: ScanResultsLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  // Calculate tab counts
  const tabCounts = useMemo(() => ({
    tokens: result?.curatedTokens ? (
      (result.curatedTokens.colors?.length || 0) +
      (result.curatedTokens.typography?.families?.length || 0) +
      (result.curatedTokens.spacing?.length || 0) +
      (result.curatedTokens.radius?.length || 0) +
      (result.curatedTokens.shadows?.length || 0)
    ) : 0,
    components: result?.componentLibrary?.summary?.totalComponents || 0,
    insights: result?.comprehensiveAnalysis ? (
      (result.comprehensiveAnalysis.recommendations?.quick_wins?.length || 0) +
      (result.comprehensiveAnalysis.recommendations?.critical?.length || 0)
    ) : 0,
    screenshots: scanId ? "•" : 0 // Show indicator if scanId exists
  }), [result, scanId])

  // Show error state if there's an error
  if (error && !isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Scan Failed</h3>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onNewScan} variant="default">
              <Target className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Loading progress bar */}
      {isLoading && progress && (
        <div className="absolute top-0 left-0 right-0 z-50 h-0.5 bg-grep-2">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 border-b border-grep-2 bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isLoading ? "bg-blue-500 animate-pulse" : "bg-green-500"
            )} />
            {result?.favicon && (
              <img
                src={result.favicon}
                alt={`${result.domain} logo`}
                className="w-8 h-8 rounded object-contain"
                onError={(e) => {
                  // Hide image if it fails to load
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {result?.domain || "Analyzing..."}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {result?.versionInfo && (
                  <Badge variant="secondary" className="h-5 font-mono text-[10px]">
                    v{result.versionInfo.versionNumber}
                  </Badge>
                )}
                {isLoading && progress && (
                  <span className="text-xs text-grep-7 font-mono">
                    {progress.phase} ({progress.step}/{progress.totalSteps})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {result?.versionInfo?.diff && onToggleDiff && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleDiff}
                className="h-8 text-xs"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                Changes
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="h-8 text-xs"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              Share
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                  <ChevronDown className="h-3 w-3 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Standards & Specs</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onExport('w3c-json')}>
                  W3C Design Tokens (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('style-dictionary')}>
                  Style Dictionary
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Design Tools</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onExport('figma')}>
                  Figma Tokens Plugin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('figma-variables')}>
                  Figma Variables API
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Web Frameworks</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onExport('tailwind')}>
                  Tailwind CSS v4
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('css')}>
                  CSS Custom Properties
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('scss')}>
                  SCSS Variables
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('sass')}>
                  Sass (Indented)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('less')}>
                  Less Variables
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('stylus')}>
                  Stylus
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>JavaScript/TypeScript</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onExport('ts')}>
                  TypeScript (Typed)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('js')}>
                  JavaScript (ES6)
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Mobile Platforms</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onExport('swift')}>
                  iOS Swift
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('kotlin')}>
                  Android Kotlin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('xml')}>
                  Android XML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('dart')}>
                  Flutter Dart
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Other Formats</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onExport('json')}>
                  Raw JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('yaml')}>
                  YAML
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ResultsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={tabCounts}
      />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === "overview" && (
            <OverviewTab
              result={result}
              isLoading={isLoading}
              progress={progress}
              metrics={metrics}
              onCopy={onCopy}
            />
          )}

          {activeTab === "tokens" && (
            <TokensTab
              result={result}
              isLoading={isLoading}
              onCopy={onCopy}
            />
          )}

          {activeTab === "components" && (
            <ComponentsTab
              result={result}
              isLoading={isLoading}
              onCopy={onCopy}
            />
          )}

          {activeTab === "analysis" && (
            <AnalysisTab
              result={result}
              isLoading={isLoading}
            />
          )}

          {activeTab === "layout" && (
            <LayoutTab
              result={result}
              isLoading={isLoading}
            />
          )}

          {activeTab === "recommendations" && (
            <RecommendationsTab
              result={result}
              isLoading={isLoading}
            />
          )}

          {activeTab === "screenshots" && (
            <ScreenshotsTab scanId={scanId} isLoading={isLoading} />
          )}
        </div>
      </div>
    </div>
  )
}

// Overview Tab
function OverviewTab({ result, isLoading, progress, metrics, onCopy }: any) {
  const summary = result?.summary || {}
  const comprehensiveAnalysis = result?.comprehensiveAnalysis

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Design Tokens"
          value={summary.tokensExtracted || 0}
          icon={TrendingUp}
          status={summary.tokensExtracted > 20 ? "success" : "warning"}
          subtitle={summary.curatedCount ? `${summary.curatedCount.colors}c · ${summary.curatedCount.fonts}f · ${summary.curatedCount.spacing}s` : undefined}
          isLoading={isLoading && !summary.tokensExtracted}
        />

        <MetricCard
          label="Confidence"
          value={`${summary.confidence || 0}%`}
          icon={Shield}
          status={summary.confidence >= 80 ? "success" : summary.confidence >= 60 ? "info" : "warning"}
          progress={summary.confidence}
          isLoading={isLoading && !summary.confidence}
        />

        <MetricCard
          label="Components"
          value={result?.componentLibrary?.summary?.totalComponents || 0}
          icon={Target}
          status="info"
          subtitle={result?.componentLibrary?.summary?.detectionAccuracy}
          isLoading={isLoading && !result?.componentLibrary}
        />

        <MetricCard
          label="System Maturity"
          value={comprehensiveAnalysis?.designSystemScore?.maturity || "N/A"}
          icon={Zap}
          status={comprehensiveAnalysis?.designSystemScore?.overall >= 70 ? "success" : "info"}
          subtitle={comprehensiveAnalysis?.designSystemScore?.overall ? `${comprehensiveAnalysis.designSystemScore.overall}% score` : undefined}
          isLoading={isLoading && !comprehensiveAnalysis}
        />
      </div>

      {/* Top Insights */}
      {comprehensiveAnalysis && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Key Findings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Brand Identity */}
            {comprehensiveAnalysis.brandIdentity && (
              <InsightCard
                title="Brand Identity"
                description={`${comprehensiveAnalysis.brandIdentity.colorPersonality}. Typography: ${comprehensiveAnalysis.brandIdentity.typographicVoice}.`}
                icon={Sparkles}
                severity="info"
                metrics={[
                  { label: "Primary Colors", value: comprehensiveAnalysis.brandIdentity.primaryColors?.length || 0 },
                  { label: "Industry", value: comprehensiveAnalysis.brandIdentity.industryAlignment || "N/A" }
                ]}
              />
            )}

            {/* Accessibility */}
            {comprehensiveAnalysis.accessibility && (
              <InsightCard
                title="Accessibility"
                description={`WCAG ${comprehensiveAnalysis.accessibility.wcagLevel} compliance with ${comprehensiveAnalysis.accessibility.contrastIssues?.length || 0} contrast issues.`}
                icon={Shield}
                severity={comprehensiveAnalysis.accessibility.wcagLevel === "AAA" ? "info" : "warning"}
                metrics={[
                  { label: "Score", value: `${comprehensiveAnalysis.accessibility.overallScore}%` },
                  { label: "Focus Indicators", value: comprehensiveAnalysis.accessibility.focusIndicators?.quality || "N/A" }
                ]}
              />
            )}

            {/* Critical Issues */}
            {comprehensiveAnalysis.recommendations?.critical && comprehensiveAnalysis.recommendations.critical.length > 0 && (
              <InsightCard
                title="Critical Issues"
                description={comprehensiveAnalysis.recommendations.critical[0].issue}
                icon={AlertCircle}
                severity="critical"
                recommendation={comprehensiveAnalysis.recommendations.critical[0].solution}
              />
            )}

            {/* Quick Win */}
            {comprehensiveAnalysis.recommendations?.quick_wins && comprehensiveAnalysis.recommendations.quick_wins[0] && (
              <InsightCard
                title={comprehensiveAnalysis.recommendations.quick_wins[0].title}
                description={comprehensiveAnalysis.recommendations.quick_wins[0].description}
                icon={Lightbulb}
                severity="info"
                impact={comprehensiveAnalysis.recommendations.quick_wins[0].impact}
                effort={comprehensiveAnalysis.recommendations.quick_wins[0].effort}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Tokens Tab
function TokensTab({ result, isLoading, onCopy }: any) {
  const tokens = result?.curatedTokens || {}

  return (
    <div className="space-y-8">
      {/* Colors Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Colors</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(JSON.stringify(tokens.colors || [], null, 2))}
            disabled={!tokens.colors || tokens.colors.length === 0}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy All
          </Button>
        </div>
        {isLoading && (!tokens.colors || tokens.colors.length === 0) ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-grep-2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tokens.colors && tokens.colors.length > 0 ? (
          <TokenGrid tokens={tokens.colors} type="color" columns={6} onCopy={onCopy} />
        ) : (
          <div className="text-center py-8 text-grep-7">
            <div className="w-12 h-12 rounded-full bg-grep-2 mx-auto mb-2" />
            <p className="text-sm">No colors detected yet</p>
          </div>
        )}
      </div>

      {/* Typography Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Typography</h2>
        {isLoading && (!tokens.typography?.families || tokens.typography.families.length === 0) ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 bg-grep-2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tokens.typography?.families && tokens.typography.families.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tokens.typography.families.map((font: any, i: number) => (
              <FontPreviewCard
                key={i}
                fontFamily={font.value}
                percentage={font.percentage}
                onCopy={() => onCopy(font.value)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-grep-7">
            <div className="w-12 h-12 rounded bg-grep-2 mx-auto mb-2" />
            <p className="text-sm">No fonts detected yet</p>
          </div>
        )}
      </div>

      {/* Spacing Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Spacing</h2>
        {isLoading && (!tokens.spacing || tokens.spacing.length === 0) ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-grep-2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tokens.spacing && tokens.spacing.length > 0 ? (
          <TokenGrid tokens={tokens.spacing} type="spacing" columns={4} onCopy={onCopy} />
        ) : (
          <div className="text-center py-8 text-grep-7">
            <div className="w-12 h-4 bg-grep-2 mx-auto mb-2" />
            <p className="text-sm">No spacing detected yet</p>
          </div>
        )}
      </div>

      {/* Border Radius Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Border Radius</h2>
        {isLoading && (!tokens.radius || tokens.radius.length === 0) ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-grep-2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tokens.radius && tokens.radius.length > 0 ? (
          <TokenGrid tokens={tokens.radius} type="radius" columns={4} onCopy={onCopy} />
        ) : (
          <div className="text-center py-8 text-grep-7">
            <div className="w-12 h-12 rounded-full bg-grep-2 mx-auto mb-2" />
            <p className="text-sm">No border radius detected yet</p>
          </div>
        )}
      </div>

      {/* Shadows Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Shadows</h2>
        {isLoading && (!tokens.shadows || tokens.shadows.length === 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-grep-2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tokens.shadows && tokens.shadows.length > 0 ? (
          <TokenGrid tokens={tokens.shadows} type="shadow" columns={3} onCopy={onCopy} />
        ) : (
          <div className="text-center py-8 text-grep-7">
            <div className="w-12 h-12 bg-grep-2 mx-auto mb-2 shadow-lg" />
            <p className="text-sm">No shadows detected yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Components Tab
function ComponentsTab({ result, isLoading, onCopy }: any) {
  const componentLibrary = result?.componentLibrary
  const { components = [], summary = {} } = componentLibrary || {}

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            {isLoading && !summary.totalComponents ? (
              <div className="text-2xl font-bold bg-grep-2 h-8 w-12 mx-auto rounded animate-pulse mb-1" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{summary.totalComponents || 0}</div>
            )}
            <div className="text-xs text-grep-7 uppercase tracking-wide">Total Components</div>
          </div>
          <div>
            {isLoading && !summary.averageConfidence ? (
              <div className="text-2xl font-bold bg-grep-2 h-8 w-12 mx-auto rounded animate-pulse mb-1" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{summary.averageConfidence || 0}%</div>
            )}
            <div className="text-xs text-grep-7 uppercase tracking-wide">Avg Confidence</div>
          </div>
          <div>
            {isLoading && !summary.detectionAccuracy ? (
              <div className="text-2xl font-bold bg-grep-2 h-8 w-16 mx-auto rounded animate-pulse mb-1" />
            ) : (
              <div className="text-2xl font-bold text-foreground capitalize">{summary.detectionAccuracy || "N/A"}</div>
            )}
            <div className="text-xs text-grep-7 uppercase tracking-wide">Detection Quality</div>
          </div>
          <div>
            {isLoading && !summary.byType ? (
              <div className="text-2xl font-bold bg-grep-2 h-8 w-8 mx-auto rounded animate-pulse mb-1" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{summary.byType ? Object.keys(summary.byType).length : 0}</div>
            )}
            <div className="text-xs text-grep-7 uppercase tracking-wide">Component Types</div>
          </div>
        </div>
      </div>

      {/* Component List */}
      <div className="space-y-3">
        {isLoading && components.length === 0 ? (
          // Loading skeleton
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-grep-2 rounded-lg animate-pulse" />
          ))
        ) : components.length > 0 ? (
          components.map((component: any, index: number) => (
            <ComponentShowcase
              key={index}
              type={component.type}
              variant={component.variant}
              confidence={Math.min(100, Math.round(component.confidence))}
              usage={component.usage}
              tokens={component.tokens}
              examples={component.examples}
              onCopy={onCopy}
            />
          ))
        ) : (
          <div className="text-center py-8 text-grep-7">
            <div className="w-12 h-12 rounded bg-grep-2 mx-auto mb-2" />
            <p className="text-sm">No components detected yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Analysis Tab
function AnalysisTab({ result, isLoading }: any) {
  const analysis = result?.comprehensiveAnalysis

  return (
    <div className="space-y-8">
      {/* Design System Score */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Design System Maturity</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Overall"
            value={`${analysis?.designSystemScore?.overall || 0}%`}
            status={analysis?.designSystemScore?.overall >= 70 ? "success" : "info"}
            progress={analysis?.designSystemScore?.overall}
            isLoading={isLoading && !analysis?.designSystemScore}
          />
          <MetricCard
            label="Completeness"
            value={`${analysis?.designSystemScore?.completeness || 0}%`}
            status={analysis?.designSystemScore?.completeness >= 70 ? "success" : "info"}
            progress={analysis?.designSystemScore?.completeness}
            isLoading={isLoading && !analysis?.designSystemScore}
          />
          <MetricCard
            label="Consistency"
            value={`${analysis?.designSystemScore?.consistency || 0}%`}
            status={analysis?.designSystemScore?.consistency >= 70 ? "success" : "info"}
            progress={analysis?.designSystemScore?.consistency}
            isLoading={isLoading && !analysis?.designSystemScore}
          />
          <MetricCard
            label="Scalability"
            value={`${analysis?.designSystemScore?.scalability || 0}%`}
            status={analysis?.designSystemScore?.scalability >= 70 ? "success" : "info"}
            progress={analysis?.designSystemScore?.scalability}
            isLoading={isLoading && !analysis?.designSystemScore}
          />
        </div>
      </div>

      {/* Component Architecture */}
      {analysis?.componentArchitecture && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Component Architecture</h2>
          <InsightCard
            title="Detected Patterns"
            description={`${analysis.componentArchitecture?.detectedPatterns?.length || 0} patterns found with ${analysis.componentArchitecture?.reusability || 0}% reusability score.`}
            icon={Target}
            severity="info"
            metrics={[
              { label: "Complexity", value: analysis.componentArchitecture?.complexity || "Unknown" },
              { label: "Button Variants", value: analysis.componentArchitecture?.buttonVariants?.length || 0 }
            ]}
          />
        </div>
      )}

      {/* Accessibility */}
      {analysis?.accessibility && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Accessibility Audit</h2>
          <div className="grid gap-4">
            <InsightCard
              title={`WCAG ${analysis.accessibility?.wcagLevel || "Unknown"} Compliance`}
              description={`Overall accessibility score: ${analysis.accessibility?.overallScore || 0}%. ${analysis.accessibility?.contrastIssues?.length || 0} contrast issues detected.`}
              icon={Shield}
              severity={analysis.accessibility?.wcagLevel === "AAA" ? "info" : analysis.accessibility?.wcagLevel === "AA" ? "medium" : "high"}
              metrics={[
                { label: "Contrast Issues", value: analysis.accessibility?.contrastIssues?.length || 0 },
                { label: "Focus Quality", value: analysis.accessibility?.focusIndicators?.quality || "Unknown" }
              ]}
            />

            {analysis.accessibility?.contrastIssues?.slice(0, 3).map((issue: any, i: number) => (
              <InsightCard
                key={i}
                title="Contrast Issue"
                description={`${issue.foreground} on ${issue.background} has ratio ${issue.ratio.toFixed(1)}`}
                severity="warning"
                recommendation={issue.recommendation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Brand Identity */}
      {analysis?.brandIdentity && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Brand Analysis</h2>
          <InsightCard
            title="Brand Personality"
            description={`${analysis.brandIdentity?.colorPersonality || "Unknown"} with ${analysis.brandIdentity?.typographicVoice?.toLowerCase() || "unknown"} typography.`}
            icon={Sparkles}
            severity="info"
            metrics={[
              { label: "Visual Style", value: analysis.brandIdentity?.visualStyle?.join(", ") || "Unknown" },
              { label: "Industry", value: analysis.brandIdentity?.industryAlignment || "Unknown" }
            ]}
          />
        </div>
      )}

      {/* Design Patterns */}
      {analysis?.designPatterns && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Design Patterns</h2>
          <div className="grid gap-3">
            {analysis.designPatterns?.identified?.map((pattern: any, i: number) => (
              <InsightCard
                key={i}
                title={pattern.pattern}
                description={`Confidence: ${pattern.confidence}%. Examples: ${pattern.examples.slice(0, 3).join(", ")}`}
                severity="info"
              />
            ))}
          </div>
        </div>
      )}

      {/* Anti-patterns */}
      {analysis?.designPatterns?.antiPatterns && analysis?.designPatterns?.antiPatterns?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Anti-Patterns Detected</h2>
          <div className="grid gap-3">
            {analysis.designPatterns?.antiPatterns?.map((antiPattern: any, i: number) => (
              <InsightCard
                key={i}
                title={antiPattern.issue}
                description=""
                severity={antiPattern.severity}
                recommendation={antiPattern.recommendation}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Layout Tab
function LayoutTab({ result, isLoading }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Layout DNA Analysis</h2>
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-6">
        {isLoading && !result?.layoutDNA ? (
          <div className="space-y-3">
            <div className="h-4 bg-grep-2 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-grep-2 rounded animate-pulse w-1/2" />
            <div className="h-4 bg-grep-2 rounded animate-pulse w-2/3" />
            <div className="h-4 bg-grep-2 rounded animate-pulse w-1/3" />
          </div>
        ) : result?.layoutDNA ? (
          <pre className="text-xs font-mono text-grep-9 overflow-auto">
            {JSON.stringify(result.layoutDNA, null, 2)}
          </pre>
        ) : (
          <div className="text-center py-8 text-grep-7">
            <div className="w-12 h-12 bg-grep-2 mx-auto mb-2 rounded" />
            <p className="text-sm">Layout analysis pending...</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Recommendations Tab
function RecommendationsTab({ result, isLoading }: any) {
  const recommendations = result?.comprehensiveAnalysis?.recommendations

  return (
    <div className="space-y-8">
      {/* Critical Issues */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Critical Issues
        </h2>
        <div className="grid gap-3">
          {isLoading && (!recommendations?.critical || recommendations.critical.length === 0) ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-grep-2 rounded-lg animate-pulse" />
            ))
          ) : recommendations?.critical && recommendations.critical.length > 0 ? (
            recommendations.critical.map((issue: any, i: number) => (
              <InsightCard
                key={i}
                title={issue.issue}
                description=""
                severity="critical"
                recommendation={issue.solution}
              />
            ))
          ) : (
            <div className="text-center py-8 text-grep-7">
              <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm">No critical issues detected</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Wins */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          Quick Wins
        </h2>
        <div className="grid gap-3">
          {isLoading && (!recommendations?.quick_wins || recommendations.quick_wins.length === 0) ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-grep-2 rounded-lg animate-pulse" />
            ))
          ) : recommendations?.quick_wins && recommendations.quick_wins.length > 0 ? (
            recommendations.quick_wins.map((win: any, i: number) => (
              <InsightCard
                key={i}
                title={win.title}
                description={win.description}
                severity="info"
                impact={win.impact}
                effort={win.effort}
              />
            ))
          ) : (
            <div className="text-center py-8 text-grep-7">
              <div className="w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-sm">Analyzing opportunities...</p>
            </div>
          )}
        </div>
      </div>

      {/* Long-term Improvements */}
      {recommendations.long_term && recommendations.long_term.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Long-term Improvements
          </h2>
          <div className="grid gap-3">
            {recommendations.long_term.map((improvement: any, i: number) => (
              <InsightCard
                key={i}
                title={improvement.title}
                description={improvement.description}
                severity="info"
                impact={improvement.impact}
                effort={improvement.effort}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Screenshots Tab
function ScreenshotsTab({ scanId, isLoading }: { scanId: string | null; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Multi-Viewport Screenshots</h2>
      {!scanId && isLoading ? (
        <div className="text-center py-8 text-grep-7">
          <div className="w-12 h-12 bg-grep-2 mx-auto mb-2 rounded animate-pulse" />
          <p className="text-sm">Initializing scan...</p>
        </div>
      ) : scanId ? (
        <ScreenshotGallery scanId={scanId} />
      ) : (
        <div className="text-center py-8 text-grep-7">
          <div className="w-12 h-12 bg-grep-2 mx-auto mb-2 rounded" />
          <p className="text-sm">No scan ID available for screenshots</p>
        </div>
      )}
    </div>
  )
}
