"use client"

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] w-full items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Something went wrong
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mt-4">
                  <summary className="text-xs text-neutral-500 cursor-pointer">
                    Error details (development)
                  </summary>
                  <pre className="text-xs text-red-600 dark:text-red-400 mt-2 bg-neutral-100 dark:bg-neutral-900 p-2 rounded overflow-auto">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}