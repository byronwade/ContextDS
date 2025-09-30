# Testing Documentation

## Overview

ContextDS uses **Playwright** for comprehensive E2E testing, API testing, stress testing, and visual regression testing.

## Quick Start

```bash
# Install Playwright browsers
bun run test:install

# Run all tests (IMPORTANT: use "bun run test", not "bun test")
bun run test

# Run tests with UI mode (recommended for development)
bun run test:ui
```

## Test Suites

### 1. E2E Tests - Scanner functionality and user flows
### 2. API Tests - Direct endpoint validation
### 3. Stress Tests - High-load scenarios with real websites
### 4. Visual Tests - Screenshot comparison

## Commands

- `bun test` - Run all tests
- `bun run test:ui` - Interactive UI mode
- `bun run test:chromium` - Chrome tests only
- `bun run test:stress` - Stress testing suite
- `bun run test:visual` - Visual regression
- `bun run test:report` - View HTML report

See package.json scripts for all available commands.
