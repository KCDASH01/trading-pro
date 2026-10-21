import { Module } from '@nestjs/common'
import { MarketGateway } from './market.gateway'
import { TradingController } from './trading.controller'
import { TradingService } from './trading.service'
import { AuthController } from './auth.controller'
import { ProductController } from './product.controller'
import { AuthService } from './auth.service'
import { ProductService } from './product.service'
import { DatabaseService } from './database.service'
import { RedisService } from './redis.service'
import { RedisOtpStore } from './otp.store'
import { DevelopmentOtpProvider, ProductionSmsOtpProvider } from './otp.provider'
import { loadConfig, type AppConfig } from './config'
import { SessionAuthGuard } from './session-auth.guard'
import { HealthService } from './health.service'

export const APP_CONFIG = 'APP_CONFIG'
@Module({
  controllers: [TradingController, AuthController, ProductController],
  providers: [
    TradingService,
    MarketGateway,
    SessionAuthGuard,
    { provide: APP_CONFIG, useFactory: loadConfig },
    { provide: DatabaseService, useFactory: (config: AppConfig) => new DatabaseService({ datasourceUrl: config.databaseUrl }), inject: [APP_CONFIG] },
    { provide: RedisService, useFactory: (config: AppConfig) => new RedisService(config.redisUrl), inject: [APP_CONFIG] },
    { provide: RedisOtpStore, useFactory: (redis: RedisService, config: AppConfig) => new RedisOtpStore(redis, config.otpHmacSecret), inject: [RedisService, APP_CONFIG] },
    { provide: AuthService, useFactory: (database: DatabaseService, otpStore: RedisOtpStore, config: AppConfig) => new AuthService(database, otpStore, config.devMockOtpEnabled ? new DevelopmentOtpProvider() : new ProductionSmsOtpProvider(), config), inject: [DatabaseService, RedisOtpStore, APP_CONFIG] },
    { provide: ProductService, useFactory: (database: DatabaseService) => new ProductService(database), inject: [DatabaseService] },
    { provide: HealthService, useFactory: (database: DatabaseService, redis: RedisService) => new HealthService(database, redis), inject: [DatabaseService, RedisService] },
  ],
})
export class AppModule {}
