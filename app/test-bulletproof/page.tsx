'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface TestResult {
  name: string
  url: string
  success: boolean
  duration: number
  memoryUsed?: number
  cssSources?: number
  tokensExtracted?: number
  confidence?: number
  isLargeSite?: boolean
  error?: string
  errorType?: string
  limits: {
    memoryLimitMb: number
    timeoutMs: number
    includeComputed: boolean
    mode: string
  }
}

interface TestSummary {
  totalTests: number
  successCount: number
  failureCount: number
  totalDuration: number
  averageDuration: number
}

export default function BulletproofTestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [customUrl, setCustomUrl] = useState('https://apple.com')
  const [results, setResults] = useState<TestResult[]>([])
  const [summary, setSummary] = useState<TestSummary | null>(null)
  const [currentTest, setCurrentTest] = useState('')

  const runTestSuite = async () => {
    setIsRunning(true)
    setResults([])
    setSummary(null)
    setCurrentTest('Initializing bulletproof test suite...')

    try {
      const response = await fetch('/api/test-bulletproof')
      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setSummary(data.summary)
        setCurrentTest('')
      } else {
        console.error('Test suite failed:', data.error)
        setCurrentTest(`Test failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Test suite error:', error)
      setCurrentTest(`Test error: ${error}`)
    }

    setIsRunning(false)
  }

  const runCustomTest = async () => {
    if (!customUrl) return

    setIsRunning(true)
    setCurrentTest(`Testing ${customUrl}...`)

    try {
      const response = await fetch('/api/test-bulletproof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: customUrl,
          memoryLimitMb: 100,
          timeoutMs: 25000,
          includeComputed: false,
          mode: 'fast'
        })
      })

      const data = await response.json()

      if (data.success) {
        const customResult: TestResult = {
          name: `Custom: ${new URL(customUrl).hostname}`,
          url: customUrl,
          success: true,
          duration: data.result.duration,
          memoryUsed: data.result.memoryUsed,
          cssSources: data.result.cssSources,
          tokensExtracted: data.result.tokensExtracted,
          confidence: data.result.confidence,
          isLargeSite: data.result.isLargeSite,
          limits: data.config
        }

        setResults(prev => [customResult, ...prev])
        setCurrentTest('')
      } else {
        console.error('Custom test failed:', data.error)
        setCurrentTest(`Custom test failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Custom test error:', error)
      setCurrentTest(`Custom test error: ${error}`)
    }

    setIsRunning(false)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">🛡️ Bulletproof Scanning Test</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test the scanning system&apos;s resilience against large sites like Apple, Microsoft, and Google.
          The bulletproof system includes memory limits, timeouts, circuit breakers, and progressive scanning.
        </p>
      </div>

      {/* Bulletproof Features */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Bulletproof Features</CardTitle>
          <CardDescription>
            Protection mechanisms implemented to handle large sites without crashing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Badge variant="outline" className="p-2 justify-center">
              ⏱️ Timeout Controls
            </Badge>
            <Badge variant="outline" className="p-2 justify-center">
              🧠 Memory Limits
            </Badge>
            <Badge variant="outline" className="p-2 justify-center">
              🔄 Circuit Breakers
            </Badge>
            <Badge variant="outline" className="p-2 justify-center">
              📈 Progressive Scanning
            </Badge>
            <Badge variant="outline" className="p-2 justify-center">
              🧹 Resource Cleanup
            </Badge>
            <Badge variant="outline" className="p-2 justify-center">
              💪 Graceful Degradation
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🧪 Test Suite</CardTitle>
            <CardDescription>
              Run predefined tests against GitHub, Vercel, and Tailwind CSS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runTestSuite}
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? 'Running Tests...' : 'Run Test Suite'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🎯 Custom Test</CardTitle>
            <CardDescription>
              Test any website with bulletproof limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="https://example.com"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            <Button
              onClick={runCustomTest}
              disabled={isRunning || !customUrl}
              className="w-full"
            >
              {isRunning ? 'Testing...' : 'Test Website'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Test Status */}
      {currentTest && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="font-medium">{currentTest}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.successCount}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failureCount}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.totalTests}</div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(summary.totalDuration / 1000)}s</div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(summary.averageDuration / 1000)}s</div>
                <div className="text-sm text-muted-foreground">Avg Time</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Success Rate</span>
                <span>{Math.round((summary.successCount / summary.totalTests) * 100)}%</span>
              </div>
              <Progress value={(summary.successCount / summary.totalTests) * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">🔍 Test Results</h2>
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{result.name}</CardTitle>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? '✅ Success' : '❌ Failed'}
                  </Badge>
                </div>
                <CardDescription>{result.url}</CardDescription>
              </CardHeader>
              <CardContent>
                {result.success ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Duration:</span>
                      <div className="text-muted-foreground">{Math.round(result.duration / 1000)}s</div>
                    </div>
                    <div>
                      <span className="font-medium">Memory:</span>
                      <div className="text-muted-foreground">{result.memoryUsed || 0}MB</div>
                    </div>
                    <div>
                      <span className="font-medium">CSS Sources:</span>
                      <div className="text-muted-foreground">{result.cssSources || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium">Tokens:</span>
                      <div className="text-muted-foreground">{result.tokensExtracted || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span>
                      <div className="text-muted-foreground">{Math.round((result.confidence || 0) * 100)}%</div>
                    </div>
                    <div>
                      <span className="font-medium">Large Site:</span>
                      <div className="text-muted-foreground">{result.isLargeSite ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <span className="font-medium">Memory Limit:</span>
                      <div className="text-muted-foreground">{result.limits.memoryLimitMb}MB</div>
                    </div>
                    <div>
                      <span className="font-medium">Timeout:</span>
                      <div className="text-muted-foreground">{Math.round(result.limits.timeoutMs / 1000)}s</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-red-600 font-medium">
                      {result.errorType}: {result.error}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Duration: {Math.round(result.duration / 1000)}s (before failure)
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}