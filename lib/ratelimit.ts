import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL ||
  process.env.KV_REST_API_URL
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_TOKEN ||
  process.env.KV_REST_API_TOKEN

// Development mode - disable rate limiting when Redis isn't configured
const isDevelopment = !redisUrl || !redisToken || !redisUrl.startsWith('https')

// Create Redis instance or mock for development
export const redis = isDevelopment
  ? null
  : new Redis({
      url: redisUrl!,
      token: redisToken!,
    })

// Simple mock rate limiter for development
const mockRatelimit = {
  async limit(_identifier: string) {
    return {
      success: true,
      limit: 1000,
      reset: Date.now() + 60000,
      remaining: 999,
      pending: Promise.resolve()
    }
  }
}

// Configure rate limiting
export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'contextds:ratelimit',
    })
  : mockRatelimit

// Specific rate limits for different endpoints
export const scanRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'contextds:scan',
    })
  : mockRatelimit

export const searchRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'contextds:search',
    })
  : mockRatelimit