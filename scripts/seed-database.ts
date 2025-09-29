#!/usr/bin/env bun
import { db, sites, scans, tokenSets, layoutProfiles } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

console.log('🌱 Seeding ContextDS database with sample design token data...')

const sampleSites = [
  {
    domain: 'stripe.com',
    title: 'Stripe - Online Payment Processing',
    description: 'Modern payment infrastructure with sophisticated design system',
    robotsStatus: 'allowed' as const,
    popularity: 95,
    favicon: 'https://stripe.com/favicon.ico'
  },
  {
    domain: 'github.com',
    title: 'GitHub - Code Collaboration Platform',
    description: 'Developer platform with Primer design system',
    robotsStatus: 'allowed' as const,
    popularity: 92,
    favicon: 'https://github.com/favicon.ico'
  },
  {
    domain: 'tailwindcss.com',
    title: 'Tailwind CSS - Utility-First Framework',
    description: 'Comprehensive utility-first CSS framework',
    robotsStatus: 'allowed' as const,
    popularity: 89,
    favicon: 'https://tailwindcss.com/favicon.ico'
  },
  {
    domain: 'figma.com',
    title: 'Figma - Design Collaboration Tool',
    description: 'Modern interface design with custom component library',
    robotsStatus: 'allowed' as const,
    popularity: 87,
    favicon: 'https://figma.com/favicon.ico'
  },
  {
    domain: 'vercel.com',
    title: 'Vercel - Frontend Development Platform',
    description: 'Clean, minimal design with Geist Design System',
    robotsStatus: 'allowed' as const,
    popularity: 85,
    favicon: 'https://vercel.com/favicon.ico'
  }
]

const generateTokenSet = (domain: string, siteProfile: any) => {
  const profiles: { [key: string]: any } = {
    'stripe.com': {
      color: {
        'primary': {
          $type: 'color',
          $value: '#635bff',
          $description: 'Primary brand color for Stripe',
          $extensions: {
            'contextds.usage': 142,
            'contextds.confidence': 98,
            'contextds.semantic': 'primary'
          }
        },
        'secondary': {
          $type: 'color',
          $value: '#0a2540',
          $description: 'Secondary brand color',
          $extensions: {
            'contextds.usage': 89,
            'contextds.confidence': 95,
            'contextds.semantic': 'secondary'
          }
        },
        'success': {
          $type: 'color',
          $value: '#00d924',
          $description: 'Success state color',
          $extensions: {
            'contextds.usage': 67,
            'contextds.confidence': 92,
            'contextds.semantic': 'success'
          }
        },
        'background': {
          $type: 'color',
          $value: '#ffffff',
          $description: 'Primary background color',
          $extensions: {
            'contextds.usage': 200,
            'contextds.confidence': 99,
            'contextds.semantic': 'background'
          }
        }
      },
      typography: {
        'font-primary': {
          $type: 'fontFamily',
          $value: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
          $description: 'Primary font family',
          $extensions: {
            'contextds.usage': 156,
            'contextds.confidence': 96
          }
        },
        'text-lg': {
          $type: 'dimension',
          $value: '1.125rem',
          $description: 'Large text size',
          $extensions: {
            'contextds.usage': 89,
            'contextds.confidence': 91
          }
        }
      },
      dimension: {
        'space-sm': {
          $type: 'dimension',
          $value: '0.5rem',
          $description: 'Small spacing unit',
          $extensions: {
            'contextds.usage': 198,
            'contextds.confidence': 91
          }
        },
        'space-md': {
          $type: 'dimension',
          $value: '1rem',
          $description: 'Medium spacing unit',
          $extensions: {
            'contextds.usage': 167,
            'contextds.confidence': 94
          }
        },
        'space-lg': {
          $type: 'dimension',
          $value: '1.5rem',
          $description: 'Large spacing unit',
          $extensions: {
            'contextds.usage': 123,
            'contextds.confidence': 88
          }
        }
      }
    },
    'github.com': {
      color: {
        'primary': {
          $type: 'color',
          $value: '#0969da',
          $description: 'GitHub brand blue',
          $extensions: {
            'contextds.usage': 156,
            'contextds.confidence': 97,
            'contextds.semantic': 'primary'
          }
        },
        'canvas': {
          $type: 'color',
          $value: '#f6f8fa',
          $description: 'Canvas background color',
          $extensions: {
            'contextds.usage': 178,
            'contextds.confidence': 96,
            'contextds.semantic': 'surface'
          }
        }
      },
      typography: {
        'font-system': {
          $type: 'fontFamily',
          $value: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
          $description: 'GitHub system font stack',
          $extensions: {
            'contextds.usage': 167,
            'contextds.confidence': 94
          }
        }
      }
    },
    'tailwindcss.com': {
      color: {
        'slate-900': {
          $type: 'color',
          $value: '#0f172a',
          $description: 'Tailwind slate 900',
          $extensions: {
            'contextds.usage': 156,
            'contextds.confidence': 98,
            'contextds.semantic': 'primary'
          }
        },
        'blue-600': {
          $type: 'color',
          $value: '#2563eb',
          $description: 'Tailwind blue 600',
          $extensions: {
            'contextds.usage': 134,
            'contextds.confidence': 96,
            'contextds.semantic': 'accent'
          }
        }
      },
      dimension: {
        'space-1': {
          $type: 'dimension',
          $value: '0.25rem',
          $description: 'Tailwind spacing 1',
          $extensions: {
            'contextds.usage': 345,
            'contextds.confidence': 96
          }
        },
        'space-4': {
          $type: 'dimension',
          $value: '1rem',
          $description: 'Tailwind spacing 4',
          $extensions: {
            'contextds.usage': 267,
            'contextds.confidence': 98
          }
        }
      }
    }
  }

  return {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $metadata: {
      name: domain,
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: {
        url: `https://${domain}`,
        extractedAt: new Date().toISOString()
      },
      tools: {
        extractor: 'contextds-advanced-extractor',
        analyzer: 'contextds-ai-analyzer',
        generator: 'contextds-w3c-generator'
      }
    },
    ...profiles[domain] || profiles['stripe.com'] // Default to stripe profile
  }
}

async function seedDatabase() {
  try {
    console.log('🔄 Checking existing data...')

    // Check if data already exists
    const existingSites = await db.select().from(sites).limit(1)

    if (existingSites.length > 0) {
      console.log('📊 Database already contains data')
      console.log('🔄 Adding additional sample data...')
    }

    // Insert sample sites
    console.log('🏢 Creating sample sites...')

    for (const siteData of sampleSites) {
      try {
        // Check if site already exists
        const existingSite = await db.select()
          .from(sites)
          .where(eq(sites.domain, siteData.domain))
          .limit(1)

        let siteRecord

        if (existingSite.length > 0) {
          // Update existing site
          [siteRecord] = await db.update(sites)
            .set({
              ...siteData,
              lastScanned: new Date(),
              updatedAt: new Date()
            })
            .where(eq(sites.id, existingSite[0].id))
            .returning()

          console.log(`  ♻️  Updated: ${siteData.domain}`)
        } else {
          // Create new site
          [siteRecord] = await db.insert(sites)
            .values({
              ...siteData,
              firstSeen: new Date(),
              lastScanned: new Date(),
              status: 'completed'
            })
            .returning()

          console.log(`  ✨ Created: ${siteData.domain}`)
        }

        // Create scan record
        const [scanRecord] = await db.insert(scans)
          .values({
            siteId: siteRecord.id,
            method: 'computed',
            cssSourceCount: Math.floor(Math.random() * 10) + 5,
            startedAt: new Date(Date.now() - 5000),
            finishedAt: new Date(),
            prettify: false
          })
          .returning()

        // Generate and store token set
        const tokenSet = generateTokenSet(siteData.domain, siteData)
        const consensusScore = 85 + Math.floor(Math.random() * 15) // 85-99%

        await db.insert(tokenSets)
          .values({
            siteId: siteRecord.id,
            scanId: scanRecord.id,
            tokensJson: tokenSet,
            packJson: {
              mappingHints: {
                tailwind: {
                  colors: 'Configure in tailwind.config.js theme.colors',
                  spacing: 'Use in theme.spacing configuration'
                },
                cssVariables: {
                  recommendation: 'Define as CSS custom properties',
                  example: ':root { --color-primary: #635bff; }'
                }
              },
              guidelines: {
                usage: ['Use tokens consistently across components'],
                pitfalls: ['Verify color contrast for accessibility'],
                accessibility: ['Ensure WCAG AA compliance']
              }
            },
            consensusScore: (consensusScore / 100).toString(),
            isPublic: true
          })

        // Create layout profile
        await db.insert(layoutProfiles)
          .values({
            siteId: siteRecord.id,
            scanId: scanRecord.id,
            profileJson: {
              containers: {
                maxWidth: siteData.domain.includes('docs') ? '768px' : '1200px',
                strategy: 'centered'
              },
              gridSystem: siteData.domain.includes('tailwind') ? 'utility-first' : 'flexbox',
              spacingBase: 8,
              breakpoints: [640, 768, 1024, 1280]
            },
            archetypes: siteData.domain.includes('stripe') ? ['pricing-table', 'feature-grid'] :
                       siteData.domain.includes('github') ? ['navigation', 'code-display'] :
                       ['marketing-hero', 'content-section'],
            containers: {
              maxWidth: siteData.domain.includes('docs') ? '768px' : '1200px'
            },
            spacingScale: { base: 8 }
          })

        console.log(`    💾 Token set created with ${Object.keys(tokenSet.color || {}).length + Object.keys(tokenSet.typography || {}).length + Object.keys(tokenSet.dimension || {}).length} tokens`)

      } catch (error) {
        console.error(`  ❌ Failed to seed ${siteData.domain}:`, error)
      }
    }

    // Final statistics
    console.log('\n📊 Seeding Complete - Database Statistics:')

    const stats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM sites) as total_sites,
        (SELECT COUNT(*) FROM scans WHERE finished_at IS NOT NULL) as completed_scans,
        (SELECT COUNT(*) FROM token_sets WHERE is_public = true) as public_token_sets,
        (SELECT AVG(CAST(consensus_score AS DECIMAL)) FROM token_sets WHERE consensus_score IS NOT NULL) as avg_confidence
    `)

    const dbStats = (stats as any)[0]
    console.log(`  🏢 Sites: ${dbStats.total_sites}`)
    console.log(`  🔍 Completed Scans: ${dbStats.completed_scans}`)
    console.log(`  🎨 Public Token Sets: ${dbStats.public_token_sets}`)
    console.log(`  📈 Average Confidence: ${Math.round((dbStats.avg_confidence || 0) * 100)}%`)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('🔍 You can now search for tokens from popular design systems')
    console.log('📱 Try searching for: "primary", "blue", "Inter", "space" in the app')

  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  }
}

async function main() {
  await seedDatabase()
  process.exit(0)
}

// Run seeding
main().catch((error) => {
  console.error('❌ Seeding script failed:', error)
  process.exit(1)
})