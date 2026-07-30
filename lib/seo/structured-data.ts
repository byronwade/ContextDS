/**
 * SEO Structured Data Generation for designcontracts.sh
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
    name: "Design Contracts",
    description: "AI-powered design token extraction and analysis platform. Extract design tokens from any website and analyze layout DNA for design systems.",
    url: "https://designcontracts.sh",
    logo: "https://designcontracts.sh/logo.png",
    sameAs: [
      "https://github.com/byronwade/designcontracts.sh",
      "https://twitter.com/designcontracts"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "hello@designcontracts.sh"
    },
    foundingDate: "2024",
    founder: {
      "@type": "Person",
      name: "Design Contracts Team"
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
    name: "Design Contracts — designcontracts.sh",
    description: "Extract design tokens from any website. AI-powered CSS analysis and layout DNA profiling for design systems.",
    url: "https://designcontracts.sh",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://designcontracts.sh/scan?url={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    mainEntity: {
      "@type": "Organization",
      name: "Design Contracts"
    }
  }
}

export function generateSoftwareApplicationSchema(): SoftwareApplicationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Design Contracts",
    description: "AI-powered design token extraction platform. Scan websites to extract colors, typography, spacing, and layout patterns automatically.",
    url: "https://designcontracts.sh",
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
      "https://designcontracts.sh/screenshots/token-extraction.png",
      "https://designcontracts.sh/screenshots/layout-analysis.png"
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
      name: "designcontracts.sh",
      url: "https://designcontracts.sh"
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
      name: "designcontracts.sh",
      url: "https://designcontracts.sh"
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
      name: "designcontracts.sh",
      url: "https://designcontracts.sh"
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
      name: "designcontracts.sh Token Scanner",
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