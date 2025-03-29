import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

class RedisService {
  constructor() {
    this.client = null;
    this.pubClient = null;
    this.subClient = null;
    this.subscribers = {};
  }

  async connect() {
    // Redis configuration
    const redisConfig = {
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
      }
    };

    // Create main client
    this.client = createClient(redisConfig);
    
    // Create pub and sub clients
    this.pubClient = this.client.duplicate();
    this.subClient = this.client.duplicate();

    // Error handling
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
    this.subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

    // Connect all clients
    await Promise.all([
      this.client.connect(),
      this.pubClient.connect(),
      this.subClient.connect()
    ]);

    return this;
  }

  // Basic Redis operations
  async set(key, value, options = {}) {
    return this.client.set(key, JSON.stringify(value), options);
  }

  async get(key) {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async exists(key) {
    return this.client.exists(key);
  }

  async incr(key) {
    return this.client.incr(key);
  }

  // Pub/Sub methods
  publish(channel, message) {
    return this.client.publish(channel, JSON.stringify(message));
  }

  subscribe(channel, handler) {
    // If this is the first handler for this channel
    if (!this.subscribers[channel]) {
      this.subscribers[channel] = [];
      
      // Set up the Redis subscription only once
      this.subClient.subscribe(channel, (message) => {
        const parsedMessage = JSON.parse(message);
        
        // Call all registered handlers for this channel
        this.subscribers[channel].forEach(h => h(parsedMessage));
      });
    }

    // Add the new handler to the list
    this.subscribers[channel].push(handler);

    // Return an unsubscribe function
    return () => {
      this.subscribers[channel] = this.subscribers[channel].filter(h => h !== handler);
      
      // If no more handlers, unsubscribe from Redis
      if (this.subscribers[channel].length === 0) {
        this.subClient.unsubscribe(channel);
        delete this.subscribers[channel];
      }
    };
  }

  // Get Redis adapter for Socket.IO
  getAdapter() {
    return createAdapter(this.pubClient, this.subClient);
  }
}

const redisService = new RedisService();
export default redisService;