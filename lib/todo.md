# Lib TODO

## Database (lib/db)
- [ ] Drizzle schema for sites table
- [ ] Drizzle schema for scans table
- [ ] Drizzle schema for pages table
- [ ] Drizzle schema for css_sources table
- [ ] Drizzle schema for token_sets table
- [ ] Drizzle schema for layout_profiles table
- [ ] Drizzle schema for org_artifacts table
- [ ] Drizzle schema for submissions table
- [ ] Drizzle schema for token_votes table
- [ ] Drizzle schema for remixes table
- [ ] Drizzle schema for users table
- [ ] Drizzle schema for subscriptions table
- [ ] Drizzle schema for api_keys table
- [ ] Drizzle schema for mcp_usage table
- [ ] Drizzle schema for audit_log table
- [ ] Database migration system
- [ ] Connection pool management
- [ ] Query helpers and utilities

## Authentication (lib/auth)
- [ ] Supabase client configuration
- [ ] Authentication middleware
- [ ] Session management utilities
- [ ] RLS policy helpers
- [ ] User role management
- [ ] API key authentication system
- [ ] OAuth provider setup

## CSS Extractors (lib/extractors)
- [ ] Project Wallace extract-css-core integration
- [ ] Headless browser setup (Playwright/Puppeteer)
- [ ] Static CSS extraction from <link> tags
- [ ] Runtime CSS extraction from computed styles
- [ ] CSS-in-JS detection and extraction
- [ ] Multi-viewport CSS capture
- [ ] CSS source deduplication and hashing
- [ ] Robots.txt compliance checker

## Analyzers (lib/analyzers)
- [ ] Project Wallace css-analyzer integration
- [ ] Color token extraction and normalization
- [ ] Typography token extraction (family, size, line-height)
- [ ] Spacing token extraction and clustering
- [ ] Border radius token extraction
- [ ] Shadow token extraction and categorization
- [ ] Motion token extraction (duration, easing)
- [ ] Gradient token extraction (linear, radial)
- [ ] Layout DNA analyzer (grid/flex patterns)
- [ ] Container width analysis
- [ ] Breakpoint detection from media queries
- [ ] Archetype classification system
- [ ] Accessibility contrast analysis
- [ ] Token confidence scoring algorithm
- [ ] W3C design token format generator

## MCP Server (lib/mcp)
- [ ] MCP protocol implementation
- [ ] scan_tokens tool implementation
- [ ] get_tokens tool implementation
- [ ] layout_profile tool implementation
- [ ] research_company_artifacts tool implementation
- [ ] compose_pack tool implementation
- [ ] vote_token tool implementation
- [ ] Tool authentication and rate limiting
- [ ] HTTP mirror endpoints for MCP tools
- [ ] Usage tracking and analytics

## AI Integration (lib/ai)
- [ ] Vercel AI Gateway client setup
- [ ] Prompt pack generation system
- [ ] Token mapping hints generator
- [ ] Pitfall detection algorithms
- [ ] Remix constraints reconciliation
- [ ] AI model response validation
- [ ] Fallback mechanisms for AI failures

## Utilities (lib/)
- [ ] Enhanced cn() utility with design system tokens
- [ ] Date/time formatting utilities
- [ ] URL validation and normalization
- [ ] File upload and processing utilities
- [ ] Image optimization helpers
- [ ] Cache management utilities
- [ ] Error handling and logging
- [ ] Performance monitoring helpers

## Completed: 0/64 | Pending: 64/64