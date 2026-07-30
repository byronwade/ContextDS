import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Design Token Community | Browse 1000+ Design Systems | designcontracts.sh',
  description: 'Explore design tokens from top brands like Stripe, GitHub, and Linear. Browse 17,000+ curated design tokens including colors, typography, spacing, and shadows. Vote for the best extractions and discover design system patterns.',

  keywords: [
    'design tokens',
    'design system tokens',
    'CSS design tokens',
    'extract design tokens',
    'design token library',
    'UI design tokens',
    'design token database',
    'W3C design tokens',
    'design system community',
    'token extraction',
    'color tokens',
    'typography tokens',
    'spacing tokens',
    'shadow tokens',
    'design token patterns',
  ],

  authors: [{ name: 'designcontracts.sh Team' }],

  creator: 'designcontracts.sh',
  publisher: 'designcontracts.sh',

  // Open Graph
  openGraph: {
    title: 'Design Token Community - Browse 1000+ Design Systems',
    description: 'Explore and vote on design token extractions from top websites. Search 17,000+ tokens including colors, typography, spacing, and shadows.',
    url: 'https://designcontracts.sh/community',
    siteName: 'designcontracts.sh',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-community.png', // You'll need to create this
        width: 1200,
        height: 630,
        alt: 'designcontracts.sh Design Token Community - Browse Design Systems',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Design Token Community | designcontracts.sh',
    description: 'Browse 1000+ design systems and 17,000+ design tokens. Vote on the best extractions from Stripe, GitHub, Linear, and more.',
    images: ['/og-community.png'],
    creator: '@designcontracts', // Update with your actual Twitter handle
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Canonical URL
  alternates: {
    canonical: 'https://designcontracts.sh/community',
  },

  // Additional metadata
  category: 'technology',

  // Verification (add your verification codes)
  verification: {
    google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
}