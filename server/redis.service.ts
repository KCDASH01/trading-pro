import Redis from 'ioredis'
import type { OnModuleDestroy } from '@nestjs/common'

export class RedisService implements OnModuleDestroy {
  readonly client: Redis
  constructor(url: string) { this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2, enableReadyCheck: true }) }
  async connect() { if (this.client.status === 'wait') await this.client.connect() }
  async health() { await this.connect(); return await this.client.ping() === 'PONG' }
  async close() { if (this.client.status !== 'end') await this.client.quit() }
  async onModuleDestroy() { await this.close() }
}
