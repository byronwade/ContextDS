import { describe, expect, it } from 'vitest'
import {
  buildSemanticGraph,
  componentsYamlFromGraph,
  semanticGraphToMarkdown,
  slimSemanticGraph,
} from '@/lib/analyzers/semantic-graph'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'

const curated = (): CuratedTokenSet => ({
  colors: [
    {
      name: 'brand',
      value: '#0F172A',
      usage: 40,
      confidence: 90,
      percentage: 40,
      category: 'color',
      semantic: 'primary',
    },
    {
      name: 'canvas',
      value: '#F8FAFC',
      usage: 30,
      confidence: 85,
      percentage: 30,
      category: 'color',
      semantic: 'background',
    },
    {
      name: 'accent',
      value: '#0F766E',
      usage: 12,
      confidence: 80,
      percentage: 12,
      category: 'color',
      semantic: 'accent',
    },
  ],
  typography: {
    families: [
      {
        name: 'sans',
        value: 'Inter, sans-serif',
        usage: 20,
        confidence: 80,
        percentage: 50,
        category: 'typography',
        semantic: 'family',
      },
    ],
    sizes: [
      {
        name: 'display',
        value: '48px',
        usage: 4,
        confidence: 70,
        percentage: 10,
        category: 'typography',
        semantic: 'display',
      },
      {
        name: 'body',
        value: '16px',
        usage: 40,
        confidence: 90,
        percentage: 60,
        category: 'typography',
        semantic: 'body',
      },
    ],
    weights: [
      {
        name: 'bold',
        value: '700',
        usage: 10,
        confidence: 70,
        percentage: 20,
        category: 'typography',
        semantic: 'weight',
      },
    ],
  },
  spacing: [
    { name: 's1', value: '4px', usage: 8, confidence: 70, percentage: 10, category: 'spacing' },
    { name: 's2', value: '8px', usage: 20, confidence: 80, percentage: 30, category: 'spacing' },
    { name: 's3', value: '16px', usage: 18, confidence: 80, percentage: 25, category: 'spacing' },
  ],
  radius: [
    { name: 'r1', value: '8px', usage: 12, confidence: 75, percentage: 40, category: 'radius' },
    { name: 'r2', value: '16px', usage: 6, confidence: 70, percentage: 20, category: 'radius' },
  ],
  shadows: [
    {
      name: 'card',
      value: '0 8px 24px rgba(0,0,0,0.08)',
      usage: 5,
      confidence: 70,
      percentage: 50,
      category: 'shadow',
    },
  ],
  motion: [],
  metadata: {
    colorPalettes: [
      {
        name: 'brand-shades',
        relationship: 'monochromatic',
        confidence: 0.8,
        colors: [
          {
            name: 'brand',
            value: '#0F172A',
            usage: 40,
            confidence: 90,
            percentage: 40,
            category: 'color',
          },
        ],
      },
    ],
    spacingGrid: {
      base: 8,
      confidence: 0.75,
      tokens: [
        {
          name: 's2',
          value: '8px',
          usage: 20,
          confidence: 80,
          percentage: 30,
          category: 'spacing',
        },
      ],
    },
  },
})

describe('buildSemanticGraph', () => {
  it('links tokens to roles, components, layout, and patterns', () => {
    const graph = buildSemanticGraph({
      domain: 'stripe.com',
      url: 'https://stripe.com',
      scanId: 'scan_test',
      curatedTokens: curated(),
      brandAnalysis: {
        primaryColors: ['#0F172A', '#F8FAFC', '#0F766E'],
        personality: 'precise',
        primaryFont: 'Inter, sans-serif',
      },
      layoutDNA: {
        containers: {
          maxWidth: '1200px',
          strategy: 'centered',
          responsive: true,
          snapshots: [],
        },
        gridSystem: 'flexbox',
        spacingBase: 8,
        breakpoints: [640, 1024],
        archetypes: [{ type: 'marketing-hero', confidence: 0.8 }],
      },
      cssSources: [
        {
          content: `
            .btn-primary { background-color: #0F172A; color: #F8FAFC; border-radius: 8px; padding: 8px; }
            .card { background-color: #F8FAFC; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
            nav { color: #0F172A; }
            h1 { font-size: 48px; }
          `,
        },
      ],
      pageTitle: 'Stripe',
    })

    expect(graph.schemaVersion).toBe(1)
    expect(graph.summary.tokenCount).toBeGreaterThan(5)
    expect(graph.summary.roleCount).toBeGreaterThan(3)
    expect(graph.summary.componentCount).toBeGreaterThan(0)
    expect(graph.summary.edgeCount).toBeGreaterThan(graph.summary.nodeCount / 2)

    const fillRole = graph.edges.filter((e) => e.type === 'FILLS_ROLE')
    expect(fillRole.length).toBeGreaterThan(0)

    const usesToken = graph.edges.filter((e) => e.type === 'USES_TOKEN')
    expect(usesToken.length).toBeGreaterThan(0)

    expect(graph.index.roles['color.primary']?.length).toBeGreaterThan(0)
    expect(Object.keys(graph.index.components).length).toBeGreaterThan(0)

    const md = semanticGraphToMarkdown(graph)
    expect(md).toContain('Semantic Design Graph')
    expect(md).toContain('Role → tokens')

    const yaml = componentsYamlFromGraph(graph)
    expect(yaml[0]).toBe('components:')
    expect(yaml.join('\n')).toContain('button-primary')

    const slim = slimSemanticGraph(graph)
    expect(slim.nodes.length).toBe(graph.nodes.length)
    expect(slim.edges[0]?.evidence?.cssValue).toBeUndefined()
  })
})
