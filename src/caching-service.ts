import { Injectable, Logger } from '@nestjs/common';
import { RedisClientType, createClient } from 'redis';

@Injectable()
export abstract class CachingService<T extends BaseDto> {
    protected _client: RedisClientType | null = null;
    protected logger = new Logger(this.constructor.name);
    protected url: string = process.env.REDIS_SERVER ?? 'redis://localhost:6379';

    constructor(
        protected ttl: number,
        private keyPrefix: string,
        url?: string,
    ) {
        if(url) {
            this.url = url;
        }
        this._client = createClient({ url: this.url });
        this._client.connect().catch(err => this.logger.error('Redis connection error', err));
    }

    protected getClient(): RedisClientType {
        if (!this._client) {
            throw new Error('Redis client not obtained');
        }
        return this._client;
    }

    protected async getFromCache(key: string, fetchData: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
        const client = this.getClient();
        const prefixedKey = `${this.keyPrefix}${key}`;

        if (await client.exists(prefixedKey)) {
            const cacheResult = await client.get(prefixedKey);
            if (cacheResult) {
                return JSON.parse(cacheResult) as T;
            }
        }

        const result = await fetchData(key, ...args);
        await client.setEx(prefixedKey, this.ttl, JSON.stringify(result));

        return result;
    }

    protected async getListFromCache(keys: string[], fetchAllData: (keys: string[]) => Promise<T[]>): Promise<T[]> {
        const client = this.getClient();
        const missing: string[] = [];
        const existing: T[] = [];

        const prefixedKeys = keys.map(key => `${this.keyPrefix}${key}`);
        const cacheResults = await Promise.all(prefixedKeys.map(key => client.get(key)));

        for (let i = 0; i < keys.length; i++) {
            const cacheResult = cacheResults[i];
            if (cacheResult) {
                existing.push(JSON.parse(cacheResult));
            } else {
                missing.push(keys[i]);
            }
        }

        if (missing.length > 0) {
            const results = await fetchAllData(missing);
            const setExPromises = results.map(item => {
                const keyAsString = String(item.id);
                const prefixedKey = `${this.keyPrefix}${keyAsString}`;
                existing.push(item);
                return client.setEx(prefixedKey, this.ttl, JSON.stringify(item));
            });
            await Promise.all(setExPromises);
        }

        return existing;
    }

    protected getKeyPrefix(): string {
        return this.keyPrefix;
    }
}

interface BaseDto {
    id: string;
}