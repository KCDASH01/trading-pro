import { PrismaClient, Theme, Market, BrokerStatus, type Prisma } from '@prisma/client'
import type { ProductPreferences } from '../src/domain/product'
import type { OnModuleDestroy } from '@nestjs/common'

export class DatabaseService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() { await this.$disconnect() }
  async health() { await this.$queryRaw`SELECT 1`; return true }
  async findOrCreateUser(countryCode: string, mobile: string, mobileNormalized: string, now: Date) {
    return this.user.upsert({
      where: { mobileNormalized }, update: { mobileVerifiedAt: now },
      create: { countryCode, mobile, mobileNormalized, mobileVerifiedAt: now, preference: { create: {} }, paperAccount: { create: { balance: 100000, initialBalance: 100000, currency: 'INR' } } },
    })
  }
  async createSession(userId: string, tokenHash: string, expiresAt: Date, userAgent?: string) { return this.authSession.create({ data: { userId, tokenHash, expiresAt, userAgent: userAgent?.slice(0, 512) } }) }
  async findSession(tokenHash: string) { return this.authSession.findUnique({ where: { tokenHash }, include: { user: true } }) }
  async findSessionById(id: string) { return this.authSession.findUnique({ where: { id }, include: { user: true } }) }
  async touchSession(id: string, now: Date) { await this.authSession.update({ where: { id }, data: { lastSeenAt: now } }) }
  async revokeSession(id: string, now: Date) { await this.authSession.update({ where: { id }, data: { revokedAt: now } }) }
  async getPreferences(userId: string) { return this.userPreference.findUnique({ where: { userId } }) }
  async updatePreferences(userId: string, patch: Partial<ProductPreferences>) {
    const data: Prisma.UserPreferenceUpdateInput = {}
    if (patch.appearance) data.theme = Theme[patch.appearance.toUpperCase() as keyof typeof Theme]
    if (typeof patch.signalNotifications === 'boolean') data.signalNotifications = patch.signalNotifications
    if (typeof patch.signalSound === 'boolean') data.signalSound = patch.signalSound
    if (typeof patch.soundEffects === 'boolean') data.soundEffects = patch.soundEffects
    if (typeof patch.signalHistory === 'boolean') data.signalHistory = patch.signalHistory
    if (patch.defaultMarket) data.defaultMarket = Market[patch.defaultMarket.toUpperCase() as keyof typeof Market]
    if (patch.defaultTimeframe) data.defaultTimeframe = patch.defaultTimeframe.slice(0, 16)
    if (Number.isFinite(patch.defaultRiskPercent)) data.riskPercentage = Math.min(5, Math.max(0.1, patch.defaultRiskPercent!))
    if (typeof patch.paperTrading === 'boolean') data.paperTradingEnabled = patch.paperTrading
    return this.userPreference.update({ where: { userId }, data })
  }
  async listStrategies(userId?: string) {
    return this.strategy.findMany({ where: { enabled: true }, orderBy: { displayName: 'asc' }, include: { users: { where: { userId: userId ?? '__anonymous__' } } } })
  }
  async getStrategy(id: string, version?: string) { return this.strategy.findFirst({ where: { id, ...(version ? { version } : {}) }, orderBy: { version: 'desc' } }) }
  async setUserStrategy(userId: string, strategyId: string, strategyVersion: string, patch: { applied?: boolean; favorite?: boolean; notificationsEnabled?: boolean }) {
    return this.userStrategy.upsert({ where: { userId_strategyId_strategyVersion: { userId, strategyId, strategyVersion } }, update: patch, create: { userId, strategyId, strategyVersion, ...patch } })
  }
  async saveSignal(data: Prisma.SignalUncheckedCreateInput) { return this.signal.upsert({ where: { id: data.id }, update: {}, create: data }) }
  async savePerformance(data: Prisma.StrategyPerformanceUncheckedCreateInput) { return this.strategyPerformance.upsert({ where: { strategyId_strategyVersion_symbol_timeframe_window: { strategyId: data.strategyId, strategyVersion: data.strategyVersion, symbol: data.symbol, timeframe: data.timeframe, window: data.window } }, update: data, create: data }) }
  async listSignals(input: { cursor?: string; limit: number; strategy?: string; market?: Market; symbol?: string; timeframe?: string; direction?: 'BUY' | 'SELL'; status?: string; recommended?: boolean; recent?: boolean }) {
    const where: Prisma.SignalWhereInput = {
      ...(input.strategy ? { strategyId: input.strategy } : {}), ...(input.market ? { market: input.market } : {}), ...(input.symbol ? { symbol: input.symbol } : {}),
      ...(input.timeframe ? { timeframe: input.timeframe } : {}), ...(input.direction ? { direction: input.direction } : {}), ...(input.status ? { status: input.status as never } : {}),
      ...(typeof input.recommended === 'boolean' ? { recommended: input.recommended } : {}), ...(input.recent ? { generatedAt: { gte: new Date(Date.now() - 86_400_000) } } : {}),
    }
    const rows = await this.signal.findMany({ where, take: input.limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}), orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }] })
    const hasMore = rows.length > input.limit; if (hasMore) rows.pop()
    return { items: rows, nextCursor: hasMore ? rows.at(-1)?.id ?? null : null }
  }
  async getBrokerStatus(userId: string) { return this.brokerConnection.findMany({ where: { userId } }) }
  async setBroker(userId: string, broker: string, status: BrokerStatus) { return this.brokerConnection.upsert({ where: { userId_broker: { userId, broker } }, update: { status }, create: { userId, broker, status, metadata: {} } }) }
}
