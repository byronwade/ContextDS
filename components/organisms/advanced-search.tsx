"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Settings, Filter, ChevronDown, Code, Palette, Hash, Type } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchFilters {
  pattern: string
  mode: 'tokens' | 'sites' | 'layouts' | 'code'
  outputMode: 'content' | 'files_with_matches' | 'count'
  caseInsensitive: boolean
  multiline: boolean
  showLineNumbers: boolean
  contextBefore: number
  contextAfter: number
  headLimit: number
  globPattern: string
  tokenType: string
  confidenceMin: number
  popularityMin: number
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  loading?: boolean
  className?: string
}

export function AdvancedSearch({ onSearch, loading = false, className }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    pattern: '',
    mode: 'tokens',
    outputMode: 'content',
    caseInsensitive: false,
    multiline: false,
    showLineNumbers: true,
    contextBefore: 0,
    contextAfter: 0,
    headLimit: 50,
    globPattern: '',
    tokenType: 'all',
    confidenceMin: 0,
    popularityMin: 0
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearch = () => {
    if (filters.pattern.trim()) {
      onSearch(filters)
    }
  }

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const searchModes = [
    { value: 'tokens', label: 'Design Tokens', icon: Palette, description: 'Search color, typography, spacing tokens' },
    { value: 'sites', label: 'Websites', icon: Search, description: 'Search site domains and metadata' },
    { value: 'layouts', label: 'Layout DNA', icon: Hash, description: 'Search layout patterns and archetypes' },
    { value: 'code', label: 'CSS/Code', icon: Code, description: 'Search raw CSS and computed styles' }
  ]

  const tokenTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'color', label: 'Colors' },
    { value: 'typography', label: 'Typography' },
    { value: 'spacing', label: 'Spacing' },
    { value: 'radius', label: 'Border Radius' },
    { value: 'shadow', label: 'Shadows' },
    { value: 'motion', label: 'Animations' }
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Mode Tabs */}
      <Tabs value={filters.mode} onValueChange={(value) => updateFilter('mode', value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          {searchModes.map((mode) => {
            const Icon = mode.icon
            return (
              <TabsTrigger key={mode.value} value={mode.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{mode.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {searchModes.map((mode) => (
          <TabsContent key={mode.value} value={mode.value} className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <mode.icon className="h-5 w-5" />
                  <CardTitle className="text-lg">{mode.label} Search</CardTitle>
                </div>
                <CardDescription>{mode.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Search Input */}
                <div className="space-y-2">
                  <Label htmlFor="search-pattern">Search Pattern</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-pattern"
                      placeholder={
                        mode.value === 'tokens' ? 'Search token names, values, or patterns...' :
                        mode.value === 'sites' ? 'Search domains, titles, or descriptions...' :
                        mode.value === 'layouts' ? 'Search layout patterns, archetypes...' :
                        'Search CSS properties, selectors, values...'
                      }
                      value={filters.pattern}
                      onChange={(e) => updateFilter('pattern', e.target.value)}
                      className="pl-10 h-12 text-base"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Examples:</span>
                    {mode.value === 'tokens' && (
                      <>
                        <code className="bg-muted px-1 rounded">primary</code>
                        <code className="bg-muted px-1 rounded">#[0-9a-f]{6}</code>
                        <code className="bg-muted px-1 rounded">font.*sans</code>
                      </>
                    )}
                    {mode.value === 'sites' && (
                      <>
                        <code className="bg-muted px-1 rounded">stripe</code>
                        <code className="bg-muted px-1 rounded">.*\.com</code>
                        <code className="bg-muted px-1 rounded">design system</code>
                      </>
                    )}
                    {mode.value === 'layouts' && (
                      <>
                        <code className="bg-muted px-1 rounded">grid</code>
                        <code className="bg-muted px-1 rounded">hero.*pattern</code>
                        <code className="bg-muted px-1 rounded">container</code>
                      </>
                    )}
                    {mode.value === 'code' && (
                      <>
                        <code className="bg-muted px-1 rounded">color:</code>
                        <code className="bg-muted px-1 rounded">\.btn.*\{'{'}</code>
                        <code className="bg-muted px-1 rounded">@media</code>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Filters */}
                {mode.value === 'tokens' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Token Type</Label>
                      <Select value={filters.tokenType} onValueChange={(value) => updateFilter('tokenType', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tokenTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Min Confidence</Label>
                      <Select
                        value={filters.confidenceMin.toString()}
                        onValueChange={(value) => updateFilter('confidenceMin', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Any</SelectItem>
                          <SelectItem value="50">50%+</SelectItem>
                          <SelectItem value="70">70%+</SelectItem>
                          <SelectItem value="90">90%+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Site Popularity</Label>
                      <Select
                        value={filters.popularityMin.toString()}
                        onValueChange={(value) => updateFilter('popularityMin', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Any</SelectItem>
                          <SelectItem value="50">Popular (50+)</SelectItem>
                          <SelectItem value="80">Very Popular (80+)</SelectItem>
                          <SelectItem value="95">Top Sites (95+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Advanced Options */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>Advanced Options</span>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {/* Search Options */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Output Mode</Label>
                        <Select value={filters.outputMode} onValueChange={(value) => updateFilter('outputMode', value as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="content">Show Content</SelectItem>
                            <SelectItem value="files_with_matches">Files Only</SelectItem>
                            <SelectItem value="count">Count Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Results Limit</Label>
                        <Select
                          value={filters.headLimit.toString()}
                          onValueChange={(value) => updateFilter('headLimit', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25 results</SelectItem>
                            <SelectItem value="50">50 results</SelectItem>
                            <SelectItem value="100">100 results</SelectItem>
                            <SelectItem value="500">500 results</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>File Pattern</Label>
                        <Input
                          placeholder="*.css, *.json, etc."
                          value={filters.globPattern}
                          onChange={(e) => updateFilter('globPattern', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Context Options */}
                    {filters.outputMode === 'content' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Context Before</Label>
                          <Select
                            value={filters.contextBefore.toString()}
                            onValueChange={(value) => updateFilter('contextBefore', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">None</SelectItem>
                              <SelectItem value="2">2 lines</SelectItem>
                              <SelectItem value="5">5 lines</SelectItem>
                              <SelectItem value="10">10 lines</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Context After</Label>
                          <Select
                            value={filters.contextAfter.toString()}
                            onValueChange={(value) => updateFilter('contextAfter', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">None</SelectItem>
                              <SelectItem value="2">2 lines</SelectItem>
                              <SelectItem value="5">5 lines</SelectItem>
                              <SelectItem value="10">10 lines</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Search Modifiers */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Case Insensitive</Label>
                          <p className="text-xs text-muted-foreground">Ignore case when matching patterns</p>
                        </div>
                        <Switch
                          checked={filters.caseInsensitive}
                          onCheckedChange={(checked) => updateFilter('caseInsensitive', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Multiline Mode</Label>
                          <p className="text-xs text-muted-foreground">Allow patterns to span multiple lines</p>
                        </div>
                        <Switch
                          checked={filters.multiline}
                          onCheckedChange={(checked) => updateFilter('multiline', checked)}
                        />
                      </div>

                      {filters.outputMode === 'content' && (
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Show Line Numbers</Label>
                            <p className="text-xs text-muted-foreground">Include line numbers in results</p>
                          </div>
                          <Switch
                            checked={filters.showLineNumbers}
                            onCheckedChange={(checked) => updateFilter('showLineNumbers', checked)}
                          />
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Search Button */}
                <Button
                  onClick={handleSearch}
                  disabled={!filters.pattern.trim() || loading}
                  className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search {mode.label}
                    </>
                  )}
                </Button>

                {/* Active Filters */}
                {(filters.caseInsensitive || filters.multiline || filters.tokenType !== 'all' || filters.confidenceMin > 0) && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {filters.caseInsensitive && <Badge variant="secondary">Case Insensitive</Badge>}
                    {filters.multiline && <Badge variant="secondary">Multiline</Badge>}
                    {filters.tokenType !== 'all' && <Badge variant="secondary">Type: {filters.tokenType}</Badge>}
                    {filters.confidenceMin > 0 && <Badge variant="secondary">Confidence: {filters.confidenceMin}%+</Badge>}
                    {filters.popularityMin > 0 && <Badge variant="secondary">Popularity: {filters.popularityMin}+</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}