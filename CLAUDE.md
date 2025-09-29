# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ContextDS** is a design token extraction and analysis platform that automatically scans websites to generate AI-readable design tokens and layout DNA profiles. Built with Next.js 15, App Router, React 19, TypeScript, and Tailwind CSS, this project aims to be the fastest, most accurate way to turn any public site into actionable design tokens for AI agents.

### Core Vision
- **Dashboard + Marketing Website**: Comprehensive platform with public directory and premium tools
- **Design Token Extraction**: CSS analysis and W3C token generation (parity with Project Wallace)
- **Layout DNA Profiling**: Multi-page layout analysis across breakpoints
- **AI Integration**: MCP server tools for Claude Code and other AI agents
- **Community Features**: Voting, remixing, and collaborative token refinement

## Development Commands

- **Development**: `bun dev` (uses Turbopack for fast development)
- **Build**: `bun build` (production build with Turbopack)
- **Start**: `bun start` (start production server)
- **Lint**: `bun lint` (ESLint with Next.js TypeScript config)

## Project Architecture

### Organization Philosophy
- **Molecule Method**: Components organized by atomic design principles (atoms → molecules → organisms → templates)
- **Extreme Organization**: Every directory requires `todo.md` for tracking incomplete features and tasks
- **Continuous Pruning**: Remove old/bad logic and files; maintain clean, purposeful codebase
- **Best Design Practices**: Follow modern design systems principles with consistent patterns

### Directory Structure

```
app/                    # Next.js App Router pages and layouts
├── (dashboard)/        # Dashboard routes (authenticated)
├── (marketing)/        # Public marketing pages
├── api/               # API routes and MCP server endpoints
└── globals.css        # Global styles and CSS variables

components/
├── atoms/             # Basic UI elements (buttons, inputs, etc.)
├── molecules/         # Combined atoms (form fields, cards, etc.)
├── organisms/         # Complex UI sections (headers, sidebars, etc.)
├── templates/         # Page-level layouts
└── ui/               # shadcn/ui component library

lib/
├── utils.ts          # Core utilities (cn, formatters, etc.)
├── db/               # Drizzle ORM schema and migrations
├── auth/             # Supabase authentication
├── extractors/       # CSS extraction and analysis engines
├── analyzers/        # Token analysis and layout DNA computation
├── mcp/              # Model Context Protocol server tools
└── ai/               # Vercel AI Gateway integration

hooks/                # Custom React hooks
stores/               # Zustand state management
workers/              # Background job processors
public/               # Static assets
```

### Technology Stack

**Frontend**
- **Framework**: Next.js 15 with App Router and React 19
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **UI Components**: shadcn/ui with "new-york" style variant
- **State Management**: Zustand for client-side state
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation

**Backend & Data**
- **Database**: Supabase Postgres with Row Level Security
- **ORM**: Drizzle ORM for schema and migrations
- **Authentication**: Supabase Auth (email/password, OAuth)
- **Storage**: Supabase Storage for screenshots and assets
- **Queue**: Background job processing for site scanning

**AI & Analysis**
- **CSS Extraction**: Project Wallace's MIT-licensed extractors
- **Token Analysis**: Custom implementation inspired by css-design-tokens
- **AI Gateway**: Vercel AI Gateway for model portability
- **MCP Server**: Model Context Protocol tools for AI agents

### Component Architecture

**Atomic Design System**
- **Atoms**: Basic UI primitives (Button, Input, Badge, etc.)
- **Molecules**: Composed atoms (SearchForm, TokenCard, VoteButton, etc.)
- **Organisms**: Complex sections (SiteDirectory, TokenAnalyzer, RemixStudio, etc.)
- **Templates**: Page layouts with slot-based composition
- **Pages**: Specific route implementations

**Key Patterns**
- Compound component patterns with Radix UI primitives
- Consistent variant system using `class-variance-authority`
- Forward ref patterns for composition
- TypeScript-first with full RSC support
- CSS variables for theming support

The `cn()` utility in `lib/utils.ts` combines clsx and tailwind-merge for optimal class name handling.

## Core Features

### Design Token Extraction (Wallace Parity)
- **CSS Collection**: Static + runtime CSS from any public URL
- **Token Categories**: Colors, Typography, Gradients, Shadows, Radii, Motion, Spacing
- **W3C Format**: Standard design token output with provenance tracking
- **Prettify Option**: Formatted CSS display (matching Project Wallace UX)

### Layout DNA Profiling (Differentiator)
- **Multi-page Analysis**: Homepage + internal pages across 3 breakpoints
- **Layout Patterns**: Container widths, grid/flex ratios, spacing scales
- **Archetypes**: Marketing hero, feature grid, pricing table, documentation
- **Accessibility**: Color contrast analysis and compliance scoring

### AI Integration
- **MCP Server**: Model Context Protocol tools for Claude Code integration
- **Prompt Packs**: AI-readable design guidance with mapping hints and pitfalls
- **Vercel AI Gateway**: Model-agnostic AI processing for token analysis

### Community & Collaboration
- **Public Directory**: Searchable database of analyzed sites and tokens
- **Voting System**: Community validation of token accuracy and aliases
- **Remix Studio**: Combine multiple token sets with AI reconciliation
- **Research Integration**: Design system documentation and GitHub package discovery

## Data Architecture

### Core Entities
- **Sites**: Domain tracking with robots.txt compliance and opt-out support
- **Scans**: CSS extraction jobs with provenance and version tracking
- **Token Sets**: W3C design tokens with confidence scoring and consensus
- **Layout Profiles**: Multi-breakpoint layout analysis and archetype detection
- **AI Prompt Packs**: Model-agnostic guidance for token application
- **Community Data**: Voting, remixes, and collaborative improvements

### Privacy & Compliance
- **Row Level Security**: Supabase RLS for user data isolation
- **Public/Private**: Configurable visibility for token sets and remixes
- **Robots.txt Respect**: Automatic compliance checking before scanning
- **Owner Opt-out**: Domain owner removal with verification process

## MCP Tools

The platform exposes Model Context Protocol tools for AI agent integration:

### Available Tools
- `scan_tokens(url, options)` - Extract design tokens from any public site
- `get_tokens(url, version?)` - Retrieve cached tokens and AI prompt packs
- `layout_profile(url, pages?, viewports?)` - Get layout DNA analysis
- `research_company_artifacts(url, github_org?)` - Find design system docs
- `compose_pack(tokens, profile, intent?)` - Generate AI guidance packages
- `vote_token(set_id, token_key, vote_type)` - Community token validation

### Authentication & Quotas
- **API Keys**: User-scoped access with usage tracking
- **Rate Limits**: 60 req/min burst, 10/min sustained for paid users
- **Usage Tracking**: Logged without PII for billing and analytics

## Development Guidelines

### Code Organization
- **Atomic Design**: Strict component hierarchy (atoms → molecules → organisms → templates)
- **File Pruning**: Regular removal of unused/outdated code and dependencies
- **Todo Tracking**: Every directory maintains `todo.md` for incomplete features
- **Single Responsibility**: Components and functions should have clear, focused purposes

### Performance Requirements
- **TTFB**: ≤ 200ms for cached content
- **Route Changes**: ≤ 300ms navigation
- **JS Bundle**: ≤ 170KB for hydrated UI
- **Images**: Lazy loading with proper optimization

### Security & Compliance
- **MIT License**: Use Project Wallace's MIT-licensed CSS extraction tools
- **EUPL Awareness**: Avoid direct linking of EUPL-licensed dependencies
- **Data Minimization**: Store only public data and essential user information
- **Access Control**: Implement proper RLS policies for all sensitive data

## TypeScript Configuration

- Uses `@/*` path mapping for clean imports across the atomic design structure
- Strict mode enabled with Next.js plugin integration
- Bundler module resolution for optimal performance with Turbopack
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/stores`, `@/workers`

## Build and Runtime

- Bun as package manager and runtime
- Turbopack integration for both dev and build for maximum performance
- PostCSS with Tailwind CSS v4 plugin
- Font optimization with Geist Sans and Geist Mono
- Background job processing with worker queue system
- Headless browser capabilities for CSS extraction and screenshots