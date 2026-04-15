import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Global connection to reuse in dev environment (to prevent socket exhaustion with Next.js HMR)
const globalForRedis = global as unknown as { redis: Redis, publisher: Redis };

// Primary client for queries (GET, SET, DEL, LPUSH)
export const redis = globalForRedis.redis || new Redis(REDIS_URL);

// Publisher client for SSE (Redis Pub/Sub requires a dedicated connection once it uses blocking/pubsub command flags)
export const publisher = globalForRedis.publisher || new Redis(REDIS_URL); 

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
  globalForRedis.publisher = publisher;
}

redis.on('error', (err) => console.error('Redis Client Error', err));
publisher.on('error', (err) => console.error('Redis Publisher Error', err));
