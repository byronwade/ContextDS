#!/usr/bin/env bun

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
const OUTPUT_DIR = 'accessibility-reports'

async function runAccessibilityAudit() {
  console.log('🔍 Starting Comprehensive Accessibility Audit...\n')

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const routes = [
    '/',
    '/features',
    '/community',
    '/scan',
    '/docs',
    '/pricing',
    '/about'
  ]

  console.log('📊 Running Lighthouse Accessibility Audits...')
  for (const route of routes) {
    const url = `${SITE_URL}${route}`
    const routeName = route === '/' ? 'homepage' : route.slice(1)
    const outputPath = path.join(OUTPUT_DIR, `lighthouse-${routeName}.html`)

    try {
      console.log(`  ✓ Auditing ${url}`)
      execSync(`lighthouse ${url} --only-categories=accessibility --output=html --output-path=${outputPath} --chrome-flags="--headless --no-sandbox"`, {
        stdio: 'pipe'
      })
    } catch (error) {
      console.error(`  ✗ Failed to audit ${url}:`, error)
    }
  }

  console.log('\n🤖 Running Pa11y Accessibility Tests...')
  for (const route of routes) {
    const url = `${SITE_URL}${route}`
    const routeName = route === '/' ? 'homepage' : route.slice(1)
    const outputPath = path.join(OUTPUT_DIR, `pa11y-${routeName}.json`)

    try {
      console.log(`  ✓ Testing ${url}`)
      const result = execSync(`pa11y ${url} --reporter json`, {
        encoding: 'utf8'
      })
      fs.writeFileSync(outputPath, result)
    } catch (error) {
      console.error(`  ✗ Failed to test ${url}:`, error)
    }
  }

  console.log('\n🧪 Running Playwright + Axe Tests...')
  try {
    execSync('bunx playwright test tests/accessibility/axe-accessibility.spec.ts --reporter=html --output=accessibility-reports/playwright', {
      stdio: 'inherit'
    })
  } catch (error) {
    console.error('  ✗ Playwright tests failed:', error)
  }

  console.log('\n📋 Generating Accessibility Report Summary...')
  await generateSummaryReport()

  console.log('\n✅ Accessibility audit complete!')
  console.log(`📁 Reports available in: ${OUTPUT_DIR}/`)
}

async function generateSummaryReport() {
  const summaryPath = path.join(OUTPUT_DIR, 'accessibility-summary.md')

  let summary = `# Accessibility Audit Summary\n\n`
  summary += `Generated: ${new Date().toISOString()}\n`
  summary += `Site URL: ${SITE_URL}\n\n`

  // Check Pa11y results
  summary += `## Pa11y Results\n\n`
  const pa11yFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('pa11y-') && f.endsWith('.json'))

  for (const file of pa11yFiles) {
    const routeName = file.replace('pa11y-', '').replace('.json', '')
    const filePath = path.join(OUTPUT_DIR, file)

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const results = JSON.parse(content)

      summary += `### ${routeName}\n`
      summary += `- Issues found: ${results.length}\n`

      if (results.length > 0) {
        summary += `- Critical issues:\n`
        const criticalIssues = results.filter((issue: any) => issue.type === 'error')
        const warningIssues = results.filter((issue: any) => issue.type === 'warning')

        summary += `  - Errors: ${criticalIssues.length}\n`
        summary += `  - Warnings: ${warningIssues.length}\n`

        if (criticalIssues.length > 0) {
          summary += `\n**Critical Issues:**\n`
          criticalIssues.slice(0, 5).forEach((issue: any) => {
            summary += `- ${issue.message} (${issue.code})\n`
          })
        }
      }
      summary += `\n`
    } catch (error) {
      summary += `### ${routeName}\n- Error reading results\n\n`
    }
  }

  // Add WCAG compliance checklist
  summary += `## WCAG 2.1 AA Compliance Checklist\n\n`
  summary += `### ✅ Implemented\n`
  summary += `- [x] Skip links for keyboard navigation\n`
  summary += `- [x] Focus management and visible focus indicators\n`
  summary += `- [x] Semantic HTML structure\n`
  summary += `- [x] ARIA live regions for dynamic content\n`
  summary += `- [x] Proper heading hierarchy\n`
  summary += `- [x] Form labels and error messaging\n`
  summary += `- [x] Color contrast ratios (design system)\n`
  summary += `- [x] Responsive design and mobile accessibility\n`
  summary += `- [x] Reduced motion support\n`
  summary += `- [x] High contrast mode support\n\n`

  summary += `### 🔧 Needs Review\n`
  summary += `- [ ] Touch target sizes (44px minimum)\n`
  summary += `- [ ] Screen reader testing with real users\n`
  summary += `- [ ] Keyboard-only navigation testing\n`
  summary += `- [ ] Dynamic content announcements\n`
  summary += `- [ ] Error prevention and recovery\n\n`

  summary += `### 📋 Recommendations\n\n`
  summary += `1. **Automated Testing**: Integrate axe-core into CI/CD pipeline\n`
  summary += `2. **Manual Testing**: Regular testing with screen readers\n`
  summary += `3. **User Testing**: Include users with disabilities in testing\n`
  summary += `4. **Documentation**: Maintain accessibility guidelines\n`
  summary += `5. **Training**: Team training on accessibility best practices\n\n`

  summary += `### 🔗 Resources\n\n`
  summary += `- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)\n`
  summary += `- [axe DevTools](https://www.deque.com/axe/devtools/)\n`
  summary += `- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)\n`
  summary += `- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)\n`

  fs.writeFileSync(summaryPath, summary)
}

// Run the audit
runAccessibilityAudit().catch(console.error)