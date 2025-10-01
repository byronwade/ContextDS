import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Dna, Sparkles, Atom, Zap } from "lucide-react"

interface DNANode {
  id: string
  type: 'color' | 'spacing' | 'typography' | 'component'
  value: string
  x: number
  y: number
  angle: number
  discovered: boolean
  connecting: boolean
}

const geneticElements = [
  { type: 'color', values: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'] },
  { type: 'spacing', values: ['4px', '8px', '16px', '24px', '32px', '48px'] },
  { type: 'typography', values: ['Inter', 'Roboto', 'Arial', 'Helvetica', 'Georgia', 'Times'] },
  { type: 'component', values: ['Button', 'Card', 'Input', 'Modal', 'Table', 'Form'] }
]

interface DesignDNAHelixProps {
  className?: string
  isActive?: boolean
}

export function DesignDNAHelix({ className, isActive = true }: DesignDNAHelixProps) {
  const [discoveredNodes, setDiscoveredNodes] = useState<DNANode[]>([])
  const [connections, setConnections] = useState<Array<{from: string, to: string, active: boolean}>>([])
  const [rotation, setRotation] = useState(0)
  const [currentSequence, setCurrentSequence] = useState("")

  useEffect(() => {
    if (!isActive) return

    // Generate DNA helix structure
    const generateHelix = () => {
      const nodes: DNANode[] = []
      const radius = 80
      const centerX = 150
      const centerY = 150
      const layers = 15

      geneticElements.forEach((element, elementIndex) => {
        element.values.forEach((value, valueIndex) => {
          for (let layer = 0; layer < 3; layer++) {
            const angle = (elementIndex * 60 + layer * 120 + valueIndex * 20) * (Math.PI / 180)
            const y = 20 + (elementIndex * 15 + valueIndex * 8 + layer * 5)
            const helixRadius = radius + Math.sin(y * 0.1) * 20

            nodes.push({
              id: `${element.type}-${valueIndex}-${layer}`,
              type: element.type as any,
              value,
              x: centerX + Math.cos(angle + rotation) * helixRadius,
              y: y,
              angle,
              discovered: false,
              connecting: false
            })
          }
        })
      })

      return nodes.slice(0, 40) // Limit for performance
    }

    const allNodes = generateHelix()

    // Progressive discovery animation
    let nodeIndex = 0
    const discoveryInterval = setInterval(() => {
      if (nodeIndex < allNodes.length) {
        const node = allNodes[nodeIndex]
        setDiscoveredNodes(prev => [...prev, { ...node, discovered: true }])

        // Create connections between related nodes
        if (nodeIndex > 0) {
          const previousNode = allNodes[nodeIndex - 1]
          if (Math.random() > 0.3) { // 70% chance of connection
            setConnections(prev => [...prev, {
              from: previousNode.id,
              to: node.id,
              active: true
            }])
          }
        }

        // Update sequence display
        setCurrentSequence(prev => prev + node.type.charAt(0).toUpperCase())

        nodeIndex++
      } else {
        // Reset and start over
        nodeIndex = 0
        setDiscoveredNodes([])
        setConnections([])
        setCurrentSequence("")
      }
    }, 300)

    // Continuous rotation
    const rotationInterval = setInterval(() => {
      setRotation(prev => prev + 0.02)
    }, 50)

    return () => {
      clearInterval(discoveryInterval)
      clearInterval(rotationInterval)
    }
  }, [isActive, rotation])

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'color': return 'bg-blue-500'
      case 'spacing': return 'bg-emerald-500'
      case 'typography': return 'bg-purple-500'
      case 'component': return 'bg-orange-500'
      default: return 'bg-neutral-500'
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'color': return '●'
      case 'spacing': return '▫'
      case 'typography': return 'Aa'
      case 'component': return '⬜'
      default: return '•'
    }
  }

  if (!isActive) return null

  return (
    <div className={cn("border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Dna className="w-8 h-8 text-blue-500 animate-spin" style={{ animationDuration: '4s' }} />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Design DNA Sequencer</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Mapping genetic design patterns
          </p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <span className="text-sm font-mono text-purple-600 dark:text-purple-400">
              {discoveredNodes.length} genes
            </span>
          </div>
        </div>
      </div>

      {/* DNA Sequence Display */}
      <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
        <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
          Sequence Analysis:
        </div>
        <div className="font-mono text-lg tracking-wider text-foreground break-all">
          {currentSequence || "Initializing sequencer..."}
          <span className="animate-pulse">|</span>
        </div>
      </div>

      {/* DNA Helix Visualization */}
      <div className="relative h-96 overflow-hidden bg-gradient-to-b from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400">
          {/* Helix Background Grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
            <linearGradient id="helixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1"/>
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1"/>
            </linearGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* DNA Backbone */}
          <path
            d="M 70 0 Q 150 100 230 200 Q 150 300 70 400"
            fill="none"
            stroke="url(#helixGradient)"
            strokeWidth="2"
            opacity="0.5"
          />
          <path
            d="M 230 0 Q 150 100 70 200 Q 150 300 230 400"
            fill="none"
            stroke="url(#helixGradient)"
            strokeWidth="2"
            opacity="0.5"
          />

          {/* Connections */}
          {connections.map((connection, i) => {
            const fromNode = discoveredNodes.find(n => n.id === connection.from)
            const toNode = discoveredNodes.find(n => n.id === connection.to)

            if (!fromNode || !toNode) return null

            return (
              <line
                key={`connection-${i}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#3B82F6"
                strokeWidth="1"
                opacity="0.6"
                className="animate-pulse"
              />
            )
          })}

          {/* DNA Nodes */}
          {discoveredNodes.map((node, i) => (
            <g key={node.id}>
              {/* Node glow effect */}
              <circle
                cx={node.x}
                cy={node.y}
                r="8"
                fill={`url(#helixGradient)`}
                opacity="0.3"
                className="animate-pulse"
              />

              {/* Main node */}
              <circle
                cx={node.x}
                cy={node.y}
                r="4"
                className={cn(
                  "transition-all duration-500",
                  getNodeColor(node.type)
                )}
                fill="currentColor"
                style={{
                  animationDelay: `${i * 100}ms`
                }}
              />

              {/* Node label */}
              <text
                x={node.x}
                y={node.y - 12}
                textAnchor="middle"
                className="text-xs font-mono fill-current text-neutral-600 dark:text-neutral-400"
              >
                {getNodeIcon(node.type)}
              </text>
            </g>
          ))}
        </svg>

        {/* Scanning beam effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70"
            style={{
              top: `${(Date.now() % 4000) / 4000 * 100}%`,
              transition: 'top 100ms linear'
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {discoveredNodes.filter(n => n.type === 'color').length}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">Colors</div>
        </div>
        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {discoveredNodes.filter(n => n.type === 'spacing').length}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Spacing</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {discoveredNodes.filter(n => n.type === 'typography').length}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400">Fonts</div>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {discoveredNodes.filter(n => n.type === 'component').length}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400">Components</div>
        </div>
      </div>
    </div>
  )
}