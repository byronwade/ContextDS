import OpenAI from 'openai'
import { intelligentCache } from '../cache/intelligent-cache'

export interface TokenEmbedding {
  id: string
  text: string
  embedding: number[]
  metadata: {
    type: 'color' | 'typography' | 'spacing' | 'component' | 'pattern'
    value: string
    usage: number
    confidence: number
    source: string
  }
}

export interface DeduplicationResult {
  original: TokenItem[]
  deduplicated: TokenItem[]
  duplicates: DuplicateGroup[]
  clusters: TokenCluster[]
  semanticGroups: SemanticGroup[]
  reduction: {
    count: number
    percentage: number
    costSavings: number
  }
}

export interface TokenItem {
  id: string
  name: string
  value: string
  type: string
  usage: number
  confidence: number
  source: string
  embedding?: number[]
}

export interface DuplicateGroup {
  canonical: TokenItem
  duplicates: TokenItem[]
  similarity: number
  reason: 'exact-match' | 'semantic-match' | 'visual-match'
  suggested: {
    name: string
    consolidation: 'merge' | 'alias' | 'remove'
  }
}

export interface TokenCluster {
  id: string
  centroid: number[]
  tokens: TokenItem[]
  theme: string
  characteristics: string[]
  suggestedName: string
}

export interface SemanticGroup {
  category: string
  tokens: TokenItem[]
  relationships: Array<{
    from: string
    to: string
    type: 'similar' | 'complement' | 'variant' | 'derived'
    strength: number
  }>
  suggestions: {
    naming: string[]
    organization: string[]
    consolidation: string[]
  }
}

export interface SimilarityMatrix {
  items: string[]
  matrix: number[][]
  threshold: number
}

export class EmbeddingDeduplicator {
  private client: OpenAI
  private embeddingCache = new Map<string, number[]>()
  private batchSize = 100 // OpenAI embedding API batch limit

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY!,
      baseURL: 'https://gateway.ai.cloudflare.com/v1/account/workersai/openai'
    })
  }

  // Main deduplication workflow
  async deduplicateTokens(tokens: TokenItem[]): Promise<DeduplicationResult> {
    try {
      // Step 1: Generate embeddings for all tokens
      const embeddings = await this.generateEmbeddings(tokens)

      // Step 2: Find exact and near-duplicate matches
      const duplicates = await this.findDuplicates(embeddings)

      // Step 3: Cluster semantically related tokens
      const clusters = await this.clusterTokens(embeddings)

      // Step 4: Create semantic groups and relationships
      const semanticGroups = await this.createSemanticGroups(embeddings, clusters)

      // Step 5: Generate deduplicated token set
      const deduplicated = this.generateDeduplicatedSet(tokens, duplicates, clusters)

      // Step 6: Calculate cost savings
      const reduction = this.calculateReduction(tokens, deduplicated)

      return {
        original: tokens,
        deduplicated,
        duplicates,
        clusters,
        semanticGroups,
        reduction
      }

    } catch (error) {
      console.error('Deduplication failed:', error)

      // Fallback: basic deduplication without embeddings
      return this.fallbackDeduplication(tokens)
    }
  }

  // Generate embeddings with intelligent batching and caching
  private async generateEmbeddings(tokens: TokenItem[]): Promise<TokenEmbedding[]> {
    const embeddings: TokenEmbedding[] = []

    // Process in batches for efficiency
    for (let i = 0; i < tokens.length; i += this.batchSize) {
      const batch = tokens.slice(i, i + this.batchSize)
      const batchTexts: string[] = []
      const batchItems: TokenItem[] = []

      for (const token of batch) {
        const embeddingText = this.tokenToEmbeddingText(token)
        const cacheKey = `embed:${embeddingText}`

        // Check cache first
        const cached = await intelligentCache.safeGet<number[]>(cacheKey, 'embeddings')

        if (cached) {
          embeddings.push({
            id: token.id,
            text: embeddingText,
            embedding: cached,
            metadata: {
              type: token.type as any,
              value: token.value,
              usage: token.usage,
              confidence: token.confidence,
              source: token.source
            }
          })
        } else {
          batchTexts.push(embeddingText)
          batchItems.push(token)
        }
      }

      // Generate embeddings for uncached items
      if (batchTexts.length > 0) {
        try {
          const response = await this.client.embeddings.create({
            model: 'text-embedding-3-small',
            input: batchTexts,
            encoding_format: 'float'
          })

          response.data.forEach((embeddingData: any, index: number) => {
            const token = batchItems[index]
            const embeddingText = batchTexts[index]
            const embedding = embeddingData.embedding

            // Cache the embedding
            const cacheKey = `embed:${embeddingText}`
            intelligentCache.safeSet(cacheKey, embedding, 'embeddings', {
              strategy: 'embedding-cache',
              quality: 100,
              tags: ['embedding', 'openai']
            })

            embeddings.push({
              id: token.id,
              text: embeddingText,
              embedding,
              metadata: {
                type: token.type as any,
                value: token.value,
                usage: token.usage,
                confidence: token.confidence,
                source: token.source
              }
            })
          })

        } catch (error) {
          console.warn(`Embedding generation failed for batch ${i}:`, error)

          // Fallback: create zero embeddings
          batchItems.forEach(token => {
            embeddings.push({
              id: token.id,
              text: this.tokenToEmbeddingText(token),
              embedding: new Array(1536).fill(0), // text-embedding-3-small size
              metadata: {
                type: token.type as any,
                value: token.value,
                usage: token.usage,
                confidence: token.confidence,
                source: token.source
              }
            })
          })
        }
      }

      // Rate limiting delay between batches
      if (i + this.batchSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return embeddings
  }

  // Convert token to embedding-optimized text
  private tokenToEmbeddingText(token: TokenItem): string {
    // Create rich text representation for embedding
    const parts = [
      `name: ${token.name}`,
      `value: ${token.value}`,
      `type: ${token.type}`
    ]

    // Add semantic context based on token type
    switch (token.type.toLowerCase()) {
      case 'color':
        parts.push(this.analyzeColorSemantics(token.value))
        break
      case 'typography':
        parts.push(this.analyzeTypographySemantics(token.name, token.value))
        break
      case 'spacing':
        parts.push(this.analyzeSpacingSemantics(token.value))
        break
      case 'component':
        parts.push(this.analyzeComponentSemantics(token.name))
        break
    }

    // Add usage context
    if (token.usage > 10) parts.push('frequently used')
    if (token.usage < 3) parts.push('rarely used')
    if (token.confidence > 90) parts.push('high confidence')
    if (token.confidence < 50) parts.push('low confidence')

    return parts.join(' | ')
  }

  // Semantic analysis helpers for better embeddings
  private analyzeColorSemantics(value: string): string {
    const semantics: string[] = []

    // Convert to RGB for analysis
    const rgb = this.parseColor(value)
    if (rgb) {
      const { r, g, b } = rgb
      const brightness = (r * 299 + g * 587 + b * 114) / 1000

      // Brightness analysis
      if (brightness > 240) semantics.push('very light')
      else if (brightness > 180) semantics.push('light')
      else if (brightness > 80) semantics.push('medium')
      else if (brightness > 40) semantics.push('dark')
      else semantics.push('very dark')

      // Color analysis
      if (r > 200 && g < 100 && b < 100) semantics.push('red dominant')
      else if (g > 200 && r < 100 && b < 100) semantics.push('green dominant')
      else if (b > 200 && r < 100 && g < 100) semantics.push('blue dominant')
      else if (r > 200 && g > 200 && b < 100) semantics.push('yellow dominant')
      else if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) semantics.push('neutral gray')

      // Saturation analysis
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const saturation = max === 0 ? 0 : (max - min) / max

      if (saturation > 0.7) semantics.push('highly saturated')
      else if (saturation > 0.3) semantics.push('moderately saturated')
      else semantics.push('low saturation')
    }

    return semantics.join(' ')
  }

  private analyzeTypographySemantics(name: string, value: string): string {
    const semantics: string[] = []

    // Font family analysis
    const lowerValue = value.toLowerCase()
    if (lowerValue.includes('serif') && !lowerValue.includes('sans')) semantics.push('serif font')
    else if (lowerValue.includes('sans')) semantics.push('sans-serif font')
    else if (lowerValue.includes('mono')) semantics.push('monospace font')

    // Font personality
    if (lowerValue.includes('modern') || lowerValue.includes('contemporary')) semantics.push('modern style')
    if (lowerValue.includes('classic') || lowerValue.includes('traditional')) semantics.push('traditional style')
    if (lowerValue.includes('display') || lowerValue.includes('headline')) semantics.push('display font')

    // Role inference from name
    const lowerName = name.toLowerCase()
    if (lowerName.includes('primary') || lowerName.includes('main')) semantics.push('primary typography')
    if (lowerName.includes('secondary') || lowerName.includes('body')) semantics.push('body typography')
    if (lowerName.includes('heading') || lowerName.includes('title')) semantics.push('heading typography')

    return semantics.join(' ')
  }

  private analyzeSpacingSemantics(value: string): string {
    const semantics: string[] = []
    const numValue = parseFloat(value)

    if (!isNaN(numValue)) {
      // Size categorization
      if (numValue <= 4) semantics.push('extra small spacing')
      else if (numValue <= 8) semantics.push('small spacing')
      else if (numValue <= 16) semantics.push('medium spacing')
      else if (numValue <= 32) semantics.push('large spacing')
      else semantics.push('extra large spacing')

      // Scale detection
      if (numValue % 8 === 0) semantics.push('8px grid system')
      else if (numValue % 4 === 0) semantics.push('4px grid system')
      else semantics.push('arbitrary spacing')
    }

    return semantics.join(' ')
  }

  private analyzeComponentSemantics(name: string): string {
    const semantics: string[] = []
    const lowerName = name.toLowerCase()

    // Component type
    if (lowerName.includes('button')) semantics.push('button component')
    if (lowerName.includes('card')) semantics.push('card component')
    if (lowerName.includes('input')) semantics.push('form input')
    if (lowerName.includes('nav')) semantics.push('navigation component')

    // Component variant
    if (lowerName.includes('primary')) semantics.push('primary variant')
    if (lowerName.includes('secondary')) semantics.push('secondary variant')
    if (lowerName.includes('large') || lowerName.includes('lg')) semantics.push('large size')
    if (lowerName.includes('small') || lowerName.includes('sm')) semantics.push('small size')

    return semantics.join(' ')
  }

  // Find duplicates using cosine similarity
  private async findDuplicates(embeddings: TokenEmbedding[]): Promise<DuplicateGroup[]> {
    const duplicates: DuplicateGroup[] = []
    const processed = new Set<string>()

    for (let i = 0; i < embeddings.length; i++) {
      const tokenA = embeddings[i]

      if (processed.has(tokenA.id)) continue

      const duplicateGroup: TokenItem[] = []

      for (let j = i + 1; j < embeddings.length; j++) {
        const tokenB = embeddings[j]

        if (processed.has(tokenB.id)) continue

        const similarity = this.cosineSimilarity(tokenA.embedding, tokenB.embedding)

        // Different thresholds for different token types
        const threshold = this.getSimilarityThreshold(tokenA.metadata.type, tokenB.metadata.type)

        if (similarity >= threshold) {
          duplicateGroup.push({
            id: tokenB.id,
            name: tokenB.text.split(' | ')[0].replace('name: ', ''),
            value: tokenB.metadata.value,
            type: tokenB.metadata.type,
            usage: tokenB.metadata.usage,
            confidence: tokenB.metadata.confidence,
            source: tokenB.metadata.source
          })

          processed.add(tokenB.id)
        }
      }

      if (duplicateGroup.length > 0) {
        const canonical = {
          id: tokenA.id,
          name: tokenA.text.split(' | ')[0].replace('name: ', ''),
          value: tokenA.metadata.value,
          type: tokenA.metadata.type,
          usage: tokenA.metadata.usage,
          confidence: tokenA.metadata.confidence,
          source: tokenA.metadata.source
        }

        // Select canonical based on highest usage + confidence
        const allItems = [canonical, ...duplicateGroup]
        const bestCanonical = allItems.reduce((best, current) =>
          (current.usage * current.confidence) > (best.usage * best.confidence) ? current : best
        )

        const reason = this.determineDuplicateReason(bestCanonical, duplicateGroup)

        duplicates.push({
          canonical: bestCanonical,
          duplicates: duplicateGroup.filter(d => d.id !== bestCanonical.id),
          similarity: this.calculateGroupSimilarity(allItems),
          reason,
          suggested: this.generateConsolidationSuggestion(bestCanonical, duplicateGroup, reason)
        })

        processed.add(tokenA.id)
      }
    }

    return duplicates
  }

  // Cluster related tokens using k-means clustering
  private async clusterTokens(embeddings: TokenEmbedding[]): Promise<TokenCluster[]> {
    if (embeddings.length < 6) return [] // Need minimum items for clustering

    try {
      // Determine optimal number of clusters (simplified)
      const k = Math.min(Math.max(3, Math.floor(embeddings.length / 8)), 12)

      const clusters = await this.kMeansClustering(embeddings, k)

      return clusters.map((cluster, index) => ({
        id: `cluster-${index}`,
        centroid: cluster.centroid,
        tokens: cluster.items.map(item => ({
          id: item.id,
          name: item.text.split(' | ')[0].replace('name: ', ''),
          value: item.metadata.value,
          type: item.metadata.type,
          usage: item.metadata.usage,
          confidence: item.metadata.confidence,
          source: item.metadata.source
        })),
        theme: this.inferClusterTheme(cluster.items),
        characteristics: this.extractClusterCharacteristics(cluster.items),
        suggestedName: this.generateClusterName(cluster.items)
      }))

    } catch (error) {
      console.warn('Clustering failed:', error)
      return []
    }
  }

  // K-means clustering implementation
  private async kMeansClustering(
    embeddings: TokenEmbedding[],
    k: number,
    maxIterations: number = 20
  ): Promise<Array<{ centroid: number[]; items: TokenEmbedding[] }>> {
    const dimensions = embeddings[0].embedding.length

    // Initialize centroids randomly
    let centroids = Array.from({ length: k }, () =>
      Array.from({ length: dimensions }, () => Math.random() * 2 - 1)
    )

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Assign points to nearest centroids
      const clusters: Array<{ centroid: number[]; items: TokenEmbedding[] }> = centroids.map(centroid => ({
        centroid,
        items: []
      }))

      embeddings.forEach(embedding => {
        let minDistance = Infinity
        let nearestCluster = 0

        centroids.forEach((centroid, clusterIndex) => {
          const distance = this.euclideanDistance(embedding.embedding, centroid)
          if (distance < minDistance) {
            minDistance = distance
            nearestCluster = clusterIndex
          }
        })

        clusters[nearestCluster].items.push(embedding)
      })

      // Update centroids
      const newCentroids = clusters.map(cluster => {
        if (cluster.items.length === 0) {
          return cluster.centroid // Keep existing centroid if no items
        }

        const sumVector = cluster.items.reduce(
          (sum, item) => sum.map((val, idx) => val + item.embedding[idx]),
          new Array(dimensions).fill(0)
        )

        return sumVector.map(val => val / cluster.items.length)
      })

      // Check for convergence
      const centroidMoved = centroids.some((oldCentroid, index) => {
        const newCentroid = newCentroids[index]
        const distance = this.euclideanDistance(oldCentroid, newCentroid)
        return distance > 0.01 // Convergence threshold
      })

      centroids = newCentroids

      if (!centroidMoved) {
        break // Converged
      }
    }

    return centroids.map((centroid, index) => ({
      centroid,
      items: embeddings.filter(embedding => {
        const distances = centroids.map(c => this.euclideanDistance(embedding.embedding, c))
        const nearestIndex = distances.indexOf(Math.min(...distances))
        return nearestIndex === index
      })
    }))
  }

  // Create semantic groups and relationships
  private async createSemanticGroups(
    embeddings: TokenEmbedding[],
    clusters: TokenCluster[]
  ): Promise<SemanticGroup[]> {
    const groups: SemanticGroup[] = []

    // Group by token type first
    const typeGroups = this.groupByType(embeddings)

    for (const [type, typeEmbeddings] of typeGroups.entries()) {
      if (typeEmbeddings.length < 2) continue

      const relationships = this.findSemanticRelationships(typeEmbeddings)

      const tokens = typeEmbeddings.map(emb => ({
        id: emb.id,
        name: emb.text.split(' | ')[0].replace('name: ', ''),
        value: emb.metadata.value,
        type: emb.metadata.type,
        usage: emb.metadata.usage,
        confidence: emb.metadata.confidence,
        source: emb.metadata.source
      }))

      groups.push({
        category: type,
        tokens,
        relationships,
        suggestions: this.generateGroupSuggestions(tokens, relationships, type)
      })
    }

    return groups
  }

  private findSemanticRelationships(embeddings: TokenEmbedding[]): Array<{
    from: string
    to: string
    type: 'similar' | 'complement' | 'variant' | 'derived'
    strength: number
  }> {
    const relationships: any[] = []

    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const similarity = this.cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding)

        if (similarity > 0.7) {
          const relType = this.determineRelationshipType(embeddings[i], embeddings[j], similarity)

          relationships.push({
            from: embeddings[i].id,
            to: embeddings[j].id,
            type: relType,
            strength: similarity
          })
        }
      }
    }

    return relationships.sort((a, b) => b.strength - a.strength).slice(0, 20) // Top 20 relationships
  }

  private determineRelationshipType(
    embA: TokenEmbedding,
    embB: TokenEmbedding,
    similarity: number
  ): 'similar' | 'complement' | 'variant' | 'derived' {
    const nameA = embA.text.toLowerCase()
    const nameB = embB.text.toLowerCase()

    // Check for variant relationships
    if ((nameA.includes('primary') && nameB.includes('secondary')) ||
        (nameA.includes('light') && nameB.includes('dark')) ||
        (nameA.includes('small') && nameB.includes('large'))) {
      return 'variant'
    }

    // Check for derived relationships
    if (nameA.includes(nameB.split(' ')[0]) || nameB.includes(nameA.split(' ')[0])) {
      return 'derived'
    }

    // High similarity suggests similar tokens
    if (similarity > 0.9) {
      return 'similar'
    }

    // Default to complement
    return 'complement'
  }

  // Generate deduplicated token set
  private generateDeduplicatedSet(
    original: TokenItem[],
    duplicates: DuplicateGroup[],
    clusters: TokenCluster[]
  ): TokenItem[] {
    const deduplicated: TokenItem[] = []
    const processedIds = new Set<string>()

    // Add canonical tokens from duplicate groups
    duplicates.forEach(group => {
      deduplicated.push(group.canonical)
      processedIds.add(group.canonical.id)
      group.duplicates.forEach(dup => processedIds.add(dup.id))
    })

    // Add non-duplicate tokens
    original.forEach(token => {
      if (!processedIds.has(token.id)) {
        deduplicated.push(token)
      }
    })

    return deduplicated
  }

  // Utility functions
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))

    if (magnitudeA === 0 || magnitudeB === 0) return 0

    return dotProduct / (magnitudeA * magnitudeB)
  }

  private euclideanDistance(vecA: number[], vecB: number[]): number {
    return Math.sqrt(
      vecA.reduce((sum, a, i) => sum + Math.pow(a - vecB[i], 2), 0)
    )
  }

  private getSimilarityThreshold(typeA: string, typeB: string): number {
    // Same type tokens can be more similar
    if (typeA === typeB) {
      switch (typeA) {
        case 'color': return 0.85 // Colors need high similarity to be duplicates
        case 'typography': return 0.80 // Typography can vary more
        case 'spacing': return 0.90 // Spacing should be very similar
        case 'component': return 0.75 // Components can have more variation
        default: return 0.80
      }
    }

    // Cross-type similarity requires very high threshold
    return 0.95
  }

  private groupByType(embeddings: TokenEmbedding[]): Map<string, TokenEmbedding[]> {
    const groups = new Map<string, TokenEmbedding[]>()

    embeddings.forEach(embedding => {
      const type = embedding.metadata.type
      if (!groups.has(type)) {
        groups.set(type, [])
      }
      groups.get(type)!.push(embedding)
    })

    return groups
  }

  private calculateGroupSimilarity(tokens: TokenItem[]): number {
    if (tokens.length < 2) return 100

    // Calculate average similarity within group
    let totalSimilarity = 0
    let comparisons = 0

    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        // Simplified similarity based on value/name similarity
        const similarity = this.simpleTextSimilarity(
          `${tokens[i].name} ${tokens[i].value}`,
          `${tokens[j].name} ${tokens[j].value}`
        )
        totalSimilarity += similarity
        comparisons++
      }
    }

    return comparisons > 0 ? (totalSimilarity / comparisons) * 100 : 100
  }

  private simpleTextSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(textA.toLowerCase().split(/\s+/))
    const wordsB = new Set(textB.toLowerCase().split(/\s+/))

    const intersection = new Set([...wordsA].filter(word => wordsB.has(word)))
    const union = new Set([...wordsA, ...wordsB])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  private determineDuplicateReason(canonical: TokenItem, duplicates: TokenItem[]): 'exact-match' | 'semantic-match' | 'visual-match' {
    // Check for exact value matches
    if (duplicates.some(dup => dup.value === canonical.value)) {
      return 'exact-match'
    }

    // Check for visual similarity (colors)
    if (canonical.type === 'color' && duplicates.some(dup => this.colorsVisuallyClose(canonical.value, dup.value))) {
      return 'visual-match'
    }

    return 'semantic-match'
  }

  private colorsVisuallyClose(colorA: string, colorB: string): boolean {
    const rgbA = this.parseColor(colorA)
    const rgbB = this.parseColor(colorB)

    if (!rgbA || !rgbB) return false

    // Calculate color distance in RGB space
    const distance = Math.sqrt(
      Math.pow(rgbA.r - rgbB.r, 2) +
      Math.pow(rgbA.g - rgbB.g, 2) +
      Math.pow(rgbA.b - rgbB.b, 2)
    )

    return distance < 30 // Colors are visually close if RGB distance < 30
  }

  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // Parse hex colors
    if (color.startsWith('#')) {
      const hex = color.substring(1)
      if (hex.length === 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16)
        }
      }
    }

    // Parse RGB colors
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3])
      }
    }

    return null
  }

  private generateConsolidationSuggestion(
    canonical: TokenItem,
    duplicates: TokenItem[],
    reason: string
  ): { name: string; consolidation: 'merge' | 'alias' | 'remove' } {
    if (reason === 'exact-match') {
      return {
        name: canonical.name,
        consolidation: 'remove' // Remove exact duplicates
      }
    }

    if (reason === 'visual-match' && canonical.type === 'color') {
      return {
        name: this.generateSemanticColorName(canonical.value),
        consolidation: 'merge' // Merge visually similar colors
      }
    }

    return {
      name: canonical.name,
      consolidation: 'alias' // Create aliases for semantic matches
    }
  }

  private generateSemanticColorName(value: string): string {
    const rgb = this.parseColor(value)
    if (!rgb) return 'color'

    const { r, g, b } = rgb
    const brightness = (r * 299 + g * 587 + b * 114) / 1000

    // Generate semantic names based on color analysis
    if (r > 200 && g < 100 && b < 100) {
      return brightness > 150 ? 'red-light' : 'red-dark'
    }
    if (g > 200 && r < 100 && b < 100) {
      return brightness > 150 ? 'green-light' : 'green-dark'
    }
    if (b > 200 && r < 100 && g < 100) {
      return brightness > 150 ? 'blue-light' : 'blue-dark'
    }

    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
      if (brightness > 240) return 'gray-50'
      if (brightness > 200) return 'gray-100'
      if (brightness > 150) return 'gray-300'
      if (brightness > 100) return 'gray-500'
      if (brightness > 50) return 'gray-700'
      return 'gray-900'
    }

    return 'accent'
  }

  private inferClusterTheme(items: TokenEmbedding[]): string {
    const commonWords = this.extractCommonWords(items.map(item => item.text))

    if (commonWords.includes('primary') || commonWords.includes('brand')) return 'Brand Colors'
    if (commonWords.includes('gray') || commonWords.includes('neutral')) return 'Neutral Palette'
    if (commonWords.includes('spacing') || commonWords.includes('margin')) return 'Spacing System'
    if (commonWords.includes('font') || commonWords.includes('typography')) return 'Typography Scale'
    if (commonWords.includes('button') || commonWords.includes('component')) return 'Component Styles'

    return 'Design Elements'
  }

  private extractClusterCharacteristics(items: TokenEmbedding[]): string[] {
    const characteristics: string[] = []
    const texts = items.map(item => item.text.toLowerCase())

    // Usage patterns
    const highUsage = items.filter(item => item.metadata.usage > 10).length
    if (highUsage > items.length * 0.5) {
      characteristics.push('frequently-used')
    }

    // Confidence patterns
    const highConfidence = items.filter(item => item.metadata.confidence > 80).length
    if (highConfidence > items.length * 0.7) {
      characteristics.push('high-confidence')
    }

    // Type patterns
    const types = [...new Set(items.map(item => item.metadata.type))]
    if (types.length === 1) {
      characteristics.push(`${types[0]}-only`)
    } else {
      characteristics.push('mixed-types')
    }

    // Value patterns
    if (texts.some(text => text.includes('primary') || text.includes('main'))) {
      characteristics.push('primary-elements')
    }

    if (texts.some(text => text.includes('large') || text.includes('small'))) {
      characteristics.push('size-variants')
    }

    return characteristics
  }

  private generateClusterName(items: TokenEmbedding[]): string {
    const commonWords = this.extractCommonWords(items.map(item => item.text))
    const type = items[0].metadata.type

    if (commonWords.length > 0) {
      return `${commonWords[0]}-${type}`
    }

    return `${type}-cluster`
  }

  private extractCommonWords(texts: string[]): string[] {
    const wordFreq = new Map<string, number>()

    texts.forEach(text => {
      const words = text.toLowerCase().split(/[^a-z]+/).filter(word => word.length > 2)
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      })
    })

    return Array.from(wordFreq.entries())
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)
  }

  private generateGroupSuggestions(
    tokens: TokenItem[],
    relationships: any[],
    type: string
  ): { naming: string[]; organization: string[]; consolidation: string[] } {
    const suggestions = {
      naming: [] as string[],
      organization: [] as string[],
      consolidation: [] as string[]
    }

    // Type-specific suggestions
    switch (type) {
      case 'color':
        suggestions.naming.push('Use semantic names (primary, secondary, accent)')
        suggestions.organization.push('Group by purpose (brand, semantic, neutral)')
        if (tokens.length > 20) {
          suggestions.consolidation.push('Consider consolidating similar shades')
        }
        break

      case 'typography':
        suggestions.naming.push('Use scale-based names (text-xs, text-sm, text-base)')
        suggestions.organization.push('Organize by hierarchy level and purpose')
        break

      case 'spacing':
        suggestions.naming.push('Use size-based names (space-xs, space-sm, space-md)')
        suggestions.organization.push('Maintain consistent scale ratios')
        break
    }

    // Relationship-based suggestions
    const highSimilarity = relationships.filter(rel => rel.strength > 0.9)
    if (highSimilarity.length > 0) {
      suggestions.consolidation.push('Consider merging very similar tokens')
    }

    return suggestions
  }

  private calculateReduction(original: TokenItem[], deduplicated: TokenItem[]): {
    count: number
    percentage: number
    costSavings: number
  } {
    const count = original.length - deduplicated.length
    const percentage = (count / original.length) * 100

    // Estimate cost savings (rough calculation)
    const avgTokensPerItem = 50 // Rough estimate
    const tokensSaved = count * avgTokensPerItem
    const costSavings = (tokensSaved / 1000000) * 0.25 // gpt-5-mini input cost

    return {
      count,
      percentage,
      costSavings
    }
  }

  // Fallback deduplication without embeddings
  private fallbackDeduplication(tokens: TokenItem[]): DeduplicationResult {
    const duplicates: DuplicateGroup[] = []
    const seen = new Map<string, TokenItem>()

    // Simple value-based deduplication
    tokens.forEach(token => {
      const key = `${token.type}:${token.value}`
      const existing = seen.get(key)

      if (existing) {
        duplicates.push({
          canonical: existing.usage > token.usage ? existing : token,
          duplicates: [token],
          similarity: 100,
          reason: 'exact-match',
          suggested: { name: existing.name, consolidation: 'remove' }
        })
      } else {
        seen.set(key, token)
      }
    })

    const deduplicated = tokens.filter(token => {
      const key = `${token.type}:${token.value}`
      return seen.get(key) === token
    })

    return {
      original: tokens,
      deduplicated,
      duplicates,
      clusters: [],
      semanticGroups: [],
      reduction: this.calculateReduction(tokens, deduplicated)
    }
  }
}

// Global deduplicator instance
export const embeddingDeduplicator = new EmbeddingDeduplicator()