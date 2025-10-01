"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, AlertCircle, CheckCircle2, ChevronDown, Loader2, ExternalLink, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface VercelScanInputProps {
  value: string
  onChange: (value: string) => void
  onScan: (url: string) => void
  isLoading?: boolean
  className?: string
  placeholder?: string
  recentSites?: Array<{
    domain: string
    tokens: number
    lastScanned?: string
  }>
}

interface ScanOptions {
  extractLayoutDNA: boolean
  includeScreenshots: boolean
  deepComponentScan: boolean
  accessibilityAnalysis: boolean
  performanceMetrics: boolean
  mobileBreakpoints: boolean
}

export function VercelScanInput({
  value,
  onChange,
  onScan,
  isLoading = false,
  className,
  placeholder = "Enter website URL to extract design tokens...",
  recentSites = []
}: VercelScanInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [scanOptions, setScanOptions] = useState<ScanOptions>({
    extractLayoutDNA: true,
    includeScreenshots: false,
    deepComponentScan: false,
    accessibilityAnalysis: false,
    performanceMetrics: false,
    mobileBreakpoints: true
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // URL validation
  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setValidationState('idle')
      setErrorMessage('')
      return
    }

    try {
      // Add protocol if missing
      const urlToTest = url.includes('://') ? url : `https://${url}`
      const urlObj = new URL(urlToTest)

      // Basic validation
      if (!urlObj.hostname.includes('.')) {
        setValidationState('invalid')
        setErrorMessage('Please enter a valid domain name')
        return
      }

      if (urlObj.hostname === 'localhost' || urlObj.hostname.startsWith('127.')) {
        setValidationState('invalid')
        setErrorMessage('Local URLs cannot be scanned')
        return
      }

      setValidationState('valid')
      setErrorMessage('')
    } catch {
      setValidationState('invalid')
      setErrorMessage('Please enter a valid URL')
    }
  }

  // Handle value changes
  useEffect(() => {
    validateUrl(value)
  }, [value])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Show suggestions when typing
    if (newValue.length > 0 && recentSites.length > 0) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleScan = () => {
    if (validationState === 'valid' && value.trim()) {
      // Ensure URL has protocol
      const urlToScan = value.includes('://') ? value : `https://${value}`
      onScan(urlToScan)
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && validationState === 'valid') {
      e.preventDefault()
      handleScan()
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setShowAdvanced(false)
    }
  }

  const handleSuggestionClick = (domain: string) => {
    onChange(domain)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const toggleOption = (key: keyof ScanOptions) => {
    setScanOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const filteredSuggestions = recentSites.filter(site =>
    site.domain.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 5)

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-4xl mx-auto", className)}>
      {/* Main Input Container */}
      <div className={cn(
        "relative flex items-center transition-all duration-300 ease-out",
        "rounded-xl border border-border bg-background/80 backdrop-blur-sm",
        "hover:border-scan-border-focus/30 hover:shadow-context-md",
        isFocused && "border-scan-border-focus shadow-context-lg ring-4 ring-scan-border-focus/10",
        validationState === 'invalid' && "border-destructive shadow-context-md ring-4 ring-destructive/10",
        validationState === 'valid' && "border-success shadow-context-md ring-4 ring-success/10",
        isLoading && "border-warning shadow-context-lg ring-4 ring-warning/10"
      )}>
        {/* Input Field */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="url"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true)
              if (value.length > 0 && recentSites.length > 0) {
                setShowSuggestions(true)
              }
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "h-14 pl-12 pr-32 text-base font-mono border-0 bg-transparent shadow-none",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground placeholder:font-sans"
            )}
            aria-label="Website URL to scan"
            aria-describedby={errorMessage ? "scan-error" : "scan-help"}
            aria-invalid={validationState === 'invalid'}
          />

          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-warning animate-spin" />
            ) : (
              <Sparkles className={cn(
                "h-5 w-5 transition-colors duration-200",
                validationState === 'valid' ? "text-success" :
                validationState === 'invalid' ? "text-destructive" :
                isFocused ? "text-scan-border-focus" : "text-muted-foreground"
              )} />
            )}
          </div>

          {/* Validation Icon */}
          {validationState !== 'idle' && !isLoading && (
            <div className="absolute right-28 top-1/2 -translate-y-1/2">
              {validationState === 'valid' ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          )}
        </div>

        {/* Scan Button */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Button
            onClick={handleScan}
            disabled={validationState !== 'valid' || isLoading}
            size="lg"
            className={cn(
              "h-10 px-6 bg-gradient-to-r from-primary to-chart-5 text-primary-foreground",
              "hover:from-primary/90 hover:to-chart-5/90 hover:shadow-lg hover:scale-105",
              "active:scale-95 transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
              "font-medium tracking-wide"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Scanning
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div id="scan-error" className="mt-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      {/* Help Text */}
      {!errorMessage && validationState === 'idle' && (
        <div id="scan-help" className="mt-2 text-sm text-muted-foreground">
          Enter a website URL to extract design tokens, colors, and typography
        </div>
      )}

      {/* Success Message */}
      {validationState === 'valid' && !isLoading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Ready to scan • Press Enter or click Scan
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-background border border-border rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto">
            <div className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wide">
              Recent Sites
            </div>
            {filteredSuggestions.map((site, index) => (
              <button
                key={site.domain}
                onClick={() => handleSuggestionClick(site.domain)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{site.domain}</div>
                    <div className="text-xs text-muted-foreground">
                      {site.tokens} tokens
                    </div>
                  </div>
                </div>
                {site.lastScanned && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(site.lastScanned).toLocaleDateString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <div className="mt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            showAdvanced && "rotate-180"
          )} />
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 rounded-lg border border-border bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(scanOptions).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggleOption(key as keyof ScanOptions)}
                    className="rounded border-border focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                  <span className="text-sm group-hover:text-foreground transition-colors">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">⌘K</kbd> to focus
      </div>
    </div>
  )
}