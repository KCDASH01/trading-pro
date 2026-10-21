import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'
import type { StrategySettings } from '../src/domain/types'
import { TradingService } from './trading.service'
import { HealthService } from './health.service'

function parseSettings(value?: string): Partial<StrategySettings> | undefined {
  if (!value) return undefined
  try { return JSON.parse(value) as Partial<StrategySettings> } catch { return undefined }
}

@Controller('api/v1')
export class TradingController {
  constructor(@Inject(TradingService) private readonly trading: TradingService, @Inject(HealthService) private readonly healthService: HealthService) {}

  @Get('health')
  health() { return this.healthService.status() }

  @Get('ready')
  readiness() { return this.healthService.status() }

  @Get('snapshot')
  snapshot(@Query('symbol') symbol?: string, @Query('timeframe') timeframe?: string, @Query('settings') settings?: string) {
    return this.trading.snapshot(symbol, timeframe, parseSettings(settings))
  }

  @Get('strategy/statistics')
  statistics(@Query('symbol') symbol?: string, @Query('timeframe') timeframe?: string) {
    const snapshot = this.trading.snapshot(symbol, timeframe)
    return { source: snapshot.source, strategyVersion: snapshot.strategyVersion, generatedAt: snapshot.generatedAt, statistics: snapshot.backtest }
  }

  @Post('backtests')
  backtest(@Body() body: { symbol?: string; timeframe?: string; settings?: Partial<StrategySettings> }) {
    const snapshot = this.trading.snapshot(body.symbol, body.timeframe, body.settings)
    return { source: snapshot.source, generatedAt: snapshot.generatedAt, result: snapshot.backtest }
  }
}
