# Workers TODO

## Background Job Processing

### CSS Extraction Workers
- [ ] ScanJobWorker - orchestrates full site scanning pipeline
- [ ] CSSExtractionWorker - extracts CSS from individual pages
- [ ] HeadlessBrowserWorker - manages Playwright/Puppeteer instances
- [ ] StaticCSSWorker - processes <link> and <style> tags
- [ ] ComputedStylesWorker - captures runtime CSS from headless browser
- [ ] CSSDeduplicationWorker - removes duplicate CSS and generates hashes

### Analysis Workers
- [ ] TokenAnalysisWorker - processes CSS through analyzers
- [ ] LayoutDNAWorker - analyzes multi-page layout patterns
- [ ] ArchetypeDetectionWorker - classifies page types and patterns
- [ ] AccessibilityWorker - performs contrast and a11y analysis
- [ ] ConfidenceScoreWorker - calculates token confidence metrics

### AI Processing Workers
- [ ] PromptPackWorker - generates AI guidance via Vercel Gateway
- [ ] RemixReconciliationWorker - AI-powered token set merging
- [ ] CompanyResearchWorker - discovers design system artifacts
- [ ] GitHubAnalysisWorker - analyzes repos for design system packages

### Data Processing Workers
- [ ] TokenNormalizationWorker - converts to W3C format
- [ ] ImageProcessingWorker - generates screenshots and thumbnails
- [ ] CacheWarmingWorker - preloads popular sites
- [ ] MetricsAggregationWorker - computes analytics and popularity scores

### Maintenance Workers
- [ ] RobotsTxtChecker - validates scanning permissions
- [ ] OptOutProcessor - handles domain owner removal requests
- [ ] DataRetentionWorker - cleans up old scans and temporary data
- [ ] UsageTrackingWorker - aggregates API and MCP usage metrics
- [ ] HealthCheckWorker - monitors system status and alerts

## Worker Infrastructure
- [ ] Queue management system (Redis/Supabase)
- [ ] Job scheduling and retry logic
- [ ] Error handling and dead letter queues
- [ ] Worker pool management and scaling
- [ ] Performance monitoring and metrics
- [ ] Resource cleanup and memory management
- [ ] Rate limiting and throttling
- [ ] Priority queue for paid users

## Completed: 0/29 | Pending: 29/29