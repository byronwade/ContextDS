"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Box, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface ComponentPattern {
  type: 'button' | 'input' | 'card' | 'badge' | 'alert' | 'link' | 'heading' | 'text'
  variant?: string
  properties: Record<string, any>
  usage: number
  confidence: number
  selectors: string[]
}

interface ComponentLibrary {
  buttons: ComponentPattern[]
  inputs: ComponentPattern[]
  cards: ComponentPattern[]
  badges: ComponentPattern[]
  alerts: ComponentPattern[]
  links: ComponentPattern[]
  headings: ComponentPattern[]
  text: ComponentPattern[]
}

interface ComponentLibrarySectionProps {
  componentLibrary: ComponentLibrary | null
  onCopy?: (value: string) => void
}

export function ComponentLibrarySection({ componentLibrary, onCopy }: ComponentLibrarySectionProps) {
  if (!componentLibrary) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Box className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No component library data available</p>
        <p className="text-xs text-grep-7 mt-2">Enable computed CSS mode to extract component patterns</p>
      </div>
    )
  }

  const totalComponents =
    (componentLibrary.buttons?.length || 0) +
    (componentLibrary.inputs?.length || 0) +
    (componentLibrary.cards?.length || 0) +
    (componentLibrary.badges?.length || 0) +
    (componentLibrary.alerts?.length || 0) +
    (componentLibrary.links?.length || 0) +
    (componentLibrary.headings?.length || 0) +
    (componentLibrary.text?.length || 0)

  if (totalComponents === 0) {
    return (
      <div className="rounded-lg border border-grep-2 bg-grep-0 p-8 text-center">
        <Box className="h-12 w-12 text-grep-7 mx-auto mb-3" />
        <p className="text-sm font-mono text-grep-9">No components detected</p>
        <p className="text-xs text-grep-7 mt-2">This site may not use standard component selectors</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border-2 border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-grep-3 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-foreground">
                Component Library
              </h3>
              <p className="text-[10px] sm:text-xs text-grep-7 mt-0.5">
                Extracted component patterns with variants and states
              </p>
            </div>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
              {totalComponents} components
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 bg-gradient-to-b from-background/50 to-background">
          {[
            { label: 'Buttons', count: componentLibrary.buttons?.length || 0, color: 'blue' },
            { label: 'Inputs', count: componentLibrary.inputs?.length || 0, color: 'green' },
            { label: 'Cards', count: componentLibrary.cards?.length || 0, color: 'purple' },
            { label: 'Badges', count: componentLibrary.badges?.length || 0, color: 'orange' },
          ].map(({ label, count, color }) => (
            count > 0 && (
              <div key={label} className="p-3 rounded-lg bg-background border border-grep-2">
                <div className={`text-${color}-600 dark:text-${color}-400 text-xl font-bold font-mono`}>
                  {count}
                </div>
                <div className="text-xs text-grep-9 font-medium mt-0.5">{label}</div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Buttons */}
      {(componentLibrary.buttons?.length || 0) > 0 && (
        <ComponentGroup
          title="Buttons"
          icon={Box}
          components={componentLibrary.buttons}
          onCopy={onCopy}
        />
      )}

      {/* Inputs */}
      {(componentLibrary.inputs?.length || 0) > 0 && (
        <ComponentGroup
          title="Inputs"
          icon={Box}
          components={componentLibrary.inputs}
          onCopy={onCopy}
        />
      )}

      {/* Cards */}
      {(componentLibrary.cards?.length || 0) > 0 && (
        <ComponentGroup
          title="Cards"
          icon={Box}
          components={componentLibrary.cards}
          onCopy={onCopy}
        />
      )}

      {/* Badges */}
      {(componentLibrary.badges?.length || 0) > 0 && (
        <ComponentGroup
          title="Badges"
          icon={Box}
          components={componentLibrary.badges}
          onCopy={onCopy}
        />
      )}

      {/* Headings */}
      {(componentLibrary.headings?.length || 0) > 0 && (
        <ComponentGroup
          title="Headings"
          icon={Box}
          components={componentLibrary.headings}
          onCopy={onCopy}
        />
      )}
    </div>
  )
}

function ComponentGroup({ title, icon: Icon, components, onCopy }: {
  title: string
  icon: any
  components: ComponentPattern[]
  onCopy?: (value: string) => void
}) {
  return (
    <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-grep-2 bg-background">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wide text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
          <span className="text-grep-7 font-normal">·</span>
          <span className="text-grep-9 font-normal">{components.length} variants</span>
        </h3>
      </div>
      <div className="divide-y divide-grep-2">
        {components.map((component, index) => (
          <ComponentCard key={index} component={component} onCopy={onCopy} />
        ))}
      </div>
    </div>
  )
}

function ComponentCard({ component, onCopy }: {
  component: ComponentPattern
  onCopy?: (value: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const copyComponentData = () => {
    const data = JSON.stringify({
      type: component.type,
      variant: component.variant,
      properties: component.properties,
    }, null, 2)
    onCopy?.(data)
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground capitalize">
              {component.variant || 'default'}
            </h4>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {component.confidence}% confidence
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

      {/* Properties */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {Object.entries(component.properties)
          .filter(([key, value]) => value && !key.includes('hover') && !key.includes('active') && !key.includes('focus') && !key.includes('disabled'))
          .slice(0, 6)
          .map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-grep-7 font-mono">{key}:</span>{' '}
              <span className="text-foreground font-mono font-medium">{String(value)}</span>
            </div>
          ))}
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-grep-2 space-y-3">
          {/* All Properties */}
          <div>
            <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">All Properties</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(component.properties)
                .filter(([key, value]) => value && typeof value === 'string')
                .map(([key, value]) => (
                  <div key={key} className="text-xs font-mono">
                    <span className="text-grep-7">{key}:</span>{' '}
                    <span className="text-foreground">{String(value)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* States */}
          {(component.properties.hover || component.properties.active || component.properties.focus || component.properties.disabled) && (
            <div>
              <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">States</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['hover', 'active', 'focus', 'disabled'].map(state => {
                  const stateProps = component.properties[state]
                  if (!stateProps || typeof stateProps !== 'object') return null
                  return (
                    <div key={state} className="p-2 rounded bg-grep-1 border border-grep-2">
                      <div className="text-xs font-semibold text-grep-9 capitalize mb-1">{state}</div>
                      {Object.entries(stateProps).map(([key, value]) => (
                        <div key={key} className="text-xs font-mono">
                          <span className="text-grep-7">{key}:</span>{' '}
                          <span className="text-foreground">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All Selectors */}
          <div>
            <div className="text-xs font-semibold text-grep-9 uppercase tracking-wide mb-2">CSS Selectors</div>
            <div className="space-y-1">
              {component.selectors.slice(0, 5).map((selector, i) => (
                <code key={i} className="block text-xs text-grep-9 font-mono bg-grep-1 px-2 py-1 rounded">
                  {selector}
                </code>
              ))}
              {component.selectors.length > 5 && (
                <div className="text-xs text-grep-7">
                  +{component.selectors.length - 5} more selectors
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
