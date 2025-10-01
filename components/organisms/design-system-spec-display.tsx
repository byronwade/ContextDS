"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ChevronDown, ChevronUp, Palette, Type, Box, Grid3x3, Code2, Book, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import type { DesignSystemSpec } from "@/lib/ai/design-system-builder"

interface DesignSystemSpecDisplayProps {
  spec: DesignSystemSpec | null
  onCopy?: (value: string) => void
}

export function DesignSystemSpecDisplay({ spec, onCopy }: DesignSystemSpecDisplayProps) {
  if (!spec) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Zap className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No design system specification available</p>
        <p className="text-xs text-grep-7 mt-2">Run a full scan to generate AI-powered design system specs</p>
      </div>
    )
  }

  const copySpec = () => {
    const data = JSON.stringify(spec, null, 2)
    onCopy?.(data)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border-2 border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-grep-3 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-foreground">
                AI Design System Specification
              </h3>
              <p className="text-[10px] sm:text-xs text-grep-7 mt-0.5">
                Actionable, structured design system ready for implementation
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={copySpec}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy All
            </Button>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-background/50 to-background space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9">Quick Reference</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickRefCard title="Buttons" content={spec.quickReference.buttonGuide} />
            <QuickRefCard title="Colors" content={spec.quickReference.colorGuide} />
            <QuickRefCard title="Spacing" content={spec.quickReference.spacingGuide} />
            <QuickRefCard title="Typography" content={spec.quickReference.typographyGuide} />
          </div>
        </div>
      </div>

      {/* Foundation */}
      <FoundationSection foundation={spec.foundation} onCopy={onCopy} />

      {/* Components */}
      {spec.components.length > 0 && (
        <ComponentsSection components={spec.components} onCopy={onCopy} />
      )}

      {/* Patterns */}
      {spec.patterns.length > 0 && (
        <PatternsSection patterns={spec.patterns} onCopy={onCopy} />
      )}

      {/* Implementation Guide */}
      <ImplementationSection implementation={spec.implementation} onCopy={onCopy} />

      {/* Design Principles */}
      {spec.principles.length > 0 && (
        <PrinciplesSection principles={spec.principles} />
      )}
    </div>
  )
}

function QuickRefCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-3 rounded-lg bg-background border border-grep-2">
      <div className="text-xs font-semibold text-grep-9 mb-1">{title}</div>
      <div className="text-xs text-foreground">{content}</div>
    </div>
  )
}

function FoundationSection({ foundation, onCopy }: { foundation: DesignSystemSpec['foundation']; onCopy?: (value: string) => void }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  return (
    <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-grep-2 bg-background">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-foreground flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Foundation Tokens
        </h3>
      </div>

      <div className="divide-y divide-grep-2">
        {/* Colors */}
        <ExpandableCard
          title={`Colors · ${foundation.colorSystem.palette.length} palette + ${foundation.colorSystem.semanticTokens.length} semantic`}
          expanded={expandedSection === 'colors'}
          onToggle={() => setExpandedSection(expandedSection === 'colors' ? null : 'colors')}
          onCopy={() => onCopy?.(JSON.stringify(foundation.colorSystem, null, 2))}
        >
          <div className="space-y-4">
            {/* Color Palette */}
            <div>
              <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Color Palette</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {foundation.colorSystem.palette.map((color, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-grep-1 border border-grep-2">
                    <div
                      className="w-8 h-8 rounded border border-grep-3 flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{color.name}</div>
                      <div className="text-[10px] font-mono text-grep-9">{color.hex}</div>
                      <div className="text-[10px] text-grep-7">{color.usage}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semantic Tokens */}
            {foundation.colorSystem.semanticTokens.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Semantic Tokens</div>
                <div className="space-y-1">
                  {foundation.colorSystem.semanticTokens.map((token, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-grep-1 border border-grep-2 text-xs">
                      <div className="font-mono text-foreground">{token.name}</div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-grep-7">Light:</span>
                          <code className="text-foreground">{token.lightMode}</code>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-grep-7">Dark:</span>
                          <code className="text-foreground">{token.darkMode}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ExpandableCard>

        {/* Typography */}
        <ExpandableCard
          title={`Typography · ${foundation.typography.families.length} families, ${foundation.typography.scale.length} sizes`}
          expanded={expandedSection === 'typography'}
          onToggle={() => setExpandedSection(expandedSection === 'typography' ? null : 'typography')}
          onCopy={() => onCopy?.(JSON.stringify(foundation.typography, null, 2))}
        >
          <div className="space-y-4">
            {/* Font Families */}
            <div>
              <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Font Families</div>
              <div className="space-y-2">
                {foundation.typography.families.map((family, i) => (
                  <div key={i} className="p-2 rounded bg-grep-1 border border-grep-2">
                    <div className="text-sm font-semibold text-foreground" style={{ fontFamily: family.name }}>
                      {family.name}
                    </div>
                    <div className="text-xs text-grep-7 mt-0.5">{family.usage}</div>
                    <code className="text-[10px] text-grep-9 font-mono">Fallbacks: {family.fallbacks.join(', ')}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Type Scale */}
            <div>
              <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Type Scale</div>
              <div className="space-y-1">
                {foundation.typography.scale.map((size, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-grep-1 border border-grep-2">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono font-semibold text-foreground">{size.name}</code>
                      <span className="text-xs text-grep-7">{size.usage}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-foreground">{size.size}</span>
                      <span className="text-grep-7">·</span>
                      <span className="text-grep-9">LH {size.lineHeight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ExpandableCard>

        {/* Spacing */}
        <ExpandableCard
          title={`Spacing · ${foundation.spacing.scale.length} values`}
          expanded={expandedSection === 'spacing'}
          onToggle={() => setExpandedSection(expandedSection === 'spacing' ? null : 'spacing')}
          onCopy={() => onCopy?.(JSON.stringify(foundation.spacing, null, 2))}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {foundation.spacing.scale.map((space, i) => (
                <div key={i} className="p-2 rounded bg-grep-1 border border-grep-2">
                  <code className="text-xs font-mono font-semibold text-foreground block">{space.name}</code>
                  <div className="text-xs text-grep-9 mt-0.5">{space.value}</div>
                  <div className="text-[10px] text-grep-7 mt-1">{space.usage}</div>
                </div>
              ))}
            </div>
            {foundation.spacing.principles.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Principles</div>
                <ul className="space-y-1">
                  {foundation.spacing.principles.map((principle, i) => (
                    <li key={i} className="text-xs text-grep-7 flex items-start gap-2">
                      <span className="text-grep-9">•</span>
                      {principle}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ExpandableCard>

        {/* Elevation */}
        {foundation.elevation.levels.length > 0 && (
          <ExpandableCard
            title={`Elevation · ${foundation.elevation.levels.length} levels`}
            expanded={expandedSection === 'elevation'}
            onToggle={() => setExpandedSection(expandedSection === 'elevation' ? null : 'elevation')}
            onCopy={() => onCopy?.(JSON.stringify(foundation.elevation, null, 2))}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {foundation.elevation.levels.map((level, i) => (
                <div key={i} className="p-3 rounded bg-grep-1 border border-grep-2">
                  <div className="text-xs font-semibold text-foreground mb-2">{level.name}</div>
                  <div
                    className="h-12 rounded bg-background"
                    style={{ boxShadow: level.boxShadow }}
                  />
                  <code className="text-[10px] text-grep-9 font-mono block mt-2">{level.boxShadow}</code>
                  <div className="text-xs text-grep-7 mt-1">{level.usage}</div>
                </div>
              ))}
            </div>
          </ExpandableCard>
        )}
      </div>
    </div>
  )
}

function ComponentsSection({ components, onCopy }: { components: DesignSystemSpec['components']; onCopy?: (value: string) => void }) {
  return (
    <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-grep-2 bg-background">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-foreground flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          Component Specifications
          <span className="text-grep-7 font-normal">·</span>
          <span className="text-grep-9 font-normal">{components.length} components</span>
        </h3>
      </div>
      <div className="divide-y divide-grep-2">
        {components.map((component, index) => (
          <ComponentSpecCard key={index} component={component} onCopy={onCopy} />
        ))}
      </div>
    </div>
  )
}

function ComponentSpecCard({ component, onCopy }: { component: DesignSystemSpec['components'][0]; onCopy?: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground capitalize">{component.name}</h4>
          <div className="text-xs text-grep-7 mt-0.5">{component.composition}</div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onCopy?.(JSON.stringify(component, null, 2))}
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

      {/* Variants Preview */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">
          Variants ({component.variants.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {component.variants.map((variant, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {variant.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-grep-2 space-y-4">
          {/* Variants */}
          {component.variants.map((variant, i) => (
            <div key={i} className="p-3 rounded bg-grep-1 border border-grep-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-foreground">{variant.name}</div>
                <Badge variant="outline" className="text-[10px]">
                  {variant.usage}
                </Badge>
              </div>

              {/* CSS Properties */}
              <div className="mb-2">
                <div className="text-[10px] font-semibold text-grep-9 uppercase tracking-wide mb-1">CSS</div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(variant.css).map(([key, value]) => (
                    <code key={key} className="text-[10px] font-mono text-grep-7 block">
                      <span className="text-foreground">{key}:</span> {value}
                    </code>
                  ))}
                </div>
              </div>

              {/* Token Mappings */}
              {Object.keys(variant.tokens).length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-semibold text-grep-9 uppercase tracking-wide mb-1">Tokens</div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(variant.tokens).map(([key, value]) => (
                      <code key={key} className="text-[10px] font-mono text-grep-7 block">
                        <span className="text-foreground">{key}:</span> {value}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Example */}
              {variant.example && (
                <div>
                  <div className="text-[10px] font-semibold text-grep-9 uppercase tracking-wide mb-1">Example</div>
                  <code className="text-[10px] font-mono text-grep-7 block bg-grep-0 p-2 rounded">
                    {variant.example}
                  </code>
                </div>
              )}
            </div>
          ))}

          {/* States */}
          <div>
            <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">States</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(component.states).map(([stateName, stateProps]) => {
                if (!stateProps || Object.keys(stateProps).length === 0) return null
                return (
                  <div key={stateName} className="p-2 rounded bg-grep-1 border border-grep-2">
                    <div className="text-xs font-semibold text-foreground capitalize mb-1">{stateName}</div>
                    {Object.entries(stateProps).map(([key, value]) => (
                      <code key={key} className="text-[10px] font-mono text-grep-7 block">
                        <span className="text-foreground">{key}:</span> {value}
                      </code>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Accessibility */}
          {component.accessibility.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Accessibility</div>
              <ul className="space-y-1">
                {component.accessibility.map((req, i) => (
                  <li key={i} className="text-xs text-grep-7 flex items-start gap-2">
                    <span className="text-grep-9">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PatternsSection({ patterns, onCopy }: { patterns: DesignSystemSpec['patterns']; onCopy?: (value: string) => void }) {
  return (
    <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-grep-2 bg-background">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-foreground flex items-center gap-2">
          <Grid3x3 className="h-4 w-4" />
          Design Patterns
          <span className="text-grep-7 font-normal">·</span>
          <span className="text-grep-9 font-normal">{patterns.length} patterns</span>
        </h3>
      </div>
      <div className="divide-y divide-grep-2">
        {patterns.map((pattern, index) => (
          <div key={index} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{pattern.name}</h4>
                <p className="text-xs text-grep-7 mt-0.5">{pattern.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onCopy?.(JSON.stringify(pattern, null, 2))}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-xs font-semibold text-grep-9 mb-1">Components Used</div>
                <div className="flex flex-wrap gap-1">
                  {pattern.components.map((comp, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-grep-9 mb-1">Layout</div>
                <p className="text-xs text-grep-7">{pattern.layout}</p>
              </div>

              {pattern.example && (
                <div>
                  <div className="text-xs font-semibold text-grep-9 mb-1">Example</div>
                  <code className="text-[10px] font-mono text-grep-7 block bg-grep-1 p-2 rounded border border-grep-2">
                    {pattern.example}
                  </code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ImplementationSection({ implementation, onCopy }: { implementation: DesignSystemSpec['implementation']; onCopy?: (value: string) => void }) {
  return (
    <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-grep-2 bg-background">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-foreground flex items-center gap-2">
          <Book className="h-4 w-4" />
          Implementation Guide
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Priority Phases */}
        <div>
          <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Priority Phases</div>
          <div className="space-y-2">
            {implementation.priority.map((phase, i) => (
              <div key={i} className="p-3 rounded bg-grep-1 border border-grep-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-foreground">{phase.phase}</div>
                  <div className="flex flex-wrap gap-1">
                    {phase.components.map((comp, j) => (
                      <Badge key={j} variant="secondary" className="text-[10px]">
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

        {/* Token Structure */}
        <div>
          <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Token Structure</div>
          <div className="p-3 rounded bg-grep-1 border border-grep-2 space-y-2">
            <div className="text-xs">
              <span className="text-grep-7">Format:</span>{' '}
              <span className="text-foreground font-semibold">{implementation.tokenStructure.format}</span>
            </div>
            <div className="text-xs">
              <span className="text-grep-7">Naming:</span>{' '}
              <span className="text-foreground">{implementation.tokenStructure.naming}</span>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-grep-9 uppercase tracking-wide mb-1">Example</div>
              <code className="text-xs font-mono text-foreground block bg-grep-0 p-2 rounded">
                {implementation.tokenStructure.example}
              </code>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        {implementation.codeExamples.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">Code Examples</div>
            <div className="space-y-2">
              {implementation.codeExamples.map((example, i) => (
                <div key={i} className="p-3 rounded bg-grep-1 border border-grep-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-foreground">{example.component}</div>
                    <Badge variant="outline" className="text-[10px]">
                      {example.framework}
                    </Badge>
                  </div>
                  <code className="text-[10px] font-mono text-grep-7 block bg-grep-0 p-2 rounded whitespace-pre-wrap">
                    {example.code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-6 text-[10px]"
                    onClick={() => onCopy?.(example.code)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Code
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PrinciplesSection({ principles }: { principles: DesignSystemSpec['principles'] }) {
  return (
    <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-grep-2 bg-background">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Design Principles
          <span className="text-grep-7 font-normal">·</span>
          <span className="text-grep-9 font-normal">{principles.length} principles</span>
        </h3>
      </div>
      <div className="divide-y divide-grep-2">
        {principles.map((principle, index) => (
          <div key={index} className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-1">{principle.principle}</h4>
            <p className="text-xs text-grep-7 mb-2">{principle.description}</p>
            {principle.examples.length > 0 && (
              <ul className="space-y-1">
                {principle.examples.map((example, i) => (
                  <li key={i} className="text-xs text-grep-7 flex items-start gap-2">
                    <span className="text-grep-9">•</span>
                    {example}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ExpandableCard({
  title,
  expanded,
  onToggle,
  onCopy,
  children
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  onCopy: () => void
  children: React.ReactNode
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onCopy}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onToggle}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-grep-2">
          {children}
        </div>
      )}
    </div>
  )
}
