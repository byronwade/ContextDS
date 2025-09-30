"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, AlertTriangle, CheckCircle2, Info, TrendingUp, Zap, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

type ComprehensiveAnalysis = {
  designSystemScore: {
    overall: number
    maturity: string
    completeness: number
    consistency: number
    scalability: number
  }
  componentArchitecture: {
    detectedPatterns: string[]
    buttonVariants: string[]
    formComponents: string[]
    cardPatterns: string[]
    navigationPatterns: string[]
    complexity: string
    reusability: number
  }
  accessibility: {
    wcagLevel: string
    contrastIssues: Array<{
      background: string
      foreground: string
      ratio: number
      recommendation: string
    }>
    colorBlindness: {
      safeForProtanopia: boolean
      safeForDeuteranopia: boolean
      safeForTritanopia: boolean
      recommendations: string[]
    }
    focusIndicators: {
      present: boolean
      quality: string
    }
    overallScore: number
  }
  tokenNamingConventions: {
    strategy: string
    examples: Array<{
      token: string
      rating: string
      suggestion?: string
    }>
    consistencyScore: number
    recommendations: string[]
  }
  designPatterns: {
    identified: Array<{
      pattern: string
      confidence: number
      examples: string[]
    }>
    antiPatterns: Array<{
      issue: string
      severity: string
      recommendation: string
    }>
  }
  brandIdentity: {
    primaryColors: string[]
    colorPersonality: string
    typographicVoice: string
    visualStyle: string[]
    industryAlignment: string
  }
  recommendations: {
    quick_wins: Array<{
      title: string
      description: string
      impact: string
      effort: string
    }>
    long_term: Array<{
      title: string
      description: string
      impact: string
      effort: string
    }>
    critical: Array<{
      issue: string
      solution: string
    }>
  }
}

export function ComprehensiveAnalysisDisplay({ analysis }: { analysis: ComprehensiveAnalysis }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['scores', 'recommendations']))

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const isExpanded = (section: string) => expandedSections.has(section)

  const detectedHighlights = analysis.componentArchitecture.detectedPatterns.slice(0, 3).join(', ')
  const visualHighlights = analysis.brandIdentity.visualStyle.slice(0, 2).join(', ')
  const contrastCount = analysis.accessibility.contrastIssues.length

  const overviewPoints = [
    `Component architecture leans ${analysis.componentArchitecture.complexity} with ${analysis.componentArchitecture.reusability}% reuse across ${detectedHighlights || 'core UI patterns'}.`,
    `Tokens cover ${analysis.designSystemScore.completeness}% of key surfaces using a ${analysis.tokenNamingConventions.strategy} naming strategy (${analysis.tokenNamingConventions.consistencyScore}/100 consistency).`,
    `Accessibility currently meets WCAG ${analysis.accessibility.wcagLevel} with ${contrastCount === 0 ? 'no contrast regressions detected' : `${contrastCount} contrast issue${contrastCount === 1 ? '' : 's'} flagged`}.`,
    `Brand identity pairs ${analysis.brandIdentity.typographicVoice} typography with a ${analysis.brandIdentity.colorPersonality} palette and ${visualHighlights || 'focused'} aesthetic direction.`
  ]

  return (
    <div className="space-y-4 mb-8">

      {/* Header Card */}
      <div className="rounded-md border border-grep-2 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-grep-2 bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground">
                AI Design System Analysis
              </span>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">
              GPT-4o Powered
            </Badge>
          </div>
        </div>

        {/* Overall Scores */}
        <div className="p-4 space-y-4 md:space-y-0 md:grid md:grid-cols-[minmax(0,280px),1fr] md:gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={cn(
                "text-3xl font-bold font-mono tabular-nums mb-1",
                analysis.designSystemScore.overall >= 80 ? "text-green-600 dark:text-green-400" :
                analysis.designSystemScore.overall >= 60 ? "text-blue-600 dark:text-blue-400" :
                "text-amber-600 dark:text-amber-400"
              )}>
                {analysis.designSystemScore.overall}
              </div>
              <div className="text-xs text-grep-9 font-mono">Overall</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-mono tabular-nums text-foreground mb-1">
                {analysis.designSystemScore.completeness}
              </div>
              <div className="text-xs text-grep-9 font-mono">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-mono tabular-nums text-foreground mb-1">
                {analysis.designSystemScore.consistency}
              </div>
              <div className="text-xs text-grep-9 font-mono">Consistent</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-mono tabular-nums text-foreground mb-1">
                {analysis.designSystemScore.scalability}
              </div>
              <div className="text-xs text-grep-9 font-mono">Scalable</div>
            </div>
          </div>
          <div className="rounded-md border border-grep-2 bg-background/70 backdrop-blur-sm p-4">
            <div className="text-xs font-mono uppercase tracking-wide text-grep-8 mb-2">
              System Overview
            </div>
            <ul className="space-y-2 text-sm text-grep-9 font-mono">
              {overviewPoints.map((point, idx) => (
                <li key={idx} className="leading-relaxed flex gap-2">
                  <span className="text-grep-7">•</span>
                  <span className="text-foreground/90">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Critical Issues - Always Visible */}
      {analysis.recommendations.critical.length > 0 && (
        <div className="rounded-md border-2 border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-red-100 dark:bg-red-950/30 border-b border-red-300 dark:border-red-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wide text-red-800 dark:text-red-300">
                Critical Issues ({analysis.recommendations.critical.length})
              </span>
            </div>
          </div>
          <div className="divide-y divide-red-200 dark:divide-red-900/50">
            {analysis.recommendations.critical.map((issue, idx) => (
              <div key={idx} className="px-4 py-3 font-mono text-[13px]">
                <div className="text-foreground font-semibold mb-1">{issue.issue}</div>
                <div className="text-grep-9 text-xs">→ {issue.solution}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins */}
      <CollapsibleSection
        title="Quick Wins"
        subtitle={`${analysis.recommendations.quick_wins.length} high-impact, low-effort improvements`}
        icon={<Zap className="h-4 w-4" />}
        isExpanded={isExpanded('recommendations')}
        onToggle={() => toggleSection('recommendations')}
        accentColor="emerald"
      >
        <div className="divide-y divide-grep-2">
          {analysis.recommendations.quick_wins.map((win, idx) => (
            <div key={idx} className="px-4 py-3 font-mono text-[13px] hover:bg-background transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="font-semibold text-foreground">{win.title}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={win.impact === 'high' ? 'default' : 'secondary'} className="text-[10px] font-mono h-5">
                    {win.impact} impact
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono h-5">
                    {win.effort} effort
                  </Badge>
                </div>
              </div>
              <div className="text-grep-9 text-xs">{win.description}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Accessibility Audit */}
      <CollapsibleSection
        title="Accessibility Audit"
        subtitle={`WCAG ${analysis.accessibility.wcagLevel} · Score: ${analysis.accessibility.overallScore}/100`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        isExpanded={isExpanded('accessibility')}
        onToggle={() => toggleSection('accessibility')}
        accentColor="blue"
      >
        <div className="p-4 space-y-4 font-mono text-[13px]">
          {/* WCAG Compliance */}
          <div className="flex items-center justify-between pb-3 border-b border-grep-2">
            <span className="text-grep-9">WCAG Compliance</span>
            <Badge variant={analysis.accessibility.wcagLevel === 'AAA' ? 'default' : 'secondary'} className="font-mono">
              Level {analysis.accessibility.wcagLevel}
            </Badge>
          </div>

          {/* Colorblindness Safety */}
          <div>
            <div className="text-grep-9 mb-2 text-xs">Colorblindness Safety</div>
            <div className="grid grid-cols-3 gap-2">
              <div className={cn(
                "px-3 py-2 rounded border text-center text-xs",
                analysis.accessibility.colorBlindness.safeForProtanopia
                  ? "border-green-300 dark:border-green-900 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                  : "border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
              )}>
                Protanopia {analysis.accessibility.colorBlindness.safeForProtanopia ? '✓' : '✗'}
              </div>
              <div className={cn(
                "px-3 py-2 rounded border text-center text-xs",
                analysis.accessibility.colorBlindness.safeForDeuteranopia
                  ? "border-green-300 dark:border-green-900 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                  : "border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
              )}>
                Deuteranopia {analysis.accessibility.colorBlindness.safeForDeuteranopia ? '✓' : '✗'}
              </div>
              <div className={cn(
                "px-3 py-2 rounded border text-center text-xs",
                analysis.accessibility.colorBlindness.safeForTritanopia
                  ? "border-green-300 dark:border-green-900 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                  : "border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
              )}>
                Tritanopia {analysis.accessibility.colorBlindness.safeForTritanopia ? '✓' : '✗'}
              </div>
            </div>
          </div>

          {/* Contrast Issues */}
          {analysis.accessibility.contrastIssues.length > 0 && (
            <div>
              <div className="text-grep-9 mb-2 text-xs">Contrast Issues ({analysis.accessibility.contrastIssues.length})</div>
              <div className="space-y-2">
                {analysis.accessibility.contrastIssues.map((issue, idx) => (
                  <div key={idx} className="p-3 rounded bg-background border border-grep-2 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded border border-grep-3" style={{ backgroundColor: issue.background }} />
                      <span className="text-grep-9">on</span>
                      <div className="w-4 h-4 rounded border border-grep-3" style={{ backgroundColor: issue.foreground }} />
                      <span className="text-grep-9">= {issue.ratio.toFixed(2)}:1</span>
                    </div>
                    <div className="text-grep-9">→ {issue.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Component Architecture */}
      <CollapsibleSection
        title="Component Architecture"
        subtitle={`${analysis.componentArchitecture.complexity} · ${analysis.componentArchitecture.reusability}% reusable`}
        icon={<Target className="h-4 w-4" />}
        isExpanded={isExpanded('components')}
        onToggle={() => toggleSection('components')}
        accentColor="purple"
      >
        <div className="p-4 space-y-4 font-mono text-[13px]">
          {/* Button Variants */}
          {analysis.componentArchitecture.buttonVariants.length > 0 && (
            <div>
              <div className="text-grep-9 mb-2 text-xs">Button Variants</div>
              <div className="flex flex-wrap gap-2">
                {analysis.componentArchitecture.buttonVariants.map((variant, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono text-xs">
                    {variant}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Detected Patterns */}
          {analysis.componentArchitecture.detectedPatterns.length > 0 && (
            <div>
              <div className="text-grep-9 mb-2 text-xs">Detected Patterns ({analysis.componentArchitecture.detectedPatterns.length})</div>
              <div className="space-y-1">
                {analysis.componentArchitecture.detectedPatterns.slice(0, 8).map((pattern, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="text-green-500 shrink-0">✓</span>
                    <span className="text-grep-9">{pattern}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Design Patterns & Anti-Patterns */}
      <CollapsibleSection
        title="Design Patterns"
        subtitle={`${analysis.designPatterns.identified.length} patterns · ${analysis.designPatterns.antiPatterns.length} issues`}
        icon={<Info className="h-4 w-4" />}
        isExpanded={isExpanded('patterns')}
        onToggle={() => toggleSection('patterns')}
        accentColor="teal"
      >
        <div className="divide-y divide-grep-2">
          {/* Identified Patterns */}
          {analysis.designPatterns.identified.length > 0 && (
            <div className="px-4 py-3">
              <div className="text-grep-9 mb-3 text-xs uppercase tracking-wide font-semibold">Industry Patterns</div>
              <div className="space-y-3">
                {analysis.designPatterns.identified.map((pattern, idx) => (
                  <div key={idx} className="font-mono text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-foreground font-semibold">{pattern.pattern}</span>
                      <span className="text-grep-9">{pattern.confidence}% confident</span>
                    </div>
                    <div className="text-grep-9 text-[11px]">
                      Examples: {pattern.examples.slice(0, 3).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anti-Patterns */}
          {analysis.designPatterns.antiPatterns.length > 0 && (
            <div className="px-4 py-3">
              <div className="text-grep-9 mb-3 text-xs uppercase tracking-wide font-semibold">Issues Found</div>
              <div className="space-y-2">
                {analysis.designPatterns.antiPatterns.map((ap, idx) => (
                  <div key={idx} className="p-3 rounded border border-grep-2 bg-background font-mono text-xs">
                    <div className="flex items-start gap-2 mb-1">
                      <Badge
                        variant={ap.severity === 'critical' ? 'destructive' : 'outline'}
                        className={cn(
                          "text-[10px] h-5 shrink-0",
                          ap.severity === 'high' && "bg-red-100 text-red-700 border-red-300",
                          ap.severity === 'medium' && "bg-amber-100 text-amber-700 border-amber-300"
                        )}
                      >
                        {ap.severity}
                      </Badge>
                      <span className="text-foreground font-semibold">{ap.issue}</span>
                    </div>
                    <div className="text-grep-9 ml-[76px]">→ {ap.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Token Naming Analysis */}
      <CollapsibleSection
        title="Token Naming"
        subtitle={`${analysis.tokenNamingConventions.strategy} strategy · ${analysis.tokenNamingConventions.consistencyScore}% consistent`}
        icon={<TrendingUp className="h-4 w-4" />}
        isExpanded={isExpanded('naming')}
        onToggle={() => toggleSection('naming')}
        accentColor="indigo"
      >
        <div className="p-4 space-y-4 font-mono text-[13px]">
          {/* Example Ratings */}
          <div>
            <div className="text-grep-9 mb-2 text-xs">Example Token Names</div>
            <div className="space-y-2">
              {analysis.tokenNamingConventions.examples.map((example, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 p-2 rounded bg-background border border-grep-2">
                  <div className="flex-1">
                    <code className="text-xs text-foreground">{example.token}</code>
                    {example.suggestion && (
                      <div className="text-[11px] text-grep-9 mt-1">→ {example.suggestion}</div>
                    )}
                  </div>
                  <Badge
                    variant={example.rating === 'excellent' ? 'default' : example.rating === 'good' ? 'secondary' : 'outline'}
                    className="text-[10px] h-5 shrink-0"
                  >
                    {example.rating}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {analysis.tokenNamingConventions.recommendations.length > 0 && (
            <div>
              <div className="text-grep-9 mb-2 text-xs">Recommendations</div>
              <div className="space-y-1">
                {analysis.tokenNamingConventions.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="text-blue-500 shrink-0">→</span>
                    <span className="text-grep-9">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Brand Identity */}
      <CollapsibleSection
        title="Brand Identity"
        subtitle={analysis.brandIdentity.industryAlignment}
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>}
        isExpanded={isExpanded('brand')}
        onToggle={() => toggleSection('brand')}
        accentColor="pink"
      >
        <div className="p-4 space-y-4 font-mono text-[13px]">
          {/* Primary Colors */}
          <div>
            <div className="text-grep-9 mb-2 text-xs">Primary Colors</div>
            <div className="flex items-center gap-2">
              {analysis.brandIdentity.primaryColors.map((color, idx) => (
                <div
                  key={idx}
                  className="w-12 h-12 rounded border-2 border-grep-3 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Personality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded bg-background border border-grep-2">
              <div className="text-grep-9 text-xs mb-1">Color Personality</div>
              <div className="text-foreground text-sm">{analysis.brandIdentity.colorPersonality}</div>
            </div>
            <div className="p-3 rounded bg-background border border-grep-2">
              <div className="text-grep-9 text-xs mb-1">Typographic Voice</div>
              <div className="text-foreground text-sm">{analysis.brandIdentity.typographicVoice}</div>
            </div>
          </div>

          {/* Visual Style */}
          <div>
            <div className="text-grep-9 mb-2 text-xs">Visual Style</div>
            <div className="flex flex-wrap gap-2">
              {analysis.brandIdentity.visualStyle.map((style, idx) => (
                <Badge key={idx} variant="outline" className="font-mono text-xs">
                  {style}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Long-term Roadmap */}
      {analysis.recommendations.long_term.length > 0 && (
        <CollapsibleSection
          title="Long-term Roadmap"
          subtitle={`${analysis.recommendations.long_term.length} strategic improvements`}
          icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          isExpanded={isExpanded('roadmap')}
          onToggle={() => toggleSection('roadmap')}
          accentColor="gray"
        >
          <div className="divide-y divide-grep-2">
            {analysis.recommendations.long_term.map((item, idx) => (
              <div key={idx} className="px-4 py-3 font-mono text-[13px] hover:bg-background transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="font-semibold text-foreground">{item.title}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={item.impact === 'high' ? 'default' : 'secondary'} className="text-[10px] font-mono h-5">
                      {item.impact}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono h-5">
                      {item.effort}
                    </Badge>
                  </div>
                </div>
                <div className="text-grep-9 text-xs">{item.description}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

function CollapsibleSection({
  title,
  subtitle,
  icon,
  isExpanded,
  onToggle,
  accentColor,
  children
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  accentColor: 'emerald' | 'blue' | 'purple' | 'teal' | 'indigo' | 'pink' | 'gray'
  children: React.ReactNode
}) {
  const accentColors = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    teal: 'text-teal-600 dark:text-teal-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    pink: 'text-pink-600 dark:text-pink-400',
    gray: 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 bg-background hover:bg-grep-1 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className={cn("shrink-0", accentColors[accentColor])}>
            {icon}
          </div>
          <div className="text-left">
            <div className="text-xs font-mono font-semibold uppercase tracking-wide text-foreground">
              {title}
            </div>
            <div className="text-[11px] font-mono text-grep-9 mt-0.5">
              {subtitle}
            </div>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-grep-9 transition-transform shrink-0",
          isExpanded && "rotate-180"
        )} />
      </button>
      {isExpanded && children}
    </div>
  )
}
