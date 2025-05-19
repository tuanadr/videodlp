const { createClient } = require('redis');

let redisClient = null;
let redisConnected = false;

const initializeRedis = async () => {
  if (redisClient && redisConnected) {
    // console.log('[REDIS] Already connected.');
    return { redisClient, redisConnected };
  }

  try {
    let redisUrl = process.env.REDIS_URL;

    if (!redisUrl && process.env.REDIS_HOST) {
      redisUrl = process.env.REDIS_PASSWORD
        ? `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
        : `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
      console.log(`[REDIS] Attempting to connect to Redis at: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`);
    } else if (redisUrl) {
      console.log('[REDIS] Attempting to connect to Redis with REDIS_URL');
    } else {
      console.log('[REDIS] No Redis connection info, skipping Redis initialization.');
      return { redisClient: null, redisConnected: false };
    }

    if (redisUrl) {
      const client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              console.warn('[REDIS] Max retries reached, stopping reconnection attempts.');
              return new Error('Too many retries to connect to Redis.');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      client.on('connect', () => {
        console.log('[REDIS] Successfully connected to Redis.');
        redisConnected = true;
      });

      client.on('error', (err) => {
        console.error('[REDIS] Connection error:', err.message);
        redisConnected = false; // Mark as not connected on error
        // Do not crash the app, allow it to run without Redis if necessary
      });
      
      client.on('reconnecting', () => {
        console.log('[REDIS] Reconnecting to Redis...');
      });

      client.on('end', () => {
        console.log('[REDIS] Connection to Redis has ended.');
        redisConnected = false;
      });
      
      try {
        await client.connect();
        redisClient = client;
        // global.redisClient = redisClient; // Avoid using global if possible, pass client or use a getter
      } catch (error) {
        console.error('[REDIS] Failed to connect during initialization:', error.message);
        redisConnected = false;
      }
    }
  } catch (error) {
    console.error('[REDIS] Error initializing Redis client:', error.message);
    redisConnected = false;
  }
  return { redisClient, redisConnected };
};

const getRedisClient = () => redisClient;
const isRedisConnected = () => redisConnected;

module.exports = {
  initializeRedis,
  getRedisClient,
  isRedisConnected
};
