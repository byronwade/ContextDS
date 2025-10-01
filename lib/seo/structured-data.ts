/**
 * SEO Structured Data Generation for ContextDS
 * Generates JSON-LD structured data markup for enhanced search engine visibility
 */

export interface OrganizationSchema {
  "@context": "https://schema.org"
  "@type": "Organization"
  name: string
  description: string
  url: string
  logo: string
  sameAs: string[]
  contactPoint: {
    "@type": "ContactPoint"
    contactType: string
    email: string
  }
  foundingDate: string
  founder: {
    "@type": "Person"
    name: string
  }
  keywords: string[]
}

export interface SoftwareApplicationSchema {
  "@context": "https://schema.org"
  "@type": "SoftwareApplication"
  name: string
  description: string
  url: string
  applicationCategory: string
  operatingSystem: string[]
  offers: {
    "@type": "Offer"
    price: string
    priceCurrency: string
    availability: string
  }
  aggregateRating?: {
    "@type": "AggregateRating"
    ratingValue: number
    ratingCount: number
  }
  featureList: string[]
  screenshot: string[]
}

export interface WebsiteSchema {
  "@context": "https://schema.org"
  "@type": "WebSite"
  name: string
  description: string
  url: string
  potentialAction: {
    "@type": "SearchAction"
    target: {
      "@type": "EntryPoint"
      urlTemplate: string
    }
    "query-input": string
  }
  mainEntity: {
    "@type": "Organization"
    name: string
  }
}

export interface WebPageSchema {
  "@context": "https://schema.org"
  "@type": "WebPage"
  name: string
  description: string
  url: string
  isPartOf: {
    "@type": "WebSite"
    name: string
    url: string
  }
  mainEntity?: {
    "@type": "SoftwareApplication" | "Dataset" | "CreativeWork"
    name: string
    description: string
  }
  breadcrumb?: {
    "@type": "BreadcrumbList"
    itemListElement: Array<{
      "@type": "ListItem"
      position: number
      name: string
      item: string
    }>
  }
}

export interface DatasetSchema {
  "@context": "https://schema.org"
  "@type": "Dataset"
  name: string
  description: string
  url: string
  keywords: string[]
  creator: {
    "@type": "Organization"
    name: string
    url: string
  }
  license: string
  distribution: {
    "@type": "DataDownload"
    encodingFormat: string
    contentUrl: string
  }
  variableMeasured: string[]
  spatialCoverage?: string
  temporalCoverage?: string
}

export interface DesignTokenSchema {
  "@context": "https://schema.org"
  "@type": "CreativeWork"
  name: string
  description: string
  url: string
  creator: {
    "@type": "Organization"
    name: string
    url: string
  }
  about: {
    "@type": "Thing"
    name: string
    description: string
  }
  genre: string
  keywords: string[]
  dateCreated: string
  dateModified?: string
  version?: string
  license?: string
}

export function generateOrganizationSchema(): OrganizationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ContextDS",
    description: "AI-powered design token extraction and analysis platform. Extract design tokens from any website and analyze layout DNA for design systems.",
    url: "https://contextds.com",
    logo: "https://contextds.com/logo.png",
    sameAs: [
      "https://github.com/contextds",
      "https://twitter.com/contextds"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "hello@contextds.com"
    },
    foundingDate: "2024",
    founder: {
      "@type": "Person",
      name: "ContextDS Team"
    },
    keywords: [
      "design tokens",
      "CSS extraction",
      "design systems",
      "web analysis",
      "UI tokens",
      "layout DNA",
      "design automation"
    ]
  }
}

export function generateWebsiteSchema(): WebsiteSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ContextDS - Design Tokens Made Fast",
    description: "Extract design tokens from any website. AI-powered CSS analysis and layout DNA profiling for design systems.",
    url: "https://contextds.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://contextds.com/scan?url={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    mainEntity: {
      "@type": "Organization",
      name: "ContextDS"
    }
  }
}

export function generateSoftwareApplicationSchema(): SoftwareApplicationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ContextDS",
    description: "AI-powered design token extraction platform. Scan websites to extract colors, typography, spacing, and layout patterns automatically.",
    url: "https://contextds.com",
    applicationCategory: "DesignApplication",
    operatingSystem: ["Web Browser", "Any"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock"
    },
    featureList: [
      "CSS Design Token Extraction",
      "Layout DNA Analysis",
      "Multi-breakpoint Layout Profiling",
      "W3C Design Token Format Export",
      "AI-powered Design Pattern Recognition",
      "Community Design System Directory",
      "Real-time Token Analysis",
      "Design System Maturity Scoring"
    ],
    screenshot: [
      "https://contextds.com/screenshots/token-extraction.png",
      "https://contextds.com/screenshots/layout-analysis.png"
    ]
  }
}

export function generateWebPageSchema(page: {
  title: string
  description: string
  url: string
  breadcrumbs?: Array<{ name: string; url: string }>
  mainEntity?: {
    type: "SoftwareApplication" | "Dataset" | "CreativeWork"
    name: string
    description: string
  }
}): WebPageSchema {
  const schema: WebPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: page.url,
    isPartOf: {
      "@type": "WebSite",
      name: "ContextDS",
      url: "https://contextds.com"
    }
  }

  if (page.mainEntity) {
    schema.mainEntity = {
      "@type": page.mainEntity.type,
      name: page.mainEntity.name,
      description: page.mainEntity.description
    }
  }

  if (page.breadcrumbs && page.breadcrumbs.length > 0) {
    schema.breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: page.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    }
  }

  return schema
}

export function generateDatasetSchema(dataset: {
  name: string
  description: string
  url: string
  keywords: string[]
  license?: string
  variables: string[]
  domain?: string
  dateCreated?: string
}): DatasetSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: dataset.name,
    description: dataset.description,
    url: dataset.url,
    keywords: dataset.keywords,
    creator: {
      "@type": "Organization",
      name: "ContextDS",
      url: "https://contextds.com"
    },
    license: dataset.license || "https://creativecommons.org/licenses/by/4.0/",
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: `${dataset.url}/tokens.json`
    },
    variableMeasured: dataset.variables,
    spatialCoverage: dataset.domain,
    temporalCoverage: dataset.dateCreated
  }
}

export function generateDesignTokenSchema(tokens: {
  domain: string
  description: string
  url: string
  dateCreated: string
  dateModified?: string
  version?: string
  categories: string[]
}): DesignTokenSchema {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${tokens.domain} Design Tokens`,
    description: tokens.description,
    url: tokens.url,
    creator: {
      "@type": "Organization",
      name: "ContextDS",
      url: "https://contextds.com"
    },
    about: {
      "@type": "Thing",
      name: "Design Tokens",
      description: "Visual design atoms of design systems including colors, typography, spacing, and layout properties"
    },
    genre: "Design System",
    keywords: [
      "design tokens",
      "design system",
      tokens.domain,
      ...tokens.categories
    ],
    dateCreated: tokens.dateCreated,
    dateModified: tokens.dateModified,
    version: tokens.version,
    license: "https://creativecommons.org/licenses/by/4.0/"
  }
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  }
}

/**
 * Generate multiple schemas for a page
 */
export function generatePageSchemas(page: {
  type: 'homepage' | 'scan' | 'community' | 'site' | 'docs' | 'pricing'
  title: string
  description: string
  url: string
  breadcrumbs?: Array<{ name: string; url: string }>
  siteData?: {
    domain: string
    tokens: any
    dateCreated: string
    categories: string[]
  }
}) {
  const schemas: any[] = []

  // Always include organization and website schemas
  schemas.push(generateOrganizationSchema())

  if (page.type === 'homepage') {
    schemas.push(generateWebsiteSchema())
    schemas.push(generateSoftwareApplicationSchema())
  }

  // Add page-specific schema
  schemas.push(generateWebPageSchema({
    title: page.title,
    description: page.description,
    url: page.url,
    breadcrumbs: page.breadcrumbs,
    mainEntity: page.type === 'scan' ? {
      type: "SoftwareApplication",
      name: "ContextDS Token Scanner",
      description: "Extract design tokens from any website URL"
    } : undefined
  }))

  // Add site-specific schemas for community/site pages
  if (page.siteData) {
    schemas.push(generateDatasetSchema({
      name: `${page.siteData.domain} Design Token Dataset`,
      description: `Extracted design tokens and layout analysis for ${page.siteData.domain}`,
      url: page.url,
      keywords: ['design tokens', page.siteData.domain, ...page.siteData.categories],
      variables: ['colors', 'typography', 'spacing', 'layout', 'components'],
      domain: page.siteData.domain,
      dateCreated: page.siteData.dateCreated
    }))

    schemas.push(generateDesignTokenSchema({
      domain: page.siteData.domain,
      description: `Design tokens extracted from ${page.siteData.domain} including colors, typography, spacing, and layout patterns`,
      url: page.url,
      dateCreated: page.siteData.dateCreated,
      categories: page.siteData.categories
    }))
  }

  return schemas
}