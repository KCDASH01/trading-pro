import { BrokerStatus, Market, Prisma, type Strategy } from '@prisma/client'
import { DEFAULT_SETTINGS, type Timeframe } from '../src/domain/types'
import type { ProductPreferences } from '../src/domain/product'
import { syntheticCandles } from '../src/data/synthetic'
import { generateSignals } from '../src/engine/strategy'
import { runBacktest } from '../src/engine/backtest'
import { AppError } from './app-error'
import { DatabaseService } from './database.service'
import { Logger } from '@nestjs/common'

interface SignalQuery { cursor?: string; limit?: number; strategy?: string; market?: string; symbol?: string; timeframe?: string; direction?: 'BUY' | 'SELL'; status?: string; recommended?: string; recent?: string }
type StrategyMetadata = { description?: string; instrument?: string; timeframe?: string; settings?: Partial<typeof DEFAULT_SETTINGS> }

export class ProductService {
  private readonly logger = new Logger(ProductService.name)
  constructor(private readonly database: DatabaseService) {}
  private metadata(strategy: Strategy) { return strategy.metadata as StrategyMetadata }
  async strategies(userId?: string) {
    const rows = await this.database.listStrategies(userId)
    return rows.map((strategy) => {
      const metadata = this.metadata(strategy)
      const enrollment = 'users' in strategy ? strategy.users?.[0] : undefined
      return { id: strategy.id, version: strategy.version, displayName: strategy.displayName, description: metadata.description ?? '', category: strategy.category, instrument: metadata.instrument ?? 'India indices', timeframe: metadata.timeframe ?? '15m', settings: metadata.settings ?? {}, applied: enrollment?.applied ?? false, favorite: enrollment?.favorite ?? false, notificationsEnabled: enrollment?.notificationsEnabled ?? true }
    })
  }
  async strategy(id: string) { const item = await this.database.getStrategy(id); if (!item) throw new AppError('STRATEGY_NOT_FOUND', 'Strategy not found.', 404); return item }
  async performance(id: string, symbol = 'NIFTY', timeframe: Timeframe = '15m') {
    const strategy = await this.strategy(id)
    const settings = { ...DEFAULT_SETTINGS, ...(this.metadata(strategy).settings ?? {}) }
    const candles = syntheticCandles(symbol, timeframe, 360)
    const signals = generateSignals(candles, symbol, 'NSE', timeframe, settings)
    const result = runBacktest(candles, signals, settings)
    const output = { strategyId: id, strategyVersion: strategy.version, symbol, timeframe, evaluationWindow: 'deterministic-demo-360-candles', sampleSize: result.totalTrades, totalTrades: result.totalTrades, wins: result.wins, losses: result.losses, winRate: result.winRate, profitFactor: Number.isFinite(result.profitFactor) ? result.profitFactor : 0, expectancy: result.expectancy, averageRR: settings.rewardRisk, maxDrawdown: result.maxDrawdown, returnPct: result.netProfit / 100000 * 100, todayReturn: result.trades.at(-1)?.returnPercent ?? 0, recentDailyResults: result.trades.slice(-7).map((trade) => ({ date: new Date(trade.exitTime * 1000).toISOString().slice(0, 10), returnPercent: trade.returnPercent })), fixture: true }
    await this.database.savePerformance({ strategyId: id, strategyVersion: strategy.version, symbol, timeframe, window: output.evaluationWindow, totalTrades: output.totalTrades, wins: output.wins, losses: output.losses, winRate: output.winRate, profitFactor: output.profitFactor, expectancy: output.expectancy, averageRR: output.averageRR, maxDrawdown: output.maxDrawdown, returnPct: output.returnPct, calculatedAt: new Date() })
    return output
  }
  async setMembership(userId: string, kind: 'subscription' | 'favorite', id: string, enabled: boolean) {
    const strategy = await this.strategy(id)
    await this.database.setUserStrategy(userId, strategy.id, strategy.version, kind === 'subscription' ? { applied: enabled } : { favorite: enabled })
    this.logger.log(`Strategy ${kind} changed: ${strategy.id}`)
    return { strategyId: id, [kind === 'subscription' ? 'applied' : 'favorite']: enabled }
  }
  async preferences(userId: string): Promise<ProductPreferences> {
    const row = await this.database.getPreferences(userId)
    if (!row) throw new AppError('PREFERENCES_NOT_FOUND', 'Preferences were not initialized.', 404)
    return { appearance: row.theme.toLowerCase() as ProductPreferences['appearance'], signalNotifications: row.signalNotifications, signalSound: row.signalSound, soundEffects: row.soundEffects, signalHistory: row.signalHistory, defaultMarket: row.defaultMarket.toLowerCase() as ProductPreferences['defaultMarket'], defaultTimeframe: row.defaultTimeframe, defaultRiskPercent: Number(row.riskPercentage), paperTrading: row.paperTradingEnabled }
  }
  async updatePreferences(userId: string, patch: Partial<ProductPreferences>) { await this.database.updatePreferences(userId, patch); return this.preferences(userId) }
  async refreshSignals(symbol = 'NIFTY', timeframe: Timeframe = '15m') {
    const strategies = await this.database.listStrategies()
    for (const [strategyIndex, strategy] of strategies.entries()) {
      const settings = { ...DEFAULT_SETTINGS, ...(this.metadata(strategy).settings ?? {}) }
      const candles = syntheticCandles(symbol, timeframe, 240)
      const generated = generateSignals(candles, symbol, 'NSE', timeframe, settings).slice(-2)
      for (const [index, signal] of generated.entries()) {
        await this.database.saveSignal({ id: `${strategy.id}:${signal.id}`, strategyId: strategy.id, strategyVersion: strategy.version, market: Market.INDIA, exchange: signal.exchange, symbol: signal.symbol, timeframe: signal.timeframe, direction: signal.direction, optionSide: signal.direction === 'BUY' ? 'CALL' : 'PUT', entry: signal.entry, stopLoss: signal.stopLoss, target: signal.target, riskReward: signal.riskReward, agreementScore: signal.agreementScore, calibratedProbability: null, rsi: signal.indicators.rsi, generatedAt: new Date(signal.timestamp * 1000), status: index === generated.length - 1 ? 'ACTIVE' : 'CLOSED', recommended: strategyIndex < 4, payload: { ...signal, strategyName: strategy.displayName } as unknown as Prisma.InputJsonValue })
      }
      if (generated.length) this.logger.log(`Persisted ${generated.length} signals for ${strategy.id}`)
    }
  }
  async signals(query: SignalQuery = {}) {
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)))
    const result = await this.database.listSignals({ cursor: query.cursor, limit, strategy: query.strategy, market: query.market ? Market[query.market.toUpperCase() as keyof typeof Market] : undefined, symbol: query.symbol, timeframe: query.timeframe, direction: query.direction, status: query.status?.toUpperCase(), recommended: query.recommended === undefined ? undefined : query.recommended === 'true', recent: query.recent === 'true' })
    return { items: result.items.map((row) => { const payload = row.payload as Record<string, unknown>; return { ...payload, id: row.id, source: 'backend-authoritative', strategyId: row.strategyId, strategyName: payload.strategyName ?? row.strategyId, strategyVersion: row.strategyVersion, market: row.market.toLowerCase(), symbol: row.symbol, exchange: row.exchange, timeframe: row.timeframe, direction: row.direction, optionSide: row.optionSide, entry: Number(row.entry), stopLoss: Number(row.stopLoss), target: Number(row.target), riskReward: Number(row.riskReward), agreementScore: row.agreementScore, calibratedProbability: row.calibratedProbability === null ? null : Number(row.calibratedProbability), generatedAt: row.generatedAt.toISOString(), timestamp: Math.floor(row.generatedAt.getTime() / 1000), status: row.status.toLowerCase(), recommended: row.recommended } }), nextCursor: result.nextCursor }
  }
  async brokerStatus(userId: string) { return this.database.getBrokerStatus(userId) }
  async setBroker(userId: string, brokerId: string, connected: boolean) { if (!['zerodha','upstox','dhan'].includes(brokerId)) throw new AppError('BROKER_UNSUPPORTED', 'Unsupported broker.'); const result = await this.database.setBroker(userId, brokerId, connected ? BrokerStatus.CONNECTED : BrokerStatus.NOT_CONNECTED); this.logger.log(`Broker status changed: ${brokerId}`); return result }
}
