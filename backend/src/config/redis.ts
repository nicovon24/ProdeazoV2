import { createClient } from 'redis'

const url = process.env.REDIS_URL || 'redis://localhost:6379'

/** Shared client for sessions (optional) and cache. */
export const redis = createClient({
  url,
  socket: {
    reconnectStrategy(retries: number) {
      if (retries > 10) return false
      return Math.min(retries * 500, 8000)
    },
  },
})

let lastRedisErrorLog = 0
redis.on('error', (err: Error) => {
  const now = Date.now()
  if (now - lastRedisErrorLog > 10_000) {
    console.warn('[redis] %s (is Redis running at %s?)', err.message, url)
    lastRedisErrorLog = now
  }
})

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect()
  }
}
