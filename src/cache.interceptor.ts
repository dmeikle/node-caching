import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import {StandaloneCachingService} from "./standalone-caching.service";

export const CACHEABLE_KEY: string = 'isCacheable';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
      private readonly reflector: Reflector,
      private readonly cacheService: StandaloneCachingService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheMetadata: { ttlSeconds?: number } | undefined = this.reflector.get<{ ttlSeconds?: number }>(CACHEABLE_KEY, context.getHandler());

    if (cacheMetadata === undefined) {
      return next.handle();
    }

    const request: any = context.switchToHttp().getRequest();
    const cacheKey: string = this.generateCacheKey(request);

    try {
      const cachedResponse: string | null = await this.cacheService.get(cacheKey);
      if (cachedResponse) {
        return of(JSON.parse(cachedResponse)); // Return cached response if it exists
      }
    } catch (error) {
      // Handle cache retrieval error
      console.error('Cache retrieval error:', error);
    }

    // Handle the request and cache the response with a TTL
    return next.handle().pipe(
        tap((response: any) => {
          try {
            this.cacheService.set(cacheKey, JSON.stringify(response), cacheMetadata.ttlSeconds ?? 60); // Pass TTL to cache service
          } catch (error) {
            // Handle cache set error
            console.error('Cache set error:', error);
          }
        }),
    );
  }

  private generateCacheKey(request: any): string {
    return `${request.method}-${request.url}`;
  }
}