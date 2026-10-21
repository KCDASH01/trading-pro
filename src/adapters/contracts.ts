import type { Candle, Timeframe } from '../domain/types'

export interface MarketDataProvider {
  readonly id: string
  readonly mode: 'demo' | 'live'
  getCandles(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]>
  getStatus(): 'connected' | 'reconnecting' | 'stale' | 'disconnected'
}

export interface BrokerOrder { symbol: string; side: 'BUY' | 'SELL'; quantity: number; orderType: 'MARKET' | 'LIMIT'; limitPrice?: number }
export interface BrokerAdapter {
  readonly id: 'upstox' | 'zerodha' | 'dhan'
  connect(): Promise<void>
  disconnect(): Promise<void>
  getPositions(): Promise<unknown[]>
  getOrders(): Promise<unknown[]>
  placeOrder(_order: BrokerOrder): Promise<never>
  modifyOrder(_id: string, _order: Partial<BrokerOrder>): Promise<never>
  cancelOrder(_id: string): Promise<never>
}

export abstract class DisabledBrokerAdapter implements BrokerAdapter {
  abstract readonly id: BrokerAdapter['id']
  async connect() { throw new Error('Live broker connectivity is disabled in this milestone.') }
  async disconnect() { return Promise.resolve() }
  async getPositions() { return Promise.resolve([]) }
  async getOrders() { return Promise.resolve([]) }
  async placeOrder(_order: BrokerOrder): Promise<never> { throw new Error('Real-money order placement is disabled.') }
  async modifyOrder(_id: string, _order: Partial<BrokerOrder>): Promise<never> { throw new Error('Real-money order modification is disabled.') }
  async cancelOrder(_id: string): Promise<never> { throw new Error('Real-money order cancellation is disabled.') }
}

export interface ExternalChartAdapter {
  readonly host: string
  supportsPublicOverlayApi(): boolean
  openCompanionDashboard(): Promise<void>
}
