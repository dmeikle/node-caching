import {CustomDecorator, SetMetadata} from '@nestjs/common';
import { CACHEABLE_KEY } from './cache.interceptor';

export const Cacheable: any = (ttlSeconds?: number): CustomDecorator<string> => {
  return SetMetadata(CACHEABLE_KEY, { ttlSeconds });
};
