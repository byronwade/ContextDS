import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create Redis instance with fallback for development
const redis = process.env.REDIS_URL
  ? new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
  : {
      // Fallback in-memory cache for development
      cache: new Map(),
      async set(key: string, value: any, opts?: { ex?: number }) {
        (this.cache as Map<string, { value: any; expires?: number }>).set(key, {
          value,
          expires: opts?.ex ? Date.now() + opts.ex * 1000 : undefined,
        })
        return 'OK'
      },
      async get(key: string) {
        const item = (this.cache as Map<string, { value: any; expires?: number }>).get(key)
        if (!item) return null
        if (item.expires && Date.now() > item.expires) {
          (this.cache as Map<string, any>).delete(key)
          return null
        }
        return item.value
      },
    }

// Configure rate limiting
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
  analytics: true,
  prefix: 'contextds:ratelimit',
})

// Specific rate limits for different endpoints
export const scanRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 scans per minute
  analytics: true,
  prefix: 'contextds:scan',
})

export const searchRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 searches per minute
  analytics: true,
  prefix: 'contextds:search',
})