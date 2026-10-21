import { DatabaseService } from './database.service'
import { RedisService } from './redis.service'

export class HealthService {
  constructor(private readonly database: DatabaseService, private readonly redis: RedisService) {}
  async status() {
    const [postgres, redis] = await Promise.allSettled([this.database.health(), this.redis.health()])
    const services = { api: 'ok', postgres: postgres.status === 'fulfilled' ? 'ok' : 'unavailable', redis: redis.status === 'fulfilled' ? 'ok' : 'unavailable' }
    return { status: services.postgres === 'ok' && services.redis === 'ok' ? 'ok' : 'degraded', services, liveTrading: false, timestamp: Date.now() }
  }
}
