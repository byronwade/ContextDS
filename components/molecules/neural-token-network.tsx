import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Network, Zap, Brain, Cpu, Activity } from "lucide-react"

interface NetworkNode {
  id: string
  type: 'token' | 'cluster' | 'relationship'
  label: string
  value?: string
  x: number
  y: number
  size: number
  connections: string[]
  strength: number
  pulse: boolean
  discovered: boolean
}

interface NetworkConnection {
  from: string
  to: string
  strength: number
  type: 'similarity' | 'dependency' | 'semantic' | 'usage'
  active: boolean
  pulseDirection: number
}

const tokenData = [
  { type: 'color', tokens: ['primary', 'secondary', 'accent', 'neutral', 'success', 'warning', 'error'] },
  { type: 'spacing', tokens: ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] },
  { type: 'typography', tokens: ['heading', 'body', 'caption', 'label', 'mono', 'display'] },
  { type: 'radius', tokens: ['none', 'sm', 'md', 'lg', 'full'] },
  { type: 'shadow', tokens: ['sm', 'md', 'lg', 'xl', 'inner'] }
]

interface NeuralTokenNetworkProps {
  className?: string
  isActive?: boolean
}

export function NeuralTokenNetwork({ className, isActive = true }: NeuralTokenNetworkProps) {
  const [nodes, setNodes] = useState<NetworkNode[]>([])
  const [connections, setConnections] = useState<NetworkConnection[]>([])
  const [activeCluster, setActiveCluster] = useState<string | null>(null)
  const [networkActivity, setNetworkActivity] = useState(0)
  const [discoveryPhase, setDiscoveryPhase] = useState(0)

  useEffect(() => {
    if (!isActive) return

    // Generate neural network layout
    const generateNetwork = () => {
      const newNodes: NetworkNode[] = []
      const centerX = 200
      const centerY = 200
      const radius = 120

      // Create token clusters
      tokenData.forEach((cluster, clusterIndex) => {
        const clusterAngle = (clusterIndex / tokenData.length) * 2 * Math.PI
        const clusterX = centerX + Math.cos(clusterAngle) * radius
        const clusterY = centerY + Math.sin(clusterAngle) * radius

        // Cluster center node
        newNodes.push({
          id: `cluster-${cluster.type}`,
          type: 'cluster',
          label: cluster.type,
          x: clusterX,
          y: clusterY,
          size: 20,
          connections: [],
          strength: 1,
          pulse: false,
          discovered: false
        })

        // Token nodes around cluster
        cluster.tokens.forEach((token, tokenIndex) => {
          const tokenAngle = clusterAngle + (tokenIndex / cluster.tokens.length) * Math.PI * 0.8 - Math.PI * 0.4
          const tokenRadius = 60
          const tokenX = clusterX + Math.cos(tokenAngle) * tokenRadius
          const tokenY = clusterY + Math.sin(tokenAngle) * tokenRadius

          newNodes.push({
            id: `${cluster.type}-${token}`,
            type: 'token',
            label: token,
            value: token,
            x: tokenX,
            y: tokenY,
            size: 8 + Math.random() * 6,
            connections: [`cluster-${cluster.type}`],
            strength: Math.random(),
            pulse: false,
            discovered: false
          })
        })
      })

      return newNodes
    }

    // Generate connections between related tokens
    const generateConnections = (nodeList: NetworkNode[]): NetworkConnection[] => {
      const newConnections: NetworkConnection[] = []

      nodeList.forEach(node => {
        if (node.type === 'token') {
          // Connect to cluster
          newConnections.push({
            from: node.id,
            to: `cluster-${node.id.split('-')[0]}`,
            strength: 0.8 + Math.random() * 0.2,
            type: 'dependency',
            active: false,
            pulseDirection: 1
          })

          // Connect to related tokens
          nodeList.forEach(otherNode => {
            if (otherNode.type === 'token' && node.id !== otherNode.id) {
              const similarity = calculateSimilarity(node, otherNode)
              if (similarity > 0.3 && Math.random() > 0.7) {
                newConnections.push({
                  from: node.id,
                  to: otherNode.id,
                  strength: similarity,
                  type: Math.random() > 0.5 ? 'similarity' : 'semantic',
                  active: false,
                  pulseDirection: Math.random() > 0.5 ? 1 : -1
                })
              }
            }
          })
        }
      })

      return newConnections
    }

    const calculateSimilarity = (node1: NetworkNode, node2: NetworkNode): number => {
      const type1 = node1.id.split('-')[0]
      const type2 = node2.id.split('-')[0]

      if (type1 === type2) return 0.9

      // Semantic relationships
      const relationships = {
        'color': ['radius', 'shadow'],
        'spacing': ['typography', 'radius'],
        'typography': ['spacing'],
        'radius': ['color', 'shadow'],
        'shadow': ['color', 'radius']
      }

      return relationships[type1 as keyof typeof relationships]?.includes(type2) ? 0.6 : 0.2
    }

    const networkNodes = generateNetwork()
    const networkConnections = generateConnections(networkNodes)

    // Set initial data
    setNodes(networkNodes)
    setConnections(networkConnections)

    // Progressive discovery animation
    let discoveryIndex = 0
    let currentPhase = 0
    const discoveryInterval = setInterval(() => {
      if (discoveryIndex < networkNodes.length) {
        setNodes(prev => prev.map(node =>
          node.id === networkNodes[discoveryIndex]?.id
            ? { ...node, discovered: true, pulse: true }
            : node
        ))

        // Activate connections
        setConnections(prev => prev.map(conn => {
          const shouldActivate = conn.from === networkNodes[discoveryIndex]?.id ||
                                conn.to === networkNodes[discoveryIndex]?.id
          return shouldActivate ? { ...conn, active: true } : conn
        }))

        // Update activity
        setNetworkActivity(prev => Math.min(prev + 15, 100))

        discoveryIndex++
      } else {
        // Reset cycle
        currentPhase++
        if (currentPhase >= 2) {
          discoveryIndex = 0
          currentPhase = 0
          setNodes(networkNodes.map(node => ({ ...node, discovered: false, pulse: false })))
          setConnections(networkConnections.map(conn => ({ ...conn, active: false })))
          setNetworkActivity(0)
        }
      }
    }, 200)

    // Pulse animation
    const pulseInterval = setInterval(() => {
      setNodes(prev => prev.map(node => ({
        ...node,
        pulse: node.discovered && Math.random() > 0.7
      })))
    }, 800)

    return () => {
      clearInterval(discoveryInterval)
      clearInterval(pulseInterval)
    }
  }, [isActive])

  const getNodeColor = (type: string, cluster?: string) => {
    const colors = {
      'color': '#EF4444',
      'spacing': '#10B981',
      'typography': '#8B5CF6',
      'radius': '#F59E0B',
      'shadow': '#06B6D4'
    }
    return colors[cluster as keyof typeof colors] || colors[type as keyof typeof colors] || '#6B7280'
  }

  const getConnectionColor = (type: string) => {
    const colors = {
      'similarity': '#3B82F6',
      'dependency': '#10B981',
      'semantic': '#8B5CF6',
      'usage': '#F59E0B'
    }
    return colors[type as keyof typeof colors] || '#6B7280'
  }

  if (!isActive) return null

  return (
    <div className={cn("border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Network className="w-8 h-8 text-blue-500" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Neural Token Network</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Discovering token relationships
          </p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
              {networkActivity.toFixed(0)}% active
            </span>
          </div>
        </div>
      </div>

      {/* Network Activity Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-neutral-600 dark:text-neutral-400">Network Activity</span>
          <span className="font-mono">{networkActivity.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${networkActivity}%` }}
          />
        </div>
      </div>

      {/* Neural Network Visualization */}
      <div className="relative h-96 bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-emerald-950/20 rounded-lg overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
          {/* Background grid */}
          <defs>
            <pattern id="neuralGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>

            {/* Glow effects */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#000000" stopOpacity="0.1"/>
            </radialGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#neuralGrid)" />

          {/* Connections */}
          {connections.map((connection, i) => {
            const fromNode = nodes.find(n => n.id === connection.from)
            const toNode = nodes.find(n => n.id === connection.to)

            if (!fromNode || !toNode || !connection.active) return null

            return (
              <g key={`connection-${i}`}>
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={getConnectionColor(connection.type)}
                  strokeWidth={2 * connection.strength}
                  opacity={0.6}
                  className="animate-pulse"
                />

                {/* Data pulse */}
                <circle
                  cx={fromNode.x + (toNode.x - fromNode.x) * ((Date.now() % 2000) / 2000)}
                  cy={fromNode.y + (toNode.y - fromNode.y) * ((Date.now() % 2000) / 2000)}
                  r="2"
                  fill={getConnectionColor(connection.type)}
                  opacity="0.8"
                />
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <g key={node.id}>
              {node.discovered && (
                <>
                  {/* Glow effect */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 4}
                    fill="url(#nodeGlow)"
                    opacity="0.3"
                    className={node.pulse ? "animate-ping" : ""}
                  />

                  {/* Main node */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size}
                    fill={getNodeColor(node.type, node.id.split('-')[0])}
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                    className="transition-all duration-500"
                  />

                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    className="text-xs font-mono fill-white font-bold"
                    style={{ fontSize: node.type === 'cluster' ? '8px' : '6px' }}
                  >
                    {node.type === 'cluster' ? node.label.charAt(0).toUpperCase() : node.label.slice(0, 3)}
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Scanning beam */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent opacity-50"
            style={{
              left: `${((Date.now() % 3000) / 3000) * 100}%`,
              transition: 'left 100ms linear'
            }}
          />
        </div>
      </div>

      {/* Network Stats */}
      <div className="mt-6 grid grid-cols-5 gap-4">
        {tokenData.map((cluster) => (
          <div key={cluster.type} className="text-center p-3 rounded-lg" style={{
            backgroundColor: `${getNodeColor('', cluster.type)}15`,
            borderColor: getNodeColor('', cluster.type),
            borderWidth: '1px'
          }}>
            <div className="text-lg font-bold" style={{ color: getNodeColor('', cluster.type) }}>
              {nodes.filter(n => n.id.startsWith(cluster.type) && n.discovered).length}
            </div>
            <div className="text-xs capitalize" style={{ color: getNodeColor('', cluster.type) }}>
              {cluster.type}
            </div>
          </div>
        ))}
      </div>

      {/* Connection Types Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {['similarity', 'dependency', 'semantic', 'usage'].map(type => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-3 h-px"
              style={{ backgroundColor: getConnectionColor(type) }}
            />
            <span className="text-neutral-600 dark:text-neutral-400 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}