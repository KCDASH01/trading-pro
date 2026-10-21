import 'reflect-metadata'
import helmet from 'helmet'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule, APP_CONFIG } from './app.module'
import { MarketGateway } from './market.gateway'
import type { AppConfig } from './config'
import { ApiExceptionFilter } from './api-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const config = app.get<AppConfig>(APP_CONFIG)
  const logger = new Logger('Bootstrap')
  app.use(helmet({ contentSecurityPolicy: false }))
  app.useGlobalFilters(new ApiExceptionFilter())
  app.enableCors({
    credentials: false,
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      const allowed = !origin || config.allowedOrigins.includes(origin) || config.nodeEnv !== 'production' && origin.startsWith('chrome-extension://')
      callback(allowed ? null : new Error('Origin not allowed.'), allowed)
    },
  })
  app.enableShutdownHooks()
  await app.listen(config.port, '127.0.0.1')
  const gateway = app.get(MarketGateway)
  setInterval(() => { void gateway.broadcastSnapshots() }, 15_000).unref()
  logger.log(`Authoritative API listening on http://127.0.0.1:${config.port}`)
}

void bootstrap()
