import {Injectable, Logger} from '@nestjs/common';
import { RedisClientType, createClient } from 'redis';
import { RedisClientNotObtainedError } from './exceptions/redis-client-not-obtained.error';

@Injectable()
export class StandaloneCachingService {
  private _client: RedisClientType | null = null;
  private readonly logger = new Logger(this.constructor.name);
  private readonly url: string = process.env.REDIS_SERVER ?? 'redis://localhost:6379';

  constructor() {
    this._client = createClient({ url: this.url });
    this._client.connect().catch(err => this.logger.error('Redis connection error', err));
  }

  private getClient(): RedisClientType {
    if (!this._client) {
      throw new RedisClientNotObtainedError();
    }
    return this._client;
  }

  async get(key: string): Promise<any> {
    const client = this.getClient();

    if (await client.exists(key)) {
      const cacheResult = await client.get(key);
      if (cacheResult) {
        return JSON.parse(cacheResult);
      }
    }

    return null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    const client = this.getClient();
    await client.setEx(key, ttl, JSON.stringify(value));
  }
}