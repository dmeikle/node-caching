export class RedisClientNotObtainedError extends Error {
  constructor() {
    super('Redis client not obtained');
  }
}