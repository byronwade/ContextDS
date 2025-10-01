import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Radar, Target, Radio, Scan, Zap, MapPin } from "lucide-react"

interface RadarTarget {
  id: string
  type: 'component' | 'token' | 'pattern' | 'issue'
  name: string
  x: number
  y: number
  distance: number
  strength: number
  discovered: boolean
  locked: boolean
}

interface RadarSweep {
  angle: number
  strength: number
  detecting: boolean
}

const targetTypes = [
  { type: 'component', items: ['Button', 'Card', 'Modal', 'Input', 'Table', 'Form', 'Header', 'Footer', 'Sidebar', 'Navigation'] },
  { type: 'token', items: ['Primary Color', 'Secondary Font', 'Base Spacing', 'Border Radius', 'Shadow Elevation', 'Brand Colors'] },
  { type: 'pattern', items: ['Grid Layout', 'Flex Pattern', 'Container Width', 'Responsive Breakpoint', 'Animation Timing'] },
  { type: 'issue', items: ['Color Contrast', 'Missing Alt Text', 'Broken Link', 'Large Image', 'Unused CSS'] }
]

interface ScanningRadarProps {
  className?: string
  isActive?: boolean
}

export function ScanningRadar({ className, isActive = true }: ScanningRadarProps) {
  const [radarAngle, setRadarAngle] = useState(0)
  const [targets, setTargets] = useState<RadarTarget[]>([])
  const [currentSweep, setCurrentSweep] = useState<RadarSweep>({ angle: 0, strength: 1, detecting: false })
  const [scanStats, setScanStats] = useState({
    components: 0,
    tokens: 0,
    patterns: 0,
    issues: 0,
    total: 0
  })
  const [scanMode, setScanMode] = useState<'sweep' | 'pulse' | 'focus'>('sweep')
  const [activeQuadrant, setActiveQuadrant] = useState(0)

  useEffect(() => {
    if (!isActive) return

    // Generate radar targets
    const generateTargets = (): RadarTarget[] => {
      const newTargets: RadarTarget[] = []
      const centerX = 150
      const centerY = 150
      const maxRadius = 120

      targetTypes.forEach((category, categoryIndex) => {
        category.items.forEach((item, itemIndex) => {
          const angle = Math.random() * 2 * Math.PI
          const distance = 30 + Math.random() * (maxRadius - 30)
          const x = centerX + Math.cos(angle) * distance
          const y = centerY + Math.sin(angle) * distance

          newTargets.push({
            id: `${category.type}-${itemIndex}`,
            type: category.type as any,
            name: item,
            x,
            y,
            distance,
            strength: 0.3 + Math.random() * 0.7,
            discovered: false,
            locked: false
          })
        })
      })

      return newTargets.slice(0, 25) // Limit for performance
    }

    const allTargets = generateTargets()
    setTargets(allTargets)

    // Radar sweep animation
    const sweepInterval = setInterval(() => {
      setRadarAngle(prev => (prev + 2) % 360)
      setCurrentSweep(prev => ({
        ...prev,
        angle: (prev.angle + 2) % 360,
        detecting: Math.random() > 0.7
      }))

      // Detect targets in sweep path
      const currentAngleRad = (radarAngle * Math.PI) / 180
      const sweepWidth = 30 // degrees

      setTargets(prev => prev.map(target => {
        const targetAngle = Math.atan2(target.y - 150, target.x - 150) * 180 / Math.PI
        const normalizedTargetAngle = targetAngle < 0 ? targetAngle + 360 : targetAngle
        const normalizedSweepAngle = radarAngle < 0 ? radarAngle + 360 : radarAngle

        const angleDiff = Math.abs(normalizedSweepAngle - normalizedTargetAngle)
        const isInSweep = angleDiff <= sweepWidth || angleDiff >= (360 - sweepWidth)

        if (isInSweep && !target.discovered && Math.random() > 0.85) {
          return { ...target, discovered: true }
        }
        return target
      }))

      // Update quadrant focus
      setActiveQuadrant(Math.floor(radarAngle / 90))
    }, 50)

    // Stats update
    const statsInterval = setInterval(() => {
      const discovered = targets.filter(t => t.discovered)
      setScanStats({
        components: discovered.filter(t => t.type === 'component').length,
        tokens: discovered.filter(t => t.type === 'token').length,
        patterns: discovered.filter(t => t.type === 'pattern').length,
        issues: discovered.filter(t => t.type === 'issue').length,
        total: discovered.length
      })
    }, 100)

    // Scan mode cycling
    const modeInterval = setInterval(() => {
      setScanMode(prev => {
        switch (prev) {
          case 'sweep': return 'pulse'
          case 'pulse': return 'focus'
          case 'focus': return 'sweep'
        }
      })
    }, 8000)

    return () => {
      clearInterval(sweepInterval)
      clearInterval(statsInterval)
      clearInterval(modeInterval)
    }
  }, [isActive, radarAngle, targets])

  const getTargetColor = (type: string) => {
    switch (type) {
      case 'component': return '#3B82F6'
      case 'token': return '#10B981'
      case 'pattern': return '#8B5CF6'
      case 'issue': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getQuadrantName = (quadrant: number) => {
    const names = ['Frontend Components', 'Design Tokens', 'Layout Patterns', 'Accessibility Issues']
    return names[quadrant] || 'Unknown Sector'
  }

  if (!isActive) return null

  return (
    <div className={cn("border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Radar className="w-8 h-8 text-emerald-500 animate-spin" style={{ animationDuration: '2s' }} />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Scanning Radar</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {getQuadrantName(activeQuadrant)} • {scanMode.toUpperCase()} mode
          </p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
              {scanStats.total} detected
            </span>
          </div>
        </div>
      </div>

      {/* Scan Mode Indicator */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Mode:</span>
          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-mono border",
            scanMode === 'sweep' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
            scanMode === 'pulse' && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
            scanMode === 'focus' && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
          )}>
            <div className="flex items-center gap-1">
              {scanMode === 'sweep' && <Scan className="w-3 h-3" />}
              {scanMode === 'pulse' && <Radio className="w-3 h-3" />}
              {scanMode === 'focus' && <Target className="w-3 h-3" />}
              {scanMode}
            </div>
          </div>
        </div>
        <div className="flex-1 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-100"
            style={{ width: `${(radarAngle / 360) * 100}%` }}
          />
        </div>
      </div>

      {/* Radar Display */}
      <div className="relative h-80 bg-gradient-to-br from-neutral-900 via-emerald-950 to-neutral-900 rounded-lg overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
          {/* Radar grid */}
          <defs>
            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.1"/>
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.05"/>
              <stop offset="100%" stopColor="#000000" stopOpacity="0.3"/>
            </radialGradient>

            <filter id="radarGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="100%" height="100%" fill="url(#radarGradient)" />

          {/* Radar circles */}
          {[40, 80, 120].map((radius, i) => (
            <circle
              key={`circle-${i}`}
              cx="150"
              cy="150"
              r={radius}
              fill="none"
              stroke="#10B981"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}

          {/* Radar lines */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const x2 = 150 + Math.cos((angle * Math.PI) / 180) * 120
            const y2 = 150 + Math.sin((angle * Math.PI) / 180) * 120
            return (
              <line
                key={`line-${i}`}
                x1="150"
                y1="150"
                x2={x2}
                y2={y2}
                stroke="#10B981"
                strokeWidth="1"
                opacity="0.3"
              />
            )
          })}

          {/* Quadrant labels */}
          <text x="220" y="80" textAnchor="middle" className="text-xs fill-emerald-400 font-mono">COMP</text>
          <text x="220" y="220" textAnchor="middle" className="text-xs fill-emerald-400 font-mono">TOKEN</text>
          <text x="80" y="220" textAnchor="middle" className="text-xs fill-emerald-400 font-mono">PATTERN</text>
          <text x="80" y="80" textAnchor="middle" className="text-xs fill-emerald-400 font-mono">ISSUE</text>

          {/* Radar sweep */}
          <defs>
            <linearGradient
              id="sweepGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
              gradientTransform={`rotate(${radarAngle} 150 150)`}
            >
              <stop offset="0%" stopColor="#10B981" stopOpacity="0"/>
              <stop offset="70%" stopColor="#10B981" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
            </linearGradient>
          </defs>

          <path
            d="M 150 150 L 150 30 A 120 120 0 0 1 220 80 Z"
            fill="url(#sweepGradient)"
            transform={`rotate(${radarAngle} 150 150)`}
            filter="url(#radarGlow)"
          />

          {/* Targets */}
          {targets.map((target) => (
            <g key={target.id}>
              {target.discovered && (
                <>
                  {/* Target blip */}
                  <circle
                    cx={target.x}
                    cy={target.y}
                    r="3"
                    fill={getTargetColor(target.type)}
                    className="animate-pulse"
                    filter="url(#radarGlow)"
                  />

                  {/* Target ring */}
                  <circle
                    cx={target.x}
                    cy={target.y}
                    r="8"
                    fill="none"
                    stroke={getTargetColor(target.type)}
                    strokeWidth="1"
                    opacity="0.5"
                    className="animate-ping"
                  />

                  {/* Lock indicator for stationary targets */}
                  {target.locked && (
                    <circle
                      cx={target.x}
                      cy={target.y}
                      r="12"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                      strokeDasharray="2,2"
                    />
                  )}
                </>
              )}
            </g>
          ))}

          {/* Center scanner */}
          <circle
            cx="150"
            cy="150"
            r="4"
            fill="#10B981"
            className="animate-pulse"
          />
        </svg>

        {/* Scanning beam overlay */}
        {scanMode === 'pulse' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute w-full h-full rounded-full border-4 border-emerald-500 opacity-30 animate-ping" />
          </div>
        )}
      </div>

      {/* Target Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {scanStats.components}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">Components</div>
        </div>
        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {scanStats.tokens}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Tokens</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {scanStats.patterns}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400">Patterns</div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {scanStats.issues}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">Issues</div>
        </div>
      </div>

      {/* Recent Detections */}
      <div className="mt-4">
        <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
          Recent Detections:
        </div>
        <div className="flex flex-wrap gap-2">
          {targets
            .filter(t => t.discovered)
            .slice(-6)
            .map(target => (
              <div
                key={target.id}
                className="px-2 py-1 rounded text-xs font-mono border"
                style={{
                  backgroundColor: `${getTargetColor(target.type)}15`,
                  borderColor: getTargetColor(target.type),
                  color: getTargetColor(target.type)
                }}
              >
                {target.name}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}